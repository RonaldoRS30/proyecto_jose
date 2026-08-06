export function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

export function validateContactoFields({ email, telefono, web }) {
  const errors = {};
  const emailTrim = String(email || '').trim();
  const webTrim = String(web || '').trim();
  const digits = onlyDigits(telefono);

  if (!emailTrim.includes('@')) {
    errors.email = 'El correo debe contener @';
  }
  if (digits.length !== 9) {
    errors.telefono = 'El teléfono debe tener exactamente 9 dígitos';
  }
  if (!/\.com/i.test(webTrim)) {
    errors.web = 'El sitio web debe incluir .com';
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors, data: null };
  }

  return {
    ok: true,
    errors: {},
    data: { email: emailTrim, telefono: digits, web: webTrim },
  };
}

export function formatTelefonoInput(value) {
  return onlyDigits(value).slice(0, 9);
}

/** Muestra 9 dígitos como +51 967 860 043 */
export function formatTelefonoDisplay(value) {
  const d = onlyDigits(value);
  if (d.length !== 9) return d || String(value || '').trim();
  return `+51 ${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
}
