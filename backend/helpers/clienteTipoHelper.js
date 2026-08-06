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

function normalizeClientePayload(raw = {}) {
  const tipo = raw.tipo_cliente === 'empresa' ? 'empresa' : 'natural';
  const nombre = String(raw.nombre ?? '').trim();
  const apellidoRaw = raw.apellido == null ? '' : String(raw.apellido).trim();
  const documento = String(raw.documento ?? '').replace(/\D/g, '');

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
      ...raw,
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
    ...raw,
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
