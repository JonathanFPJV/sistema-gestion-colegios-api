const express = require('express');
const nivelEnsenanzaController = require('../controllers/NivelEnsenanza.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { authorizeRoles } = require('../middlewares/permission.middleware');

const router = express.Router();

// Obtener todos los niveles de enseñanza
// Accesible por administradores, docentes, etc., ya que son genéricos.
router.get(
    '/',
    authenticateToken,
    authorizeRoles('Administrador Global', 'Administrador Colegio', 'Docente'),
    nivelEnsenanzaController.getAllNiveles
);

// Obtener un nivel de enseñanza por ID
router.get(
    '/:id',
    authenticateToken,
    authorizeRoles('Administrador Global', 'Administrador Colegio', 'Docente'),
    nivelEnsenanzaController.getNivelById
);

// Crear un nuevo nivel de enseñanza
// Restringido a Administrador Global.
router.post(
    '/',
    authenticateToken,
    authorizeRoles('Administrador Global'),
    nivelEnsenanzaController.createNivel
);

// Actualizar un nivel de enseñanza
// Restringido a Administrador Global.
router.put(
    '/:id',
    authenticateToken,
    authorizeRoles('Administrador Global'),
    nivelEnsenanzaController.updateNivel
);

// Eliminar un nivel de enseñanza
// Restringido a Administrador Global, con precaución debido a FKs.
router.delete(
    '/:id',
    authenticateToken,
    authorizeRoles('Administrador Global'),
    nivelEnsenanzaController.deleteNivel
);

module.exports = router;