const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generarCodigoAcceso(longitud = 8) {
  let result = '';
  for (let i = 0; i < longitud; i += 1) {
    result += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
  }
  return result;
}

function generarCodigoInterno() {
  const num = Math.floor(100000 + Math.random() * 900000);
  return `CLI-${num}`;
}

module.exports = { generarCodigoAcceso, generarCodigoInterno };
