const express = require('express');
const asignacionCursoAnoController = require('../controllers/asignacionCursoAno.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { authorizeRoles } = require('../middlewares/permission.middleware');
const AsignacionCursoAnoModel = require('../models/AsignacionCursoAno.model'); // Para helper de autorización


const router = express.Router();

// Helper para obtener el id_colegio de la asignación a través del curso.
const getColegioIdFromAsignacion = async (req, res, next) => {
    const { id } = req.params; // id_asignacion_curso_ano
    if (!id) return res.status(400).json({ message: 'ID de asignación es requerido.' });

    try {
        const asignacion = await AsignacionCursoAnoModel.getByIdWithDetails(id); // Usa el modelo para obtener el colegio_id
        if (!asignacion) {
            return res.status(404).json({ message: 'Asignación de curso a año no encontrada.' });
        }
        req.params.id_colegio_param = asignacion.id_colegio; // Adjunta el id_colegio al request para authorizeColegio
        next();
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};


// Obtener todas las asignaciones de cursos a años
// Administrador Global ve todas. Administrador de Colegio ve las de su colegio.
router.get(
    '/',
    authenticateToken,
    authorizeRoles('Administrador Global', 'Administrador Colegio', 'Docente'),
    async (req, res, next) => {
        if (req.user.role === 'Administrador Colegio' && req.user.colegioId) {
            try {
                const asignacionesDelColegio = await AsignacionCursoAnoModel.getAsignacionesByColegioId(req.user.colegioId);
                return res.status(200).json(asignacionesDelColegio);
            } catch (error) {
                return res.status(500).json({ message: 'Error al filtrar asignaciones por colegio: ' + error.message });
            }
        }
        next(); // Si es Administrador Global o Docente, pasa al controlador general
    },
    asignacionCursoAnoController.getAllAsignaciones
);

// Obtener una asignación de curso a año por ID
router.get(
    '/:id',
    authenticateToken,
    authorizeRoles('Administrador Global', 'Administrador Colegio', 'Docente'),
    getColegioIdFromAsignacion, // Obtiene el id_colegio de la asignación para authorizeColegio
    // authorizeColegio, // Este middleware ya está en el flujo gracias a getColegioIdFromAsignacion
    // Lógica adicional de autorización para docentes si fuera necesario
    (req, res, next) => {
        if (req.user.role === 'Docente') {
            // Un docente podría ver cualquier asignación de curso a año de su colegio.
            // La validación de colegio_id ya está en getColegioIdFromAsignacion.
            if (req.params.id_colegio_param === req.user.colegioId) {
                 next();
             } else {
                 return res.status(403).json({ message: 'No tiene permisos para ver esta asignación.' });
             }
        } else {
            next(); // Para Admin Global y Admin Colegio, se aplica authorizeColegio.
        }
    },
    asignacionCursoAnoController.getAsignacionById
);

// Crear una nueva asignación de curso a año
router.post(
    '/',
    authenticateToken,
    authorizeRoles('Administrador Global', 'Administrador Colegio'),
    // Lógica específica para Admin Colegio para asegurar que el curso pertenezca a su colegio
    async (req, res, next) => {
        if (req.user.role === 'Administrador Colegio' && req.user.colegioId) {
            const curso = await CursoModel.findById(req.body.id_curso); // Necesita CursoModel aquí
            if (!curso || curso.id_colegio !== req.user.colegioId) {
                return res.status(403).json({ message: 'No tiene permisos para asignar cursos de otros colegios.' });
            }
        }
        next();
    },
    asignacionCursoAnoController.createAsignacion
);

// Actualizar una asignación de curso a año
router.put(
    '/:id',
    authenticateToken,
    authorizeRoles('Administrador Global', 'Administrador Colegio'),
    getColegioIdFromAsignacion, // Obtiene el id_colegio de la asignación para authorizeColegio
    // authorizeColegio, // Este middleware ya está en la cadena
    // Lógica adicional para Admin Colegio si intenta cambiar id_curso
    async (req, res, next) => {
        if (req.user.role === 'Administrador Colegio' && req.user.colegioId && req.body.id_curso) {
            const newCurso = await CursoModel.findById(req.body.id_curso); // Necesita CursoModel aquí
            if (!newCurso || newCurso.id_colegio !== req.user.colegioId) {
                return res.status(403).json({ message: 'No puede reasignar a un curso que no pertenece a su colegio.' });
            }
        }
        next();
    },
    asignacionCursoAnoController.updateAsignacion
);

// Eliminar una asignación de curso a año
router.delete(
    '/:id',
    authenticateToken,
    authorizeRoles('Administrador Global', 'Administrador Colegio'),
    getColegioIdFromAsignacion, // Obtiene el id_colegio de la asignación para authorizeColegio
    // authorizeColegio, // Este middleware ya está en la cadena
    asignacionCursoAnoController.deleteAsignacion
);

module.exports = router;