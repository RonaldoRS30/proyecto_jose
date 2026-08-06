const multer = require('multer');
const { isReciboMimeAllowed } = require('../helpers/reciboMimeType');

const uploadRecibo = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!isReciboMimeAllowed(file.mimetype, file.originalname)) {
      cb(new Error('Solo se permiten archivos PDF, JPEG, JPG o PNG.'));
      return;
    }
    cb(null, true);
  },
});

module.exports = { uploadRecibo };
