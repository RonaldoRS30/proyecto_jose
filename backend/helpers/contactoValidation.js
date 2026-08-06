const { AppError } = require('../utils/errorHandler');

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function validateContactoFields({ email, telefono, web }) {
  const emailTrim = String(email || '').trim();
  const webTrim = String(web || '').trim();
  const digits = onlyDigits(telefono);

  if (!emailTrim.includes('@')) {
    throw new AppError('El correo debe contener @', 400);
  }
  if (digits.length !== 9) {
    throw new AppError('El teléfono debe tener exactamente 9 dígitos', 400);
  }
  if (!/\.com/i.test(webTrim)) {
    throw new AppError('El sitio web debe incluir .com', 400);
  }

  return {
    email: emailTrim,
    telefono: digits,
    web: webTrim,
  };
}

function formatTelefonoDisplay(value) {
  const d = onlyDigits(value);
  if (d.length !== 9) return d || String(value || '').trim();
  return `+51 ${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
}

module.exports = {
  validateContactoFields,
  onlyDigits,
  formatTelefonoDisplay,
};
