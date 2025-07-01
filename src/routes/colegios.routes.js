const express = require('express');
const colegioController = require('../controllers/colegio.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { authorizeRoles, authorizeColegio } = require('../middlewares/permission.middleware');
const upload = require('../config/multer.config'); // Importar Multer

const router = express.Router();

// Middleware de Multer para manejar los archivos de Colegio
const colegioFileUpload = upload.fields([
    { name: 'url_logo_colegio', maxCount: 1 },
    { name: 'url_documento_licencia', maxCount: 1 }
]);

const prepareColegioIdParam = (req, res, next) => {
    // Para rutas como /colegios/:id, el ID del colegio ya está en req.params.id
    if (req.params.id) {
        req.params.id_colegio_param = parseInt(req.params.id); // Asigna el ID del colegio al param esperado
    }
    next();
};

// Obtener todos los colegios
// Solo Administradores Globales pueden ver todos los colegios.
router.get(
    '/',
    authenticateToken,
    authorizeRoles('Administrador Global'),
    colegioController.getAllColegios
);

// Obtener un colegio por ID
// Administradores Globales pueden ver cualquier colegio.
// Administradores de Colegio solo pueden ver SU colegio.
router.get(
    '/:id',
    authenticateToken,
    authorizeRoles('Administrador Global', 'Administrador Colegio'),
    prepareColegioIdParam,
    authorizeColegio, // Este middleware debe verificar si req.user.colegioId coincide con req.params.id
    colegioController.getColegioById
);

// Crear un nuevo colegio
// Solo Administradores Globales pueden crear nuevos colegios en el sistema.
router.post(
    '/',
    authenticateToken,
    authorizeRoles('Administrador Global'),
    colegioFileUpload, // Aplica el middleware de Multer aquí
    colegioController.createColegio
);

// Actualizar un colegio
// Administradores Globales pueden actualizar cualquier colegio.
// Administradores de Colegio solo pueden actualizar SU colegio.
router.put(
    '/:id',
    authenticateToken,
    authorizeRoles('Administrador Global', 'Administrador Colegio'),
    prepareColegioIdParam,
    authorizeColegio, // Este middleware debe verificar si req.user.colegioId coincide con req.params.id
    colegioFileUpload, // Aplica el middleware de Multer aquí
    colegioController.updateColegio
);

// Eliminar un colegio
// Extremadamente restringido, solo Administradores Globales.
router.delete(
    '/:id',
    authenticateToken,
    authorizeRoles('Administrador Global'),
    prepareColegioIdParam, // ¡AÑADIR ESTE HELPER AQUÍ!
    authorizeColegio,
    colegioController.deleteColegio
);

module.exports = router;