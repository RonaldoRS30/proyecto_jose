export function inferTipoCliente(c) {
  if (!c) return 'natural';
  if (c.tipo_cliente === 'empresa' || c.tipo_cliente === 'natural') return c.tipo_cliente;
  return c.apellido === '' || c.apellido == null ? 'empresa' : 'natural';
}

export function isClienteEmpresa(c) {
  return inferTipoCliente(c) === 'empresa';
}

/** Razón social (empresa) o nombre + apellido (persona natural). */
export function formatClienteDisplayName(c) {
  if (!c) return '';
  if (isClienteEmpresa(c)) {
    return (c.nombre || '').trim();
  }
  return `${c.nombre || ''} ${c.apellido || ''}`.trim();
}

export function getClienteDisplayInitials(c) {
  const name = formatClienteDisplayName(c);
  if (!name) return '?';
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function getClienteTipoLabel(c) {
  return isClienteEmpresa(c) ? 'Empresa' : 'Persona natural';
}

export function getSidebarUserDisplay(user) {
  if (!user) return null;

  if (user.role === 'admin') {
    const name = (user.nombre || user.email || 'Administrador').trim();
    return {
      name,
      meta: 'Administrador',
      initials: name.slice(0, 2).toUpperCase(),
    };
  }

  const name = formatClienteDisplayName(user) || user.email || 'Cliente';
  return {
    name,
    meta: getClienteTipoLabel(user),
    initials: getClienteDisplayInitials(user),
  };
}
