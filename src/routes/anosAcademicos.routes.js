const express = require('express');
const anosAcademicosController = require('../controllers/AnosAcademicos.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { authorizeRoles } = require('../middlewares/permission.middleware');

const router = express.Router();

// Obtener todos los años académicos
router.get(
    '/',
    authenticateToken,
    authorizeRoles('Administrador Global', 'Administrador Colegio', 'Docente'),
    anosAcademicosController.getAllAnosAcademicos
);

// Obtener un año académico por ID
router.get(
    '/:id',
    authenticateToken,
    authorizeRoles('Administrador Global', 'Administrador Colegio', 'Docente'),
    anosAcademicosController.getAnoAcademicoById
);

// Crear un nuevo año académico
router.post(
    '/',
    authenticateToken,
    authorizeRoles('Administrador Global', 'Administrador Colegio'), // Admin Colegio puede crear años para su colegio
    anosAcademicosController.createAnoAcademico
);

// Actualizar un año académico
router.put(
    '/:id',
    authenticateToken,
    authorizeRoles('Administrador Global', 'Administrador Colegio'),
    anosAcademicosController.updateAnoAcademico
);

// Eliminar un año académico
router.delete(
    '/:id',
    authenticateToken,
    authorizeRoles('Administrador Global', 'Administrador Colegio'),
    anosAcademicosController.deleteAnoAcademico
);

module.exports = router;