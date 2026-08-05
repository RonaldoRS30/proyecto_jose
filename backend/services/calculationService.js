const { Op } = require('sequelize');
const { Calculo, DetalleCalculo, Cliente } = require('../models');
const { calcularCompleto } = require('./calculationEngine');
const { getConfigMap } = require('./configuracionService');
const { listarPorCliente, toCalcInput } = require('./electrodomesticoService');
const { buildFacturaParaCalculo, enrichCalculo, enrichCalculos } = require('./facturaHelper');
const { AppError } = require('../utils/errorHandler');

const ejecutarCalculo = async (clienteId) => {
  const cliente = await Cliente.findByPk(clienteId);
  if (!cliente) throw new AppError('Cliente no encontrado', 404);

  const config = await getConfigMap();
  if (cliente.tarifa_kwh) {
    config.precioKwh = parseFloat(cliente.tarifa_kwh);
  }
  
  const electrodomesticos = await listarPorCliente(clienteId);

  if (electrodomesticos.length === 0) {
    throw new AppError('Registre al menos un electrodoméstico antes de ejecutar el cálculo.', 400);
  }

  const aparatos = toCalcInput(electrodomesticos.filter((e) => e.modulo === 'aparato'));
  const fantasma = toCalcInput(electrodomesticos.filter((e) => e.modulo === 'fantasma'));
  const iluminacion = toCalcInput(electrodomesticos.filter((e) => e.modulo === 'iluminacion'));

  const resultado = calcularCompleto({ aparatos, fantasma, iluminacion }, config);

  const calculo = await Calculo.create({
    cliente_id: clienteId,
    precio_kwh: config.precioKwh,
    consumo_dia_total: resultado.resumenGeneral.consumoDia,
    consumo_mes_total: resultado.resumenGeneral.consumoMes,
    consumo_anio_total: resultado.resumenGeneral.consumoAnio,
    gasto_diario_total: resultado.resumenGeneral.gastoDiario,
    gasto_mensual_total: resultado.resumenGeneral.gastoMensual,
    gasto_anual_total: resultado.resumenGeneral.gastoAnual,
    demanda_total: resultado.resumenGeneral.demandaTotal,
    factura_total_mes: resultado.factura.totalMes,
    resumen_json: resultado,
  });

  const facturaFinal = buildFacturaParaCalculo(calculo);
  await calculo.update({
    factura_total_mes: facturaFinal.totalMes,
    resumen_json: { ...resultado, factura: facturaFinal },
  });

  const detalles = resultado.dispositivos.map((d) => ({
    calculo_id: calculo.id,
    electrodomestico_id: d.id || null,
    recomendacion_id: d.recomendacion_id || null,
    nombre: d.nombre,
    modulo: d.modulo,
    categoria: d.categoria,
    cantidad: d.cantidad,
    potencia_w: d.potenciaW ?? d.potencia_w,
    horas_uso_dia: d.horasDiarias ?? d.horas_uso_dia,
    consumo_dia: d.consumoDia,
    consumo_mes: d.consumoMes,
    consumo_anio: d.consumoAnio,
    gasto_diario: d.gastoDiario,
    gasto_mensual: d.gastoMensual,
    gasto_anual: d.gastoAnual,
  }));

  await DetalleCalculo.bulkCreate(detalles);

  return {
    calculo,
    resultado,
  };
};

const previewCalculo = async (clienteId) => {
  const config = await getConfigMap();
  const cliente = await Cliente.findByPk(clienteId);
  if (cliente && cliente.tarifa_kwh) {
    config.precioKwh = parseFloat(cliente.tarifa_kwh);
  }

  const electrodomesticos = await listarPorCliente(clienteId);

  const aparatos = toCalcInput(electrodomesticos.filter((e) => e.modulo === 'aparato'));
  const fantasma = toCalcInput(electrodomesticos.filter((e) => e.modulo === 'fantasma'));
  const iluminacion = toCalcInput(electrodomesticos.filter((e) => e.modulo === 'iluminacion'));

  return calcularCompleto({ aparatos, fantasma, iluminacion }, config);
};

const listarCalculos = async (filters = {}) => {
  const {
    clienteId = null,
    search = null,
    fechaDesde = null,
    fechaHasta = null,
    page = null,
    limit = null,
  } = typeof filters === 'number' || filters === 'string'
    ? { clienteId: filters }
    : filters;

  const where = {};
  if (clienteId) where.cliente_id = clienteId;

  if (fechaDesde || fechaHasta) {
    where.created_at = {};
    if (fechaDesde) where.created_at[Op.gte] = new Date(`${fechaDesde}T00:00:00`);
    if (fechaHasta) where.created_at[Op.lte] = new Date(`${fechaHasta}T23:59:59`);
  }

  const clienteInclude = {
    model: Cliente,
    as: 'cliente',
    attributes: ['id', 'nombre', 'apellido', 'documento'],
    required: false,
  };

  if (search) {
    clienteInclude.required = true;
    clienteInclude.where = {
      [Op.or]: [
        { nombre: { [Op.like]: `%${search}%` } },
        { apellido: { [Op.like]: `%${search}%` } },
        { documento: { [Op.like]: `%${search}%` } },
      ],
    };
  }

  const query = {
    where,
    include: [clienteInclude],
    order: [['created_at', 'DESC']],
  };

  if (page != null || limit != null) {
    const p = parseInt(page, 10) || 1;
    const l = parseInt(limit, 10) || 8;
    const { count, rows } = await Calculo.findAndCountAll({
      ...query,
      limit: l,
      offset: (p - 1) * l,
      distinct: true,
    });
    return {
      total: count,
      page: p,
      limit: l,
      data: enrichCalculos(rows),
    };
  }

  const rows = await Calculo.findAll(query);
  return enrichCalculos(rows);
};

const obtenerCalculo = async (id, clienteId = null) => {
  const where = { id };
  if (clienteId) where.cliente_id = clienteId;

  const calculo = await Calculo.findOne({
    where,
    include: [
      { model: DetalleCalculo, as: 'detalles' },
      { model: Cliente, as: 'cliente' },
    ],
  });

  if (!calculo) throw new AppError('Cálculo no encontrado', 404);
  return enrichCalculo(calculo);
};

module.exports = { ejecutarCalculo, previewCalculo, listarCalculos, obtenerCalculo };
