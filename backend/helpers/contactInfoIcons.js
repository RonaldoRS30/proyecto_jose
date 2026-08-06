/** Dibuja iconos simples de contacto en PDF (no logos de marca) */
function drawContactIcon(doc, type, x, y, size = 8) {
  doc.save();
  doc.lineWidth(0.75);
  doc.strokeColor('#64748b');

  if (type === 'correo') {
    const h = size * 0.62;
    doc.rect(x, y + 1.5, size, h).stroke();
    doc.moveTo(x, y + 1.5).lineTo(x + size / 2, y + h * 0.55).lineTo(x + size, y + 1.5).stroke();
  } else if (type === 'telefono') {
    doc.roundedRect(x + 1.5, y, size - 3, size, 1.5).stroke();
    doc.moveTo(x + size / 2, y + size * 0.72).lineTo(x + size / 2, y + size * 0.82).stroke();
  } else if (type === 'web') {
    doc.circle(x + size / 2, y + size / 2, size / 2 - 0.5).stroke();
    doc.moveTo(x + size / 2, y + 0.5).lineTo(x + size / 2, y + size - 0.5).stroke();
    doc.moveTo(x + 0.5, y + size / 2).lineTo(x + size - 0.5, y + size / 2).stroke();
  }

  doc.restore();
}

module.exports = { drawContactIcon };
