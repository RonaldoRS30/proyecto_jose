const pdf = require('pdf-parse');
const { createWorker } = require('tesseract.js');
const { extractTarifaFromText } = require('../helpers/reciboTarifaExtractor');
const { resolveReciboMimeType } = require('../helpers/reciboMimeType');

let ocrWorkerPromise = null;

async function getOcrWorker() {
  if (!ocrWorkerPromise) {
    ocrWorkerPromise = (async () => {
      const worker = await createWorker('spa');
      return worker;
    })();
  }
  return ocrWorkerPromise;
}

async function extractTextFromImage(buffer) {
  const worker = await getOcrWorker();
  const { data } = await worker.recognize(buffer, {}, {
    tessedit_pageseg_mode: '6',
  });
  const text = data.text || '';
  if (!text.trim()) {
    throw new Error(
      'No se pudo leer texto en la imagen JPEG/PNG. Use una foto más nítida, bien iluminada y con el recibo completo.',
    );
  }
  return text;
}

async function extractTextFromBuffer(buffer, mimetype, filename) {
  const type = resolveReciboMimeType(mimetype, filename);

  if (type === 'application/pdf') {
    const data = await pdf(buffer);
    const text = data.text || '';
    if (!text.trim()) {
      throw new Error('El PDF no tiene texto legible (escaneado). Use "Tomar foto" o suba una imagen JPEG/PNG del recibo.');
    }
    return text;
  }

  if (type === 'image/jpeg' || type === 'image/png') {
    return extractTextFromImage(buffer);
  }

  throw new Error('Formato no soportado. Use PDF o imagen (JPEG, JPG o PNG).');
}

async function extractTarifaFromRecibo(buffer, mimetype, filename) {
  const text = await extractTextFromBuffer(buffer, mimetype, filename);
  return extractTarifaFromText(text);
}

module.exports = {
  extractTarifaFromRecibo,
  extractTextFromBuffer,
};
