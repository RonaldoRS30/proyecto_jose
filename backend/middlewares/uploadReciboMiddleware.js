const multer = require('multer');

const uploadRecibo = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /^(application\/pdf|image\/(jpeg|jpg|png))$/i.test(file.mimetype)
      || /\.(pdf|jpe?g|png)$/i.test(file.originalname || '');
    if (!ok) {
      cb(new Error('Solo se permiten archivos PDF, JPG o PNG.'));
      return;
    }
    cb(null, true);
  },
});

module.exports = { uploadRecibo };
