const express = require('express');
const personaController = require('../controllers/persona.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { authorizeRoles } = require('../middlewares/permission.middleware');
const upload = require('../config/multer.config'); // Importar Multer

const router = express.Router();

// Middleware para gestionar la subida de archivos para Personas
// Se usa .fields para permitir múltiples campos de archivo con nombres específicos
const personaFileUpload = upload.fields([
    { name: 'foto_perfil', maxCount: 1 },
    { name: 'documento_dni', maxCount: 1 },
    { name: 'curriculum_vitae', maxCount: 1 },
    { name: 'titulo_academico', maxCount: 1 },
    { name: 'antecedentes_penales', maxCount: 1 }
]);

// Obtener todas las personas (solo Administrador Global o Administrador de Colegio)
router.get(
    '/',
    authenticateToken,
    authorizeRoles('Administrador Global', 'Administrador Colegio'),
    personaController.getAllPersonas
);

// Obtener una persona por ID (Admin Global, Admin Colegio o la misma persona)
router.get(
    '/:id',
    authenticateToken,
    authorizeRoles('Administrador Global', 'Administrador Colegio', 'Docente', 'Alumno', 'Apoderado'),
    // Middleware para verificar que el usuario solo puede ver sus propios datos o los de su colegio (si es Admin Colegio)
    (req, res, next) => {
        const personaIdParam = parseInt(req.params.id);
        const loggedInPersonaId = req.user.personaId; // Asegúrate de que personaId esté en el payload JWT

        if (req.user.role === 'Administrador Global' || req.user.role === 'Administrador Colegio') {
            // Los administradores pueden ver cualquier persona (Admin Colegio solo dentro de su colegio, si se implementa)
            next();
        } else if (loggedInPersonaId && loggedInPersonaId === personaIdParam) {
            // Una persona puede ver sus propios datos
            next();
        } else {
            return res.status(403).json({ message: 'Acceso denegado. No tiene permisos para ver esta persona.' });
        }
    },
    personaController.getPersonaById
);


// Crear una nueva persona (generalmente por Admin Global o Admin Colegio)
router.post(
    '/',
    authenticateToken,
    authorizeRoles('Administrador Global', 'Administrador Colegio'),
    personaFileUpload, // Middleware de Multer para manejar los archivos
    personaController.createPersona
);

// Actualizar datos de una persona (Admin Global, Admin Colegio o la misma persona)
router.put(
    '/:id',
    authenticateToken,
    authorizeRoles('Administrador Global', 'Administrador Colegio', 'Docente', 'Alumno', 'Apoderado'),
    // Middleware de autorización similar al GET por ID para asegurarse de que solo edita sus datos o si es admin
    (req, res, next) => {
        const personaIdParam = parseInt(req.params.id);
        const loggedInPersonaId = req.user.personaId;

        if (req.user.role === 'Administrador Global' || req.user.role === 'Administrador Colegio') {
            next();
        } else if (loggedInPersonaId && loggedInPersonaId === personaIdParam) {
            next();
        } else {
            return res.status(403).json({ message: 'Acceso denegado. No tiene permisos para actualizar esta persona.' });
        }
    },
    personaFileUpload, // Middleware de Multer para manejar los archivos
    personaController.updatePersona
);

// Eliminar una persona (solo Administrador Global)
router.delete(
    '/:id',
    authenticateToken,
    authorizeRoles('Administrador Global'),
    personaController.deletePersona
);

module.exports = router;