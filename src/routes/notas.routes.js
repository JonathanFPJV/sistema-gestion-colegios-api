const express = require('express');
const notaController = require('../controllers/nota.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { authorizeRoles } = require('../middlewares/permission.middleware');
const upload = require('../config/multer.config'); // Importar Multer
const NotaModel = require('../models/Nota.model'); // Para helper de autorización
const MatriculaModel = require('../models/Matricula.model'); // Para verificar colegio del alumno
const DocenteCursoModel = require('../models/DocenteCurso.model'); // Para verificar docente y curso


const router = express.Router();

// Middleware de Multer para manejar los archivos de Nota (ej. examen escaneado)
const notaFileUpload = upload.fields([
    { name: 'url_examen_escaneado', maxCount: 1 }
]);

// Helper para obtener el id_colegio de la nota a través de la matrícula.
const getColegioIdFromNota = async (req, res, next) => {
    const { id } = req.params; // id_nota
    if (!id) return res.status(400).json({ message: 'ID de nota es requerido.' });

    try {
        const nota = await NotaModel.getByIdWithDetails(id); // Usa el modelo para obtener el colegio_id
        if (!nota) {
            return res.status(404).json({ message: 'Nota no encontrada.' });
        }
        req.params.id_colegio_param = nota.colegio_id; // Adjunta el id_colegio al request para authorizeColegio
        // Adjunta también el alumno_id_persona y docente_id_persona para validaciones más específicas en los roles
        req.params.alumno_id_persona = nota.alumno_id_persona;
        req.params.docente_id_persona = nota.docente_id_persona;
        next();
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};


// Obtener todas las notas
// Administrador Global ve todas. Administrador de Colegio ve las de su colegio.
// Docente ve sus propias notas puestas. Alumno ve sus propias notas.
router.get(
    '/',
    authenticateToken,
    authorizeRoles('Administrador Global', 'Administrador Colegio', 'Docente', 'Alumno'),
    async (req, res, next) => {
        if (req.user.role === 'Administrador Colegio' && req.user.colegioId) {
            try {
                const notasDelColegio = await NotaModel.getNotasByColegioId(req.user.colegioId);
                return res.status(200).json(notasDelColegio);
            } catch (error) {
                return res.status(500).json({ message: 'Error al filtrar notas por colegio: ' + error.message });
            }
        }
        if (req.user.role === 'Docente' && req.user.personaId) {
            try {
                const propiasNotas = await NotaModel.getNotasByDocentePersonaId(req.user.personaId);
                return res.status(200).json(propiasNotas);
            } catch (error) {
                return res.status(500).json({ message: 'Error al obtener notas puestas por el docente: ' + error.message });
            }
        }
        if (req.user.role === 'Alumno' && req.user.personaId) {
            try {
                const propiasNotas = await NotaModel.getNotasByAlumnoPersonaId(req.user.personaId);
                return res.status(200).json(propiasNotas);
            } catch (error) {
                return res.status(500).json({ message: 'Error al obtener notas del alumno: ' + error.message });
            }
        }
        next(); // Si es Administrador Global, pasa al controlador general
    },
    notaController.getAllNotas // Se ejecutará solo para Admin Global
);

// Obtener una nota por ID
router.get(
    '/:id',
    authenticateToken,
    authorizeRoles('Administrador Global', 'Administrador Colegio', 'Docente', 'Alumno'),
    getColegioIdFromNota, // Obtiene el id_colegio, alumno_id_persona, docente_id_persona
    // authorizeColegio, // Este middleware ya está en el flujo
    (req, res, next) => {
        // Lógica de autorización adicional para Docentes y Alumnos
        if (req.user.role === 'Docente' && req.user.personaId) {
            // Un docente solo puede ver notas que él mismo puso (docente_id_persona).
            if (req.params.docente_id_persona === req.user.personaId) {
                next();
            } else {
                return res.status(403).json({ message: 'No tiene permisos para ver esta nota (no fue puesta por usted).' });
            }
        } else if (req.user.role === 'Alumno' && req.user.personaId) {
            // Un alumno solo puede ver sus propias notas (alumno_id_persona).
            if (req.params.alumno_id_persona === req.user.personaId) {
                next();
            } else {
                return res.status(403).json({ message: 'No tiene permisos para ver esta nota (no es suya).' });
            }
        } else {
            next(); // Para Admin Global y Admin Colegio, se aplica authorizeColegio.
        }
    },
    notaController.getNotaById
);

// Crear una nueva nota
router.post(
    '/',
    authenticateToken,
    authorizeRoles('Administrador Global', 'Administrador Colegio', 'Docente'),
    // Lógica específica de autorización en el controlador para Docentes y Admin Colegio
    notaFileUpload,
    notaController.createNota
);

// Actualizar una nota
router.put(
    '/:id',
    authenticateToken,
    authorizeRoles('Administrador Global', 'Administrador Colegio', 'Docente'),
    getColegioIdFromNota, // Obtiene el id_colegio, alumno_id_persona, docente_id_persona
    // authorizeColegio, // Este middleware ya está en el flujo
    // Lógica adicional de autorización en el controlador para Docentes y Admin Colegio
    notaFileUpload,
    notaController.updateNota
);

// Eliminar una nota
router.delete(
    '/:id',
    authenticateToken,
    authorizeRoles('Administrador Global', 'Administrador Colegio', 'Docente'),
    getColegioIdFromNota, // Obtiene el id_colegio, alumno_id_persona, docente_id_persona
    // authorizeColegio, // Este middleware ya está en el flujo
    // Lógica adicional de autorización en el controlador para Docentes y Admin Colegio
    notaController.deleteNota
);

module.exports = router;