const crypto = require('crypto');

/**
 * Genera código único de acceso alfanumérico
 */
function generarCodigoAcceso(longitud = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let codigo = '';
  const bytes = crypto.randomBytes(longitud);
  for (let i = 0; i < longitud; i++) {
    codigo += chars[bytes[i] % chars.length];
  }
  return codigo;
}

/**
 * Genera código interno de cliente
 */
function generarCodigoInterno() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `CLI-${timestamp}-${random}`;
}

module.exports = { generarCodigoAcceso, generarCodigoInterno };
