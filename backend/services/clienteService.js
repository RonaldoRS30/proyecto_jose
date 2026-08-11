const { Op } = require('sequelize');
const {
  sequelize,
  Cliente,
  CodigoAcceso,
  Electrodomestico,
  Calculo,
  DetalleCalculo,
  Reporte,
  HistorialAcceso,
} = require('../models');
const { generarCodigoInterno } = require('../helpers/codigoHelper');
const { normalizeClientePayload, inferTipoCliente } = require('../helpers/clienteTipoHelper');
const { verificarCodigoAccesoCliente } = require('./codigoLoginService');
const { roundNum } = require('../utils/format');
const {
  enrichCalculos,
  averageFacturaFromCalculos,
  buildFacturaPorMes,
  averageModulosFromCalculos,
} = require('./facturaHelper');
const { getConfigMap } = require('./configuracionService');
const { AppError } = require('../utils/errorHandler');
const recomendacionService = require('./recomendacionService');
const { getEquiposExcedenPotenciaReferencia } = require('../helpers/potenciaReferenciaHelper');

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

const buildAlertasExcedentesPotencia = async (ultimosMap) => {
  const calculos = [...ultimosMap.values()];
  if (!calculos.length) return [];

  const calculoIds = calculos.map((c) => c.id);
  const detallesAll = await DetalleCalculo.findAll({
    where: { calculo_id: calculoIds },
  });

  const detallesByCalculo = new Map();
  const electroIds = new Set();
  for (const detalle of detallesAll) {
    if (!detallesByCalculo.has(detalle.calculo_id)) {
      detallesByCalculo.set(detalle.calculo_id, []);
    }
    detallesByCalculo.get(detalle.calculo_id).push(detalle);
    if (detalle.electrodomestico_id) electroIds.add(detalle.electrodomestico_id);
  }

  let electroMap = {};
  if (electroIds.size > 0) {
    const electros = await Electrodomestico.findAll({
      where: { id: [...electroIds] },
      attributes: ['id', 'recomendacion_id'],
    });
    electroMap = Object.fromEntries(electros.map((e) => [e.id, e.recomendacion_id]));
  }

  const catalogoReferencia = await recomendacionService.listar({ soloActivas: true });
  const alertas = [];

  for (const calc of calculos) {
    const detalles = detallesByCalculo.get(calc.id) || [];
    const items = getEquiposExcedenPotenciaReferencia(detalles, catalogoReferencia, electroMap);
    if (!items.length) continue;

    const totalExcesoW = items.reduce((s, i) => s + (i.exceso_w || 0), 0);
    alertas.push({
      clienteId: calc.cliente_id,
      clienteNombre: calc.cliente
        ? `${calc.cliente.nombre} ${calc.cliente.apellido || ''}`.trim()
        : `Cliente #${calc.cliente_id}`,
      clienteDocumento: calc.cliente?.documento || null,
      clienteEmail: calc.cliente?.email || null,
      calculoId: calc.id,
      fecha: calc.created_at,
      consumoMesTotal: roundNum(parseFloat(calc.consumo_mes_total) || 0),
      gastoMensualTotal: roundNum(parseFloat(calc.gasto_mensual_total) || 0),
      totalEquipos: items.length,
      totalExcesoW: roundNum(totalExcesoW),
      items,
    });
  }

  return alertas.sort((a, b) => b.totalExcesoW - a.totalExcesoW);
};

const buildCalculosPorCliente = async (calculoWhere) => {
  const rows = await Calculo.findAll({
    where: calculoWhere,
    attributes: [
      'cliente_id',
      [sequelize.fn('COUNT', sequelize.col('Calculo.id')), 'total_calculos'],
      [sequelize.fn('SUM', sequelize.col('consumo_mes_total')), 'consumo_total'],
    ],
    group: ['cliente_id'],
    order: [[sequelize.literal('total_calculos'), 'DESC']],
    raw: true,
  });

  if (!rows.length) return [];

  const clienteIds = rows.map((r) => r.cliente_id).filter(Boolean);
  const clientes = await Cliente.findAll({
    where: { id: clienteIds },
    attributes: ['id', 'nombre', 'apellido'],
  });
  const clienteMap = Object.fromEntries(clientes.map((c) => [c.id, c]));

  const mapped = rows.map((r) => ({
    clienteId: r.cliente_id,
    nombre: clienteMap[r.cliente_id]
      ? `${clienteMap[r.cliente_id].nombre} ${clienteMap[r.cliente_id].apellido || ''}`.trim()
      : `Cliente #${r.cliente_id}`,
    totalCalculos: parseInt(r.total_calculos, 10) || 0,
    consumoTotal: roundNum(parseFloat(r.consumo_total) || 0),
  }));

  const top = mapped.slice(0, 7);
  const rest = mapped.slice(7);
  if (!rest.length) return top;

  const otrosCalculos = rest.reduce((s, r) => s + r.totalCalculos, 0);
  const otrosConsumo = rest.reduce((s, r) => s + r.consumoTotal, 0);
  if (otrosCalculos <= 0) return top;

  return [
    ...top,
    {
      clienteId: null,
      nombre: 'Otros clientes',
      totalCalculos: otrosCalculos,
      consumoTotal: roundNum(otrosConsumo),
    },
  ];
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

const PERFIL_CAMPOS = [
  'nombre', 'apellido', 'email', 'telefono', 'direccion',
  'empresa_distribuidora', 'tarifa', 'medidor', 'potencia_contratada',
  'tarifa_kwh', 'alumbrado_publico',
];

const actualizarPerfilCliente = async (id, data) => {
  const cliente = await obtenerCliente(id);
  const existente = cliente.toJSON();
  const tipo = inferTipoCliente(existente);
  const updateFields = {};

  for (const key of PERFIL_CAMPOS) {
    if (data[key] !== undefined) updateFields[key] = data[key];
  }

  if (updateFields.nombre !== undefined) {
    const nombre = String(updateFields.nombre ?? '').trim();
    if (!nombre) {
      throw new AppError(
        tipo === 'empresa' ? 'La razón social es obligatoria' : 'El nombre es obligatorio',
        400,
      );
    }
    updateFields.nombre = nombre;
  }

  if (tipo === 'empresa') {
    updateFields.apellido = null;
  } else if (updateFields.apellido !== undefined) {
    const apellido = String(updateFields.apellido ?? '').trim();
    if (!apellido) throw new AppError('El apellido es obligatorio', 400);
    updateFields.apellido = apellido;
  }

  if (updateFields.telefono !== undefined) {
    const tel = String(updateFields.telefono ?? '').replace(/\D/g, '');
    if (tel && (tel.length < 7 || tel.length > 9)) {
      throw new AppError('El teléfono debe tener entre 7 y 9 dígitos', 400);
    }
    updateFields.telefono = tel;
  }

  if (updateFields.email !== undefined) {
    updateFields.email = updateFields.email == null || updateFields.email === ''
      ? null
      : String(updateFields.email).trim();
  }

  if (updateFields.direccion !== undefined) {
    updateFields.direccion = updateFields.direccion == null || updateFields.direccion === ''
      ? null
      : String(updateFields.direccion).trim();
  }

  if (updateFields.potencia_contratada !== undefined) {
    updateFields.potencia_contratada = updateFields.potencia_contratada == null
      || updateFields.potencia_contratada === ''
      ? null
      : String(updateFields.potencia_contratada).trim();
  }

  if (updateFields.tarifa_kwh !== undefined) {
    if (updateFields.tarifa_kwh === null || updateFields.tarifa_kwh === '') {
      updateFields.tarifa_kwh = null;
    } else {
      const tarifa = parseFloat(updateFields.tarifa_kwh);
      if (Number.isNaN(tarifa) || tarifa < 0) {
        throw new AppError('La tarifa eléctrica debe ser un número válido mayor o igual a 0', 400);
      }
      updateFields.tarifa_kwh = tarifa;
    }
  }

  if (updateFields.alumbrado_publico !== undefined) {
    if (updateFields.alumbrado_publico === null || updateFields.alumbrado_publico === '') {
      updateFields.alumbrado_publico = null;
    } else {
      const alumbrado = parseFloat(updateFields.alumbrado_publico);
      if (Number.isNaN(alumbrado) || alumbrado < 0) {
        throw new AppError('El alumbrado público debe ser un número válido mayor o igual a 0', 400);
      }
      updateFields.alumbrado_publico = alumbrado;
    }
  }

  if (data.documento !== undefined) {
    const nuevoDoc = String(data.documento ?? '').replace(/\D/g, '');
    const docActual = String(existente.documento ?? '').replace(/\D/g, '');

    if (nuevoDoc !== docActual) {
      const codigo1 = data.codigo_acceso;
      const codigo2 = data.codigo_acceso_confirmacion;

      if (!codigo1 || !codigo2) {
        throw new AppError(
          'Debe ingresar su código de acceso dos veces para cambiar el documento',
          400,
        );
      }
      if (String(codigo1).trim().toUpperCase() !== String(codigo2).trim().toUpperCase()) {
        throw new AppError('Los códigos de acceso no coinciden', 400);
      }
      await verificarCodigoAccesoCliente(id, codigo1);

      if (tipo === 'empresa' && !/^\d{11}$/.test(nuevoDoc)) {
        throw new AppError('El RUC debe tener exactamente 11 dígitos numéricos', 400);
      }
      if (tipo === 'natural' && !/^\d{8}$/.test(nuevoDoc)) {
        throw new AppError('El DNI debe tener exactamente 8 dígitos numéricos', 400);
      }
      updateFields.documento = nuevoDoc;
    }
  }

  if (Object.keys(updateFields).length === 0) {
    return cliente;
  }

  await cliente.update(updateFields);
  return obtenerCliente(id);
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
  const [alertasExcedentesPotencia, calculosPorCliente, calculosParaFactura, configMap] = await Promise.all([
    buildAlertasExcedentesPotencia(ultimosPorCliente),
    buildCalculosPorCliente(calculoWhere),
    Calculo.findAll({
      where: calculoWhere,
      attributes: ['id', 'consumo_mes_total', 'precio_kwh', 'resumen_json', 'created_at', 'cliente_id'],
    }),
    getConfigMap(),
  ]);

  const enrichedParaFactura = enrichCalculos(calculosParaFactura, configMap);
  const facturaPromedio = averageFacturaFromCalculos(enrichedParaFactura);
  const facturaPorMes = buildFacturaPorMes(enrichedParaFactura);
  const modulosPromedio = averageModulosFromCalculos(enrichedParaFactura);

  return {
    totalClientes,
    clientesActivos,
    clientesInactivos: totalClientes - clientesActivos,
    totalCalculos,
    totalReportes,
    consumoPromedio: roundNum(consumoPromedio),
    actividadReciente: enrichCalculos(actividadReciente),
    alertasExcedentesPotencia,
    calculosPorCliente,
    consumoPorMes,
    facturaPromedio,
    facturaPorMes,
    modulosPromedio,
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
  actualizarPerfilCliente,
  eliminarCliente,
  toggleCliente,
  getEstadisticasAdmin,
  obtenerClienteDetalleAdmin,
  getResumenExportClientes,
};
