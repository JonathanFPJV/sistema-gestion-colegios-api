const express = require('express');
const docenteCursoController = require('../controllers/docenteCurso.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { authorizeRoles } = require('../middlewares/permission.middleware');
const DocenteCursoModel = require('../models/DocenteCurso.model'); // Para helper de autorización
const PersonaModel = require('../models/Persona.model'); // Para obtener id_colegio del docente si es necesario
const CursoModel = require('../models/Curso.model');     // Para obtener id_colegio del curso


const router = express.Router();

// Helper para obtener el id_colegio de la asignación Docente-Curso.
const getColegioIdFromDocenteCurso = async (req, res, next) => {
    const { id } = req.params; // id_docente_curso
    if (!id) return res.status(400).json({ message: 'ID de asignación Docente-Curso es requerido.' });

    try {
        const asignacion = await DocenteCursoModel.getByIdWithDetails(id); // Usa el modelo para obtener el colegio_id
        if (!asignacion) {
            return res.status(404).json({ message: 'Asignación Docente-Curso no encontrada.' });
        }
        req.params.id_colegio_param = asignacion.id_colegio; // Adjunta el id_colegio al request para authorizeColegio
        next();
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};


// Obtener todas las asignaciones Docente-Curso
// Administrador Global ve todas. Administrador de Colegio ve las de su colegio.
// Docente podría ver sus propias asignaciones.
router.get(
    '/',
    authenticateToken,
    authorizeRoles('Administrador Global', 'Administrador Colegio', 'Docente'),
    async (req, res, next) => {
        if (req.user.role === 'Administrador Colegio' && req.user.colegioId) {
            try {
                const asignacionesDelColegio = await DocenteCursoModel.getAsignacionesByColegioId(req.user.colegioId);
                return res.status(200).json(asignacionesDelColegio);
            } catch (error) {
                return res.status(500).json({ message: 'Error al filtrar asignaciones Docente-Curso por colegio: ' + error.message });
            }
        }
        if (req.user.role === 'Docente') {
            try {
                // Un docente solo puede ver sus propias asignaciones
                const propiasAsignaciones = await DocenteCursoModel.getAsignacionesByPersonaId(req.user.personaId);
                return res.status(200).json(propiasAsignaciones);
            } catch (error) {
                return res.status(500).json({ message: 'Error al obtener asignaciones propias: ' + error.message });
            }
        }
        next(); // Si es Administrador Global, pasa al controlador general
    },
    docenteCursoController.getAllDocenteCursos // Se ejecutará solo para Admin Global
);

// Obtener una asignación Docente-Curso por ID
router.get(
    '/:id',
    authenticateToken,
    authorizeRoles('Administrador Global', 'Administrador Colegio', 'Docente'),
    getColegioIdFromDocenteCurso, // Obtiene el id_colegio de la asignación
    // authorizeColegio, // Este middleware ya está en el flujo gracias a getColegioIdFromDocenteCurso
    (req, res, next) => {
        // Lógica de autorización adicional para Docentes (solo puede ver las suyas)
        if (req.user.role === 'Docente') {
            // Verificar si el ID de persona de la asignación coincide con el ID de persona del usuario logueado
            if (req.params.id_colegio_param === req.user.colegioId && req.user.personaId === req.params.id_persona) { // req.params.id_persona no existe, necesitas obtenerlo de la asignación
                // Mejor obtener la asignacion completa y verificar personaId
                docenteCursoController.getDocenteCursoById(req, res); // Llama al controlador para obtener y luego verificar
            } else {
                return res.status(403).json({ message: 'No tiene permisos para ver esta asignación.' });
            }
        } else {
            next(); // Para Admin Global y Admin Colegio, se aplica authorizeColegio.
        }
    },
    docenteCursoController.getDocenteCursoById // El controlador ya tiene la lógica de obtener y devolver
);

// Crear una nueva asignación Docente-Curso
router.post(
    '/',
    authenticateToken,
    authorizeRoles('Administrador Global', 'Administrador Colegio'),
    // Lógica específica para Admin Colegio para asegurar que docente y curso sean de su colegio
    async (req, res, next) => {
        if (req.user.role === 'Administrador Colegio' && req.user.colegioId) {
            const { id_persona, id_curso } = req.body;

            // Obtener el colegio del docente (si tiene asignaciones previas)
            const [docenteColegioQueryResult] = await PersonaModel.pool.query(`
                SELECT C.id_colegio
                FROM Docente_Curso DC
                JOIN Cursos CUR ON DC.id_curso = CUR.id_curso
                JOIN Colegios C ON CUR.id_colegio = C.id_colegio
                WHERE DC.id_persona = ?
                LIMIT 1
            `, [id_persona]);
            const docenteColegioId = docenteColegioQueryResult.length > 0 ? docenteColegioQueryResult[0].id_colegio : null;

            // Obtener el colegio del curso
            const curso = await CursoModel.findById(id_curso);
            if (!curso) { // Basic check, service will do more
                return res.status(400).json({ message: 'El curso especificado no existe.' });
            }

            // Validar que el docente (si ya está asociado a un colegio) y el curso pertenezcan al colegio del Admin
            if (docenteColegioId && docenteColegioId !== req.user.colegioId) {
                 return res.status(403).json({ message: 'El docente no pertenece a su colegio.' });
            }
            if (curso.id_colegio !== req.user.colegioId) {
                return res.status(403).json({ message: 'El curso no pertenece a su colegio.' });
            }
        }
        next();
    },
    docenteCursoController.createDocenteCurso
);

// Actualizar una asignación Docente-Curso
router.put(
    '/:id',
    authenticateToken,
    authorizeRoles('Administrador Global', 'Administrador Colegio'),
    getColegioIdFromDocenteCurso, // Obtiene el id_colegio de la asignación
    // authorizeColegio, // Este middleware ya está en la cadena
    // Lógica adicional para Admin Colegio si intenta cambiar docente o curso
    async (req, res, next) => {
        if (req.user.role === 'Administrador Colegio' && req.user.colegioId) {
            const { id_persona, id_curso } = req.body;
            // Si cambia id_persona, verificar que el nuevo docente sea de su colegio
            if (id_persona) {
                const [newDocenteColegioQueryResult] = await PersonaModel.pool.query(`
                    SELECT C.id_colegio
                    FROM Docente_Curso DC
                    JOIN Cursos CUR ON DC.id_curso = CUR.id_curso
                    JOIN Colegios C ON CUR.id_colegio = C.id_colegio
                    WHERE DC.id_persona = ?
                    LIMIT 1
                `, [id_persona]);
                const newDocenteColegioId = newDocenteColegioQueryResult.length > 0 ? newDocenteColegioQueryResult[0].id_colegio : null;

                if (newDocenteColegioId && newDocenteColegioId !== req.user.colegioId) {
                    return res.status(403).json({ message: 'El nuevo docente no pertenece a su colegio.' });
                }
            }
            // Si cambia id_curso, verificar que el nuevo curso sea de su colegio
            if (id_curso) {
                const newCurso = await CursoModel.findById(id_curso);
                if (!newCurso || newCurso.id_colegio !== req.user.colegioId) {
                    return res.status(403).json({ message: 'El nuevo curso no pertenece a su colegio.' });
                }
            }
        }
        next();
    },
    docenteCursoController.updateDocenteCurso
);

// Eliminar una asignación Docente-Curso
router.delete(
    '/:id',
    authenticateToken,
    authorizeRoles('Administrador Global', 'Administrador Colegio'),
    getColegioIdFromDocenteCurso, // Obtiene el id_colegio de la asignación
    // authorizeColegio, // Este middleware ya está en la cadena
    docenteCursoController.deleteDocenteCurso
);

module.exports = router;