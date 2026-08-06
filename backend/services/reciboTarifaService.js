const pdf = require('pdf-parse');
const { createWorker } = require('tesseract.js');
const { extractTarifaFromText } = require('../helpers/reciboTarifaExtractor');

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

async function extractTextFromBuffer(buffer, mimetype) {
  const type = (mimetype || '').toLowerCase();

  if (type === 'application/pdf') {
    const data = await pdf(buffer);
    const text = data.text || '';
    if (!text.trim()) {
      throw new Error('El PDF no tiene texto legible (escaneado). Use "Tomar foto" o suba una imagen del recibo.');
    }
    return text;
  }

  if (/^image\//.test(type)) {
    const worker = await getOcrWorker();
    const { data } = await worker.recognize(buffer);
    return data.text || '';
  }

  throw new Error('Formato no soportado. Use PDF o imagen (JPG/PNG).');
}

async function extractTarifaFromRecibo(buffer, mimetype) {
  const text = await extractTextFromBuffer(buffer, mimetype);
  return extractTarifaFromText(text);
}

module.exports = {
  extractTarifaFromRecibo,
  extractTextFromBuffer,
};
