const MIN_TERM_LENGTH = 4;

const normalizeName = (str) => {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
};

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const hasWholePhrase = (haystack, needle) => {
  if (!needle || needle.length < MIN_TERM_LENGTH) return false;
  const regex = new RegExp(`(^|\\s)${escapeRegex(needle)}(\\s|$)`, 'i');
  return regex.test(haystack);
};

const getSignificantTokens = (value) =>
  normalizeName(value)
    .split(' ')
    .filter((token) => token.length >= MIN_TERM_LENGTH);

const getMatchTerms = (recomendacion) => {
  const terms = [recomendacion.nombre, ...(recomendacion.aliases || [])]
    .map(normalizeName)
    .filter((term) => term.length >= MIN_TERM_LENGTH);

  return [...new Set(terms)];
};

const namesMatch = (equipoNombre, term) => {
  const normalizedEquipo = normalizeName(equipoNombre);
  if (!normalizedEquipo || !term || term.length < MIN_TERM_LENGTH) return false;

  if (normalizedEquipo === term) return true;

  if (
    normalizedEquipo.length >= MIN_TERM_LENGTH
    && (hasWholePhrase(normalizedEquipo, term) || hasWholePhrase(term, normalizedEquipo))
  ) {
    return true;
  }

  const equipoTokens = getSignificantTokens(normalizedEquipo);
  const termTokens = getSignificantTokens(term);
  if (!equipoTokens.length || !termTokens.length) return false;

  const [sourceTokens, targetTokens] = equipoTokens.length <= termTokens.length
    ? [equipoTokens, termTokens]
    : [termTokens, equipoTokens];

  const primaryToken = sourceTokens[0];
  const primaryMatches = targetTokens.some(
    (token) => token === primaryToken
      || (primaryToken.length >= MIN_TERM_LENGTH && token.startsWith(primaryToken))
      || (token.length >= MIN_TERM_LENGTH && primaryToken.startsWith(token))
  );

  if (!primaryMatches) return false;

  return sourceTokens.every((sourceToken) =>
    targetTokens.some((targetToken) =>
      sourceToken === targetToken
      || (sourceToken.length >= MIN_TERM_LENGTH && targetToken.includes(sourceToken))
    ));
};

const matchRecomendacion = (equipoNombre, recomendacion, modulo = null) => {
  if (!recomendacion.activo) return false;
  if (modulo && recomendacion.modulo && recomendacion.modulo !== modulo) return false;

  const terms = getMatchTerms(recomendacion);
  return terms.some((term) => namesMatch(equipoNombre, term));
};

const matchRecomendacionesForEquipos = (equipos, recomendaciones) => {
  const matched = [];
  const seen = new Set();

  (equipos || []).forEach((equipo) => {
    const nombre = typeof equipo === 'string' ? equipo : equipo.nombre;
    const modulo = typeof equipo === 'string' ? null : equipo.modulo;

    recomendaciones.forEach((rec) => {
      if (seen.has(rec.id)) return;
      if (matchRecomendacion(nombre, rec, modulo)) {
        seen.add(rec.id);
        matched.push(rec);
      }
    });
  });

  return matched.sort((a, b) => (a.orden || 0) - (b.orden || 0) || a.nombre.localeCompare(b.nombre));
};

module.exports = {
  normalizeName,
  matchRecomendacion,
  matchRecomendacionesForEquipos,
};
