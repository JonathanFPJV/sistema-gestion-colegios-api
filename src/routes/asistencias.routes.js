const express = require('express');
const asistenciaController = require('../controllers/asistencia.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { authorizeRoles } = require('../middlewares/permission.middleware');
const upload = require('../config/multer.config'); // Importar Multer
const AsistenciaModel = require('../models/Asistencia.model'); // Para helper de autorización


const router = express.Router();

// Middleware de Multer para manejar los archivos de Asistencia (ej. parte de asistencia)
const asistenciaFileUpload = upload.fields([
    { name: 'url_parte_asistencia', maxCount: 1 }
]);

// Helper para obtener el id_colegio de la asistencia a través de la matrícula.
const getColegioIdFromAsistencia = async (req, res, next) => {
    const { id } = req.params; // id_asistencia
    if (!id) return res.status(400).json({ message: 'ID de asistencia es requerido.' });

    try {
        const asistencia = await AsistenciaModel.getByIdWithDetails(id); // Usa el modelo para obtener el colegio_id
        if (!asistencia) {
            return res.status(404).json({ message: 'Registro de asistencia no encontrado.' });
        }
        req.params.id_colegio_param = asistencia.colegio_id; // Adjunta el id_colegio al request para authorizeColegio
        // Adjunta también los IDs de persona del alumno y registrador para validaciones de rol
        req.params.alumno_id_persona = asistencia.alumno_id_persona;
        req.params.registrador_id_persona = asistencia.registrador_id_persona;
        next();
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};


// Obtener todos los registros de asistencias
// Administrador Global ve todas. Administrador de Colegio ve las de su colegio.
// Docente ve sus propias registradas. Alumno ve sus propias asistencias.
router.get(
    '/',
    authenticateToken,
    authorizeRoles('Administrador Global', 'Administrador Colegio', 'Docente', 'Alumno'),
    async (req, res, next) => {
        if (req.user.role === 'Administrador Colegio' && req.user.colegioId) {
            try {
                const asistenciasDelColegio = await AsistenciaModel.getAsistenciasByColegioId(req.user.colegioId);
                return res.status(200).json(asistenciasDelColegio);
            } catch (error) {
                return res.status(500).json({ message: 'Error al filtrar asistencias por colegio: ' + error.message });
            }
        }
        if (req.user.role === 'Docente' && req.user.personaId) {
            try {
                const propiasAsistencias = await AsistenciaModel.getAsistenciasByRegistradorPersonaId(req.user.personaId);
                return res.status(200).json(propiasAsistencias);
            } catch (error) {
                return res.status(500).json({ message: 'Error al obtener asistencias registradas por el docente: ' + error.message });
            }
        }
        if (req.user.role === 'Alumno' && req.user.personaId) {
            try {
                const propiasAsistencias = await AsistenciaModel.getAsistenciasByAlumnoPersonaId(req.user.personaId);
                return res.status(200).json(propiasAsistencias);
            } catch (error) {
                return res.status(500).json({ message: 'Error al obtener asistencias del alumno: ' + error.message });
            }
        }
        next(); // Si es Administrador Global, pasa al controlador general
    },
    asistenciaController.getAllAsistencias // Se ejecutará solo para Admin Global
);

// Obtener un registro de asistencia por ID
router.get(
    '/:id',
    authenticateToken,
    authorizeRoles('Administrador Global', 'Administrador Colegio', 'Docente', 'Alumno'),
    getColegioIdFromAsistencia, // Obtiene el id_colegio, alumno_id_persona, registrador_id_persona
    // authorizeColegio, // Este middleware ya está en el flujo
    (req, res, next) => {
        // Lógica de autorización adicional para Docentes y Alumnos
        if (req.user.role === 'Docente' && req.user.personaId) {
            // Un docente solo puede ver asistencias que él registró.
            if (req.params.registrador_id_persona === req.user.personaId) {
                next();
            } else {
                return res.status(403).json({ message: 'No tiene permisos para ver esta asistencia (no fue registrada por usted).' });
            }
        } else if (req.user.role === 'Alumno' && req.user.personaId) {
            // Un alumno solo puede ver sus propias asistencias.
            if (req.params.alumno_id_persona === req.user.personaId) {
                next();
            } else {
                return res.status(403).json({ message: 'No tiene permisos para ver esta asistencia (no es suya).' });
            }
        } else {
            next(); // Para Admin Global y Admin Colegio, se aplica authorizeColegio.
        }
    },
    asistenciaController.getAsistenciaById
);

// Crear un nuevo registro de asistencia
router.post(
    '/',
    authenticateToken,
    authorizeRoles('Administrador Global', 'Administrador Colegio', 'Docente'),
    // Lógica específica de autorización en el controlador para Docentes y Admin Colegio
    asistenciaFileUpload,
    asistenciaController.createAsistencia
);

// Actualizar un registro de asistencia
router.put(
    '/:id',
    authenticateToken,
    authorizeRoles('Administrador Global', 'Administrador Colegio', 'Docente'),
    getColegioIdFromAsistencia, // Obtiene el id_colegio, alumno_id_persona, registrador_id_persona
    // authorizeColegio, // Este middleware ya está en el flujo
    // Lógica adicional de autorización en el controlador para Docentes y Admin Colegio
    asistenciaFileUpload,
    asistenciaController.updateAsistencia
);

// Eliminar un registro de asistencia
router.delete(
    '/:id',
    authenticateToken,
    authorizeRoles('Administrador Global', 'Administrador Colegio', 'Docente'),
    getColegioIdFromAsistencia, // Obtiene el id_colegio, alumno_id_persona, registrador_id_persona
    // authorizeColegio, // Este middleware ya está en el flujo
    asistenciaController.deleteAsistencia
);

module.exports = router;