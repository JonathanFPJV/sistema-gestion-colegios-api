//src/config/multer.config.js
const multer = require('multer');
const path = require('path');

// Configuración de almacenamiento en memoria para Multer (para enviar a Cloudinary)
const storage = multer.memoryStorage();

// Filtro de archivos para permitir solo ciertos tipos
const fileFilter = (req, file, cb) => {
    const allowedMimes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Tipo de archivo no permitido. Solo imágenes (jpeg, png, gif) y documentos (pdf, doc, docx, xls, xlsx).'), false);
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Límite de 5MB
    fileFilter: fileFilter
});

module.exports = upload;