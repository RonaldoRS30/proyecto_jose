export const TEXTO_RECOMENDACION_CLIENTE = 'Equipo registrado por un cliente. Personalice la recomendación, potencia de referencia y fórmulas desde este panel.';

export function esRecomendacionRegistradaPorCliente(item) {
  return item?.texto === TEXTO_RECOMENDACION_CLIENTE;
}

export const MODULO_RECOMENDACION_LABELS = {
  aparato: 'Electrodomésticos',
  fantasma: 'Consumo fantasma',
  iluminacion: 'Iluminación',
};

export function labelModuloRecomendacion(modulo) {
  return MODULO_RECOMENDACION_LABELS[modulo] || modulo || '-';
}
