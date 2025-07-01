const express = require('express');
const rolController = require('../controllers/rol.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { authorizeRoles } = require('../middlewares/permission.middleware');

const router = express.Router();

// Obtener todos los roles
// Accesible por administradores y quizás otros roles para fines de visualización (ej. en formularios de registro).
router.get(
    '/',
    authenticateToken,
    authorizeRoles('Administrador Global', 'Administrador Colegio', 'Docente'), // Ej. un docente podría necesitar ver los roles de Alumno.
    rolController.getAllRoles
);

// Obtener un rol por ID
router.get(
    '/:id',
    authenticateToken,
    authorizeRoles('Administrador Global', 'Administrador Colegio', 'Docente'),
    rolController.getRolById
);

// Crear un nuevo rol
// Generalmente restringido solo a Administradores Globales.
router.post(
    '/',
    authenticateToken,
    authorizeRoles('Administrador Global'),
    rolController.createRol
);

// Actualizar un rol
// Generalmente restringido solo a Administradores Globales.
router.put(
    '/:id',
    authenticateToken,
    authorizeRoles('Administrador Global'),
    rolController.updateRol
);

// Eliminar un rol
// Extremadamente restringido, solo Administradores Globales, y con precaución debido a FKs.
router.delete(
    '/:id',
    authenticateToken,
    authorizeRoles('Administrador Global'),
    rolController.deleteRol
);

module.exports = router;