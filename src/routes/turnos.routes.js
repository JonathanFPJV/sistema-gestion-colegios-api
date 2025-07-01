const express = require('express');
const turnoController = require('../controllers/turno.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { authorizeRoles } = require('../middlewares/permission.middleware');

const router = express.Router();

// Obtener todos los turnos
// Accesible por administradores, docentes, etc., ya que son genéricos.
router.get(
    '/',
    authenticateToken,
    authorizeRoles('Administrador Global', 'Administrador Colegio', 'Docente'),
    turnoController.getAllTurnos
);

// Obtener un turno por ID
router.get(
    '/:id',
    authenticateToken,
    authorizeRoles('Administrador Global', 'Administrador Colegio', 'Docente'),
    turnoController.getTurnoById
);

// Crear un nuevo turno
// Restringido a Administrador Global o Administrador de Colegio.
router.post(
    '/',
    authenticateToken,
    authorizeRoles('Administrador Global', 'Administrador Colegio'),
    turnoController.createTurno
);

// Actualizar un turno
// Restringido a Administrador Global o Administrador de Colegio.
router.put(
    '/:id',
    authenticateToken,
    authorizeRoles('Administrador Global', 'Administrador Colegio'),
    turnoController.updateTurno
);

// Eliminar un turno
// Restringido a Administrador Global o Administrador de Colegio, con precaución debido a FKs.
router.delete(
    '/:id',
    authenticateToken,
    authorizeRoles('Administrador Global', 'Administrador Colegio'),
    turnoController.deleteTurno
);

module.exports = router;