const express = require('express');
const sedeController = require('../controllers/sede.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { authorizeRoles, authorizeColegio } = require('../middlewares/permission.middleware');
const upload = require('../config/multer.config'); // Importar Multer

const router = express.Router();

// Middleware de Multer para manejar los archivos de Sede
const sedeFileUpload = upload.fields([
    { name: 'url_foto_sede', maxCount: 1 }
]);

// Helper para obtener el id_colegio de una sede, si la ruta no lo incluye directamente.
// Necesario para authorizeColegio cuando el ID del colegio no está en los params de la ruta.
const getColegioIdFromSede = async (req, res, next) => {
    const { id } = req.params; // id_sede
    if (!id) return res.status(400).json({ message: 'ID de sede es requerido.' });

    try {
        const sede = await sedeController.getSedeById(req); // Usar el controlador para obtener la sede
        if (!sede) {
            return res.status(404).json({ message: 'Sede no encontrada.' });
        }
        req.params.id_colegio_param = sede.id_colegio; // Adjunta el id_colegio al request para authorizeColegio
        next();
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};


// Obtener todas las sedes
// Administrador Global puede ver todas. Administrador Colegio solo las de su colegio.
router.get(
    '/',
    authenticateToken,
    authorizeRoles('Administrador Global', 'Administrador Colegio'),
    sedeController.getAllSedes
);

// Obtener una sede por ID
// Administrador Global puede ver cualquier sede. Administrador Colegio solo las de su colegio.
router.get(
    '/:id',
    authenticateToken,
    authorizeRoles('Administrador Global', 'Administrador Colegio'),
    getColegioIdFromSede, // Obtiene el id_colegio de la sede para el siguiente middleware
    authorizeColegio,     // Verifica la autorización por colegio
    sedeController.getSedeById
);

// Crear una nueva sede
// Solo Administrador Global o Administrador de Colegio (debe especificar un id_colegio válido).
router.post(
    '/',
    authenticateToken,
    authorizeRoles('Administrador Global', 'Administrador Colegio'),
    // Para Admin Colegio, asegurarse que el id_colegio en el body coincida con su colegioId del JWT
    (req, res, next) => {
        if (req.user.role === 'Administrador Colegio' && req.body.id_colegio !== req.user.colegioId) {
            return res.status(403).json({ message: 'No tiene permisos para crear sedes en este colegio.' });
        }
        next();
    },
    sedeFileUpload,
    sedeController.createSede
);

// Actualizar una sede
// Administrador Global puede actualizar cualquiera. Administrador Colegio solo las de su colegio.
router.put(
    '/:id',
    authenticateToken,
    authorizeRoles('Administrador Global', 'Administrador Colegio'),
    getColegioIdFromSede, // Obtiene el id_colegio de la sede para el siguiente middleware
    authorizeColegio,     // Verifica la autorización por colegio
    sedeFileUpload,
    sedeController.updateSede
);

// Eliminar una sede
// Administrador Global puede eliminar cualquiera. Administrador Colegio solo las de su colegio.
router.delete(
    '/:id',
    authenticateToken,
    authorizeRoles('Administrador Global', 'Administrador Colegio'),
    getColegioIdFromSede, // Obtiene el id_colegio de la sede para el siguiente middleware
    authorizeColegio,     // Verifica la autorización por colegio
    sedeController.deleteSede
);

module.exports = router;