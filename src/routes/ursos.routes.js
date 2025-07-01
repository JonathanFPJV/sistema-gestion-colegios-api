const express = require('express');
const cursoController = require('../controllers/curso.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { authorizeRoles } = require('../middlewares/permission.middleware');
const upload = require('../config/multer.config'); // Importar Multer
const CursoModel = require('../models/Curso.model'); // Para helper de autorización


const router = express.Router();

// Middleware de Multer para manejar los archivos del Curso (ej. sílabo)
const cursoFileUpload = upload.fields([
    { name: 'url_silabo', maxCount: 1 }
]);

// Helper para obtener el id_colegio del curso.
// Esto es para que authorizeColegio pueda verificar la pertenencia.
const getColegioIdFromCurso = async (req, res, next) => {
    const { id } = req.params; // id_curso
    if (!id) return res.status(400).json({ message: 'ID de curso es requerido.' });

    try {
        const curso = await CursoModel.getByIdWithColegioDetails(id); // Usa el modelo para obtener el colegio_id
        if (!curso) {
            return res.status(404).json({ message: 'Curso no encontrado.' });
        }
        req.params.id_colegio_param = curso.id_colegio; // Adjunta el id_colegio al request para authorizeColegio
        next();
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};


// Obtener todos los cursos
// Administrador Global ve todos. Administrador de Colegio ve los de su colegio.
// Docente podría ver los de su colegio.
router.get(
    '/',
    authenticateToken,
    authorizeRoles('Administrador Global', 'Administrador Colegio', 'Docente'),
    async (req, res, next) => {
        if (req.user.role === 'Administrador Colegio' && req.user.colegioId) {
            // Si es Admin Colegio, solo se le muestran los cursos de su colegio
            try {
                const cursosDelColegio = await CursoModel.getCursosByColegioId(req.user.colegioId);
                return res.status(200).json(cursosDelColegio);
            } catch (error) {
                return res.status(500).json({ message: 'Error al filtrar cursos por colegio: ' + error.message });
            }
        }
        // Si es Administrador Global o Docente, pasa al controlador para obtener todos los cursos (Docente deberá filtrar más adelante)
        next();
    },
    cursoController.getAllCursos
);

// Obtener un curso por ID
// Administrador Global ve cualquiera. Administrador de Colegio solo los de su colegio. Docente solo los de su colegio.
router.get(
    '/:id',
    authenticateToken,
    authorizeRoles('Administrador Global', 'Administrador Colegio', 'Docente'),
    getColegioIdFromCurso, // Obtiene el id_colegio del curso para authorizeColegio
    (req, res, next) => {
        // Lógica de autorización adicional para Docentes (opcional, si solo pueden ver sus cursos asignados)
        if (req.user.role === 'Docente') {
            // Por ahora, si es docente, y el curso pertenece al colegio del docente (ya verificado por authorizeColegio),
            // se le permite verlo. Una lógica más estricta podría verificar asignaciones específicas.
            if (req.params.id_colegio_param === req.user.colegioId) { // Asegura que el curso es de SU colegio
                next();
            } else {
                return res.status(403).json({ message: 'No tiene permisos para ver cursos de otros colegios.' });
            }
        } else {
            next(); // Pasa a authorizeColegio (que ya se ejecutó con id_colegio_param)
        }
    },
    // authorizeColegio ya está en el flujo gracias a getColegioIdFromCurso y la cadena de middlewares.
    cursoController.getCursoById
);

// Crear un nuevo curso
// Administrador Global o Administrador de Colegio (en su colegio).
router.post(
    '/',
    authenticateToken,
    authorizeRoles('Administrador Global', 'Administrador Colegio'),
    // Lógica específica para Admin Colegio para asegurar que el id_colegio del body coincida con su colegioId
    (req, res, next) => {
        if (req.user.role === 'Administrador Colegio' && req.body.id_colegio !== req.user.colegioId) {
            return res.status(403).json({ message: 'No tiene permisos para crear cursos en este colegio.' });
        }
        next();
    },
    cursoFileUpload,
    cursoController.createCurso
);

// Actualizar un curso
// Administrador Global o Administrador de Colegio (en su colegio).
router.put(
    '/:id',
    authenticateToken,
    authorizeRoles('Administrador Global', 'Administrador Colegio'),
    getColegioIdFromCurso, // Obtiene el id_colegio del curso para authorizeColegio
    // authorizeColegio,     // Este middleware ya está en la cadena
    // Lógica adicional para Admin Colegio si intenta cambiar id_colegio
    (req, res, next) => {
        if (req.user.role === 'Administrador Colegio' && req.user.colegioId && req.body.id_colegio && req.body.id_colegio !== req.user.colegioId) {
            return res.status(403).json({ message: 'No puede reasignar el curso a otro colegio.' });
        }
        next();
    },
    cursoFileUpload,
    cursoController.updateCurso
);

// Eliminar un curso
// Administrador Global o Administrador de Colegio (en su colegio).
router.delete(
    '/:id',
    authenticateToken,
    authorizeRoles('Administrador Global', 'Administrador Colegio'),
    getColegioIdFromCurso, // Obtiene el id_colegio del curso para authorizeColegio
    // authorizeColegio,     // Este middleware ya está en la cadena
    cursoController.deleteCurso
);

module.exports = router;