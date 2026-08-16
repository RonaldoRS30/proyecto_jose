const { AppError } = require('../utils/errorHandler');

const TIPOS = ['natural', 'empresa'];

function inferTipoCliente(cliente) {
  if (cliente?.tipo_cliente && TIPOS.includes(cliente.tipo_cliente)) {
    return cliente.tipo_cliente;
  }
  const apellido = cliente?.apellido;
  return apellido === null || apellido === undefined || String(apellido).trim() === ''
    ? 'empresa'
    : 'natural';
}

function parseOptionalAlumbrado(raw) {
  if (raw.alumbrado_publico === undefined) return undefined;
  if (raw.alumbrado_publico === null || raw.alumbrado_publico === '') return null;
  const parsed = parseFloat(raw.alumbrado_publico);
  if (Number.isNaN(parsed) || parsed < 0) {
    throw new AppError('El alumbrado público debe ser un número válido mayor o igual a 0', 400);
  }
  return parsed;
}

function parseOptionalElectrificacion(raw) {
  if (raw.electrificacion_rural === undefined) return undefined;
  if (raw.electrificacion_rural === null || raw.electrificacion_rural === '') return null;
  const parsed = parseFloat(raw.electrificacion_rural);
  if (Number.isNaN(parsed) || parsed < 0) {
    throw new AppError('La electrificación rural debe ser un número válido mayor o igual a 0', 400);
  }
  return parsed;
}

function buildCommonFields(raw, tarifaKwh) {
  const payload = {
    ...raw,
    tarifa_kwh: tarifaKwh,
    email: raw.email == null ? null : String(raw.email).trim() || null,
    direccion: raw.direccion == null ? null : String(raw.direccion).trim() || null,
  };

  if (raw.potencia_contratada != null) {
    payload.potencia_contratada = String(raw.potencia_contratada).trim() || null;
  }

  const alumbradoPublico = parseOptionalAlumbrado(raw);
  if (alumbradoPublico !== undefined) {
    payload.alumbrado_publico = alumbradoPublico;
  }

  const electrificacionRural = parseOptionalElectrificacion(raw);
  if (electrificacionRural !== undefined) {
    payload.electrificacion_rural = electrificacionRural;
  }

  return payload;
}

function normalizeClientePayload(raw = {}) {
  const tipo = raw.tipo_cliente === 'empresa' ? 'empresa' : 'natural';
  const nombre = String(raw.nombre ?? '').trim();
  const apellidoRaw = raw.apellido == null ? '' : String(raw.apellido).trim();
  const documento = String(raw.documento ?? '').replace(/\D/g, '');
  const tarifaRaw = raw.tarifa_kwh;

  if (tarifaRaw === null || tarifaRaw === undefined || tarifaRaw === '') {
    throw new AppError('La tarifa eléctrica (S/ por kWh) es obligatoria', 400);
  }
  const tarifaKwh = parseFloat(tarifaRaw);
  if (Number.isNaN(tarifaKwh) || tarifaKwh < 0) {
    throw new AppError('La tarifa eléctrica debe ser un número válido mayor o igual a 0', 400);
  }

  if (!nombre) {
    throw new AppError(
      tipo === 'empresa' ? 'La razón social es obligatoria' : 'El nombre es obligatorio',
      400
    );
  }

  if (tipo === 'empresa') {
    if (apellidoRaw) {
      throw new AppError('Una empresa no puede tener apellido. Elija solo el tipo Empresa.', 400);
    }
    if (!/^\d{11}$/.test(documento)) {
      throw new AppError('El RUC debe tener exactamente 11 dígitos numéricos', 400);
    }

    return {
      ...buildCommonFields(raw, tarifaKwh),
      tipo_cliente: 'empresa',
      nombre,
      apellido: null,
      documento,
    };
  }

  if (!apellidoRaw) {
    throw new AppError('El apellido es obligatorio para persona natural', 400);
  }
  if (!/^\d{8}$/.test(documento)) {
    throw new AppError('El DNI debe tener exactamente 8 dígitos numéricos', 400);
  }

  return {
    ...buildCommonFields(raw, tarifaKwh),
    tipo_cliente: 'natural',
    nombre,
    apellido: apellidoRaw,
    documento,
  };
}

module.exports = {
  TIPOS,
  inferTipoCliente,
  normalizeClientePayload,
};
