const { CodigoAcceso } = require('../models');
const { generarCodigoAcceso } = require('../helpers/codigoHelper');
const { AppError } = require('../utils/errorHandler');
const { obtenerCliente } = require('./clienteService');

const generarCodigo = async (clienteId, adminId, diasValidez = null) => {
  await obtenerCliente(clienteId);

  const codigoExistente = await CodigoAcceso.findOne({ where: { cliente_id: clienteId } });
  if (codigoExistente) {
    throw new AppError(
      'Este cliente ya tiene un código de acceso. Use Habilitar/Deshabilitar en la lista.',
      409
    );
  }

  let codigo;
  let exists = true;
  while (exists) {
    codigo = generarCodigoAcceso(8);
    const found = await CodigoAcceso.findOne({ where: { codigo } });
    exists = !!found;
  }

  const data = {
    codigo,
    cliente_id: clienteId,
    generado_por: adminId,
    activo: true,
  };

  if (diasValidez) {
    const exp = new Date();
    exp.setDate(exp.getDate() + parseInt(diasValidez));
    data.fecha_expiracion = exp;
  }

  return CodigoAcceso.create(data);
};

const listarCodigos = async (clienteId = null) => {
  const where = clienteId ? { cliente_id: clienteId } : {};
  return CodigoAcceso.findAll({
    where,
    include: [{ association: 'cliente', attributes: ['id', 'nombre', 'apellido'] }],
    order: [['created_at', 'DESC']],
  });
};

const actualizarCodigo = async (id, data) => {
  const codigo = await CodigoAcceso.findByPk(id);
  if (!codigo) throw new AppError('Código no encontrado', 404);
  await codigo.update(data);
  return codigo;
};

module.exports = { generarCodigo, listarCodigos, actualizarCodigo };
