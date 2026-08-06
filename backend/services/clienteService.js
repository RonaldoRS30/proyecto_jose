const { Op } = require('sequelize');
const {
  sequelize,
  Cliente,
  CodigoAcceso,
  Electrodomestico,
  Calculo,
  Reporte,
  HistorialAcceso,
} = require('../models');
const { generarCodigoInterno } = require('../helpers/codigoHelper');
const { normalizeClientePayload, inferTipoCliente } = require('../helpers/clienteTipoHelper');
const { roundNum } = require('../utils/format');
const { enrichCalculos } = require('./facturaHelper');
const { getConfigMap } = require('./configuracionService');
const { AppError } = require('../utils/errorHandler');

const hasAccesoHabilitado = (cliente) => cliente.codigos?.some((c) => c.activo);

const getUltimosCalculosPorCliente = async () => {
  const calculos = await Calculo.findAll({
    order: [['created_at', 'DESC']],
    include: [
      { model: Cliente, as: 'cliente', attributes: ['id', 'nombre', 'apellido', 'documento', 'email'] },
    ],
  });

  const map = new Map();
  for (const calc of calculos) {
    if (!map.has(calc.cliente_id)) map.set(calc.cliente_id, calc);
  }
  return map;
};

const buildAlertasConsumo = (ultimosMap, consumoPromedio, umbralPct = 30) => {
  if (!consumoPromedio || consumoPromedio <= 0) return [];

  const multiplicador = 1 + (umbralPct / 100);
  const umbral = consumoPromedio * multiplicador;
  const alertas = [];

  for (const calc of ultimosMap.values()) {
    const consumo = parseFloat(calc.consumo_mes_total);
    if (consumo <= umbral) continue;

    const pct = Math.round(((consumo / consumoPromedio) - 1) * 100);
    alertas.push({
      clienteId: calc.cliente_id,
      clienteNombre: calc.cliente
        ? `${calc.cliente.nombre} ${calc.cliente.apellido || ''}`.trim()
        : `Cliente #${calc.cliente_id}`,
      consumoMes: roundNum(consumo),
      consumoPromedio: roundNum(consumoPromedio),
      porcentajeSobrePromedio: pct,
      calculoId: calc.id,
      fecha: calc.created_at,
    });
  }

  return alertas.sort((a, b) => b.consumoMes - a.consumoMes).slice(0, 10);
};

const listarClientes = async ({ search, activo, acceso, page = 1, limit = 10 }) => {
  const where = {};
  if (activo !== undefined) where.activo = activo === 'true' || activo === true;
  if (search) {
    where[Op.or] = [
      { nombre: { [Op.like]: `%${search}%` } },
      { apellido: { [Op.like]: `%${search}%` } },
      { documento: { [Op.like]: `%${search}%` } },
      { email: { [Op.like]: `%${search}%` } },
      { codigo_interno: { [Op.like]: `%${search}%` } },
    ];
  }

  const include = [{ model: CodigoAcceso, as: 'codigos', required: false }];
  const order = [['created_at', 'DESC']];
  const p = parseInt(page, 10) || 1;
  const l = parseInt(limit, 10) || 10;
  const offset = (p - 1) * l;

  if (acceso === 'true' || acceso === 'false') {
    const rows = await Cliente.findAll({ where, include, order });
    const filtered = rows.filter((c) => (
      acceso === 'true' ? hasAccesoHabilitado(c) : !hasAccesoHabilitado(c)
    ));
    return {
      total: filtered.length,
      page: p,
      limit: l,
      data: filtered.slice(offset, offset + l),
    };
  }

  const { count, rows } = await Cliente.findAndCountAll({
    where,
    include,
    order,
    limit: l,
    offset,
    distinct: true,
  });

  return { total: count, page: p, limit: l, data: rows };
};

const crearCliente = async (data) => {
  const payload = normalizeClientePayload(data);
  const codigo_interno = payload.codigo_interno || generarCodigoInterno();
  return Cliente.create({ ...payload, codigo_interno });
};

const obtenerCliente = async (id) => {
  const cliente = await Cliente.findByPk(id, {
    include: [{ model: CodigoAcceso, as: 'codigos', required: false }],
  });
  if (!cliente) throw new AppError('Cliente no encontrado', 404);
  return cliente;
};

const actualizarCliente = async (id, data) => {
  const cliente = await obtenerCliente(id);
  const existente = cliente.toJSON();
  const tipoOriginal = inferTipoCliente(existente);

  if (data.tipo_cliente && data.tipo_cliente !== tipoOriginal) {
    throw new AppError('No se puede cambiar el tipo de cliente al editar', 400);
  }

  const payload = normalizeClientePayload({
    ...existente,
    ...data,
    tipo_cliente: tipoOriginal,
  });
  await cliente.update(payload);
  return cliente;
};

const eliminarCliente = async (id) => {
  const cliente = await obtenerCliente(id);
  await cliente.destroy();
  return { message: 'Cliente eliminado' };
};

const toggleCliente = async (id) => {
  const cliente = await obtenerCliente(id);
  await cliente.update({ activo: !cliente.activo });
  return cliente;
};

const getEstadisticasAdmin = async ({ fechaDesde, fechaHasta } = {}) => {
  const config = await getConfigMap();
  const umbralPct = config.umbralAlertaConsumoPct || 30;

  // Build date filter for calculos
  const calculoWhere = {};
  if (fechaDesde || fechaHasta) {
    calculoWhere.created_at = {};
    if (fechaDesde) calculoWhere.created_at[Op.gte] = new Date(fechaDesde);
    if (fechaHasta) {
      const hasta = new Date(fechaHasta);
      hasta.setHours(23, 59, 59, 999);
      calculoWhere.created_at[Op.lte] = hasta;
    }
  }

  const [totalClientes, clientesActivos, totalCalculos, totalReportes] = await Promise.all([
    Cliente.count(),
    Cliente.count({ where: { activo: true } }),
    Calculo.count({ where: calculoWhere }),
    Reporte.count(),
  ]);

  const calculos = await Calculo.findAll({
    where: calculoWhere,
    attributes: ['consumo_mes_total', 'gasto_mensual_total'],
  });

  const consumoPromedio =
    calculos.length > 0
      ? calculos.reduce((s, c) => s + parseFloat(c.consumo_mes_total), 0) / calculos.length
      : 0;

  const actividadReciente = await Calculo.findAll({
    where: calculoWhere,
    limit: 8,
    order: [['created_at', 'DESC']],
    include: [
      { model: Cliente, as: 'cliente', attributes: ['id', 'nombre', 'apellido'] },
    ],
  });

  // Monthly trend data (last 6 months or within filter range)
  const consumoPorMesRaw = await Calculo.findAll({
    where: calculoWhere,
    attributes: [
      [sequelize.fn('DATE_FORMAT', sequelize.col('created_at'), '%Y-%m'), 'mes'],
      [sequelize.fn('AVG', sequelize.col('consumo_mes_total')), 'consumo_promedio'],
      [sequelize.fn('AVG', sequelize.col('gasto_mensual_total')), 'gasto_promedio'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'total_calculos'],
    ],
    group: [sequelize.fn('DATE_FORMAT', sequelize.col('created_at'), '%Y-%m')],
    order: [[sequelize.fn('DATE_FORMAT', sequelize.col('created_at'), '%Y-%m'), 'ASC']],
    raw: true,
  });

  const consumoPorMes = consumoPorMesRaw.map((row) => ({
    mes: row.mes,
    consumoPromedio: roundNum(parseFloat(row.consumo_promedio) || 0),
    gastoPromedio: roundNum(parseFloat(row.gasto_promedio) || 0),
    totalCalculos: parseInt(row.total_calculos, 10),
  }));

  const ultimosPorCliente = await getUltimosCalculosPorCliente();
  const alertasConsumo = buildAlertasConsumo(ultimosPorCliente, consumoPromedio, umbralPct);

  return {
    totalClientes,
    clientesActivos,
    clientesInactivos: totalClientes - clientesActivos,
    totalCalculos,
    totalReportes,
    consumoPromedio: roundNum(consumoPromedio),
    umbralAlertaConsumo: roundNum(consumoPromedio * (1 + umbralPct / 100)),
    umbralAlertaConsumoPct: umbralPct,
    actividadReciente: enrichCalculos(actividadReciente),
    alertasConsumo,
    consumoPorMes,
    filtrosAplicados: { fechaDesde: fechaDesde || null, fechaHasta: fechaHasta || null },
  };
};

const getResumenExportClientes = async () => {
  const config = await getConfigMap();
  const umbralPct = config.umbralAlertaConsumoPct || 30;

  const [clientes, ultimosPorCliente, conteosRaw, equiposRaw, calculosAll] = await Promise.all([
    Cliente.findAll({
      include: [{ model: CodigoAcceso, as: 'codigos', required: false }],
      order: [['nombre', 'ASC'], ['apellido', 'ASC']],
    }),
    getUltimosCalculosPorCliente(),
    Calculo.findAll({
      attributes: ['cliente_id', [sequelize.fn('COUNT', sequelize.col('id')), 'total']],
      group: ['cliente_id'],
      raw: true,
    }),
    Electrodomestico.findAll({
      attributes: ['cliente_id', [sequelize.fn('COUNT', sequelize.col('id')), 'total']],
      where: { activo: true },
      group: ['cliente_id'],
      raw: true,
    }),
    Calculo.findAll({ attributes: ['consumo_mes_total'] }),
  ]);

  const conteos = new Map(
    conteosRaw.map((row) => [row.cliente_id, parseInt(row.total, 10)]),
  );
  const equipos = new Map(
    equiposRaw.map((row) => [row.cliente_id, parseInt(row.total, 10)]),
  );
  const consumoPromedio = calculosAll.length
    ? calculosAll.reduce((s, c) => s + parseFloat(c.consumo_mes_total), 0) / calculosAll.length
    : 0;
  const umbral = consumoPromedio * (1 + umbralPct / 100);

  return clientes.map((c) => {
    const ultimo = ultimosPorCliente.get(c.id);
    const codigosActivos = c.codigos?.filter((cod) => cod.activo).length || 0;
    const consumoMes = ultimo ? parseFloat(ultimo.consumo_mes_total) : 0;
    return {
      codigo_interno: c.codigo_interno,
      nombre: c.nombre,
      apellido: c.apellido || '',
      documento: c.documento || '',
      email: c.email || '',
      telefono: c.telefono || '',
      direccion: c.direccion || '',
      empresa_distribuidora: c.empresa_distribuidora || '',
      tarifa: c.tarifa || '',
      potencia_contratada: c.potencia_contratada || '',
      medidor: c.medidor || '',
      acceso: codigosActivos > 0 ? 'Habilitado' : 'Deshabilitado',
      codigos_activos: codigosActivos,
      total_equipos: equipos.get(c.id) || 0,
      total_calculos: conteos.get(c.id) || 0,
      ultimo_calculo: ultimo?.created_at || null,
      consumo_dia_kwh: ultimo ? roundNum(ultimo.consumo_dia_total) : null,
      consumo_mes_kwh: ultimo ? roundNum(ultimo.consumo_mes_total) : null,
      consumo_anio_kwh: ultimo ? roundNum(ultimo.consumo_anio_total) : null,
      gasto_mes: ultimo ? roundNum(ultimo.gasto_mensual_total) : null,
      factura_estimada: ultimo ? roundNum(ultimo.factura_total_mes) : null,
      alerta_consumo: ultimo && consumoPromedio > 0 && consumoMes > umbral ? 'Sí' : 'No',
    };
  });
};

const obtenerClienteDetalleAdmin = async (id) => {
  const cliente = await Cliente.findByPk(id, {
    include: [{ model: CodigoAcceso, as: 'codigos' }],
  });
  if (!cliente) throw new AppError('Cliente no encontrado', 404);

  const [electrodomesticos, calculos, accesos, totalReportes] = await Promise.all([
    Electrodomestico.findAll({
      where: { cliente_id: id, activo: true },
      order: [['modulo', 'ASC'], ['nombre', 'ASC']],
    }),
    Calculo.findAll({
      where: { cliente_id: id },
      order: [['created_at', 'DESC']],
      limit: 20,
    }),
    HistorialAcceso.findAll({
      where: { cliente_id: id, exitoso: true },
      order: [['created_at', 'DESC']],
      limit: 10,
    }),
    Reporte.count({ where: { cliente_id: id } }),
  ]);

  const equiposPorModulo = {
    aparato: electrodomesticos.filter((e) => e.modulo === 'aparato').length,
    fantasma: electrodomesticos.filter((e) => e.modulo === 'fantasma').length,
    iluminacion: electrodomesticos.filter((e) => e.modulo === 'iluminacion').length,
  };

  return {
    cliente,
    resumen: {
      totalEquipos: electrodomesticos.length,
      equiposPorModulo,
      totalCalculos: calculos.length,
      totalReportes,
      codigosActivos: cliente.codigos?.filter((c) => c.activo).length || 0,
      ultimoCalculo: calculos[0]?.created_at || null,
    },
    electrodomesticos,
    calculos: enrichCalculos(calculos),
    accesos,
  };
};

module.exports = {
  listarClientes,
  crearCliente,
  obtenerCliente,
  actualizarCliente,
  eliminarCliente,
  toggleCliente,
  getEstadisticasAdmin,
  obtenerClienteDetalleAdmin,
  getResumenExportClientes,
};
