const express = require('express');
const matriculaController = require('../controllers/matricula.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { authorizeRoles } = require('../middlewares/permission.middleware');
const upload = require('../config/multer.config'); // Importar Multer
const MatriculaModel = require('../models/Matricula.model'); // Para helper de autorización
const GrupoClaseModel = require('../models/GrupoClase.model'); // Para helper de autorización


const router = express.Router();

// Middleware de Multer para manejar los archivos de Matrícula
const matriculaFileUpload = upload.fields([
    { name: 'url_contrato_matricula', maxCount: 1 },
    { name: 'url_historial_medico', maxCount: 1 },
    { name: 'url_ficha_socioeconomica', maxCount: 1 },
    { name: 'url_partida_nacimiento', maxCount: 1 },
    { name: 'url_documento_notas_previas', maxCount: 1 }
]);

// Helper para obtener el id_colegio de la matrícula a través del grupo.
const getColegioIdFromMatricula = async (req, res, next) => {
    const { id } = req.params; // id_matricula
    if (!id) return res.status(400).json({ message: 'ID de matrícula es requerido.' });

    try {
        const matricula = await MatriculaModel.getByIdWithDetails(id); // Usa el modelo para obtener el colegio_id
        if (!matricula) {
            return res.status(404).json({ message: 'Matrícula no encontrada.' });
        }
        req.params.id_colegio_param = matricula.id_colegio; // Adjunta el id_colegio al request para authorizeColegio
        next();
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};


// Obtener todas las matrículas
// Administrador Global ve todas. Administrador de Colegio ve las de su colegio.
// Alumno ve sus propias matrículas.
router.get(
    '/',
    authenticateToken,
    authorizeRoles('Administrador Global', 'Administrador Colegio', 'Alumno'),
    async (req, res, next) => {
        if (req.user.role === 'Administrador Colegio' && req.user.colegioId) {
            try {
                const matriculasDelColegio = await MatriculaModel.getMatriculasByColegioId(req.user.colegioId);
                return res.status(200).json(matriculasDelColegio);
            } catch (error) {
                return res.status(500).json({ message: 'Error al filtrar matrículas por colegio: ' + error.message });
            }
        }
        if (req.user.role === 'Alumno' && req.user.personaId) {
            try {
                const propiasMatriculas = await MatriculaModel.getMatriculasByPersonaId(req.user.personaId);
                return res.status(200).json(propiasMatriculas);
            } catch (error) {
                return res.status(500).json({ message: 'Error al obtener matrículas propias: ' + error.message });
            }
        }
        next(); // Si es Administrador Global, pasa al controlador general
    },
    matriculaController.getAllMatriculas // Se ejecutará solo para Admin Global
);

// Obtener una matrícula por ID
router.get(
    '/:id',
    authenticateToken,
    authorizeRoles('Administrador Global', 'Administrador Colegio', 'Alumno'),
    getColegioIdFromMatricula, // Obtiene el id_colegio de la matrícula
    // authorizeColegio, // Este middleware ya está en el flujo
    (req, res, next) => {
        // Lógica de autorización adicional para Alumnos (solo puede ver las suyas)
        if (req.user.role === 'Alumno') {
            // Verificar si el id_persona de la matrícula coincide con el id_persona del usuario logueado
            if (req.params.id_colegio_param === req.user.colegioId && req.user.personaId === req.params.id_persona) { // id_persona aquí viene del modelo.getByIdWithDetails
                // El controlador ya obtiene la matrícula, aquí solo se valida el permiso
                next();
            } else {
                return res.status(403).json({ message: 'No tiene permisos para ver esta matrícula.' });
            }
        } else {
            next(); // Para Admin Global y Admin Colegio, se aplica authorizeColegio.
        }
    },
    matriculaController.getMatriculaById
);

// Crear una nueva matrícula
router.post(
    '/',
    authenticateToken,
    authorizeRoles('Administrador Global', 'Administrador Colegio'),
    // Lógica específica para Admin Colegio para asegurar que el grupo y la persona sean de su colegio
    async (req, res, next) => {
        if (req.user.role === 'Administrador Colegio' && req.user.colegioId) {
            const { id_persona, id_grupo_clase } = req.body;

            // Validar que el grupo pertenezca al colegio del admin
            const grupo = await GrupoClaseModel.getByIdWithDetails(id_grupo_clase);
            if (!grupo || grupo.id_colegio !== req.user.colegioId) {
                return res.status(403).json({ message: 'El grupo/clase no pertenece a su colegio.' });
            }
            // Opcional: Validar que la persona (alumno) ya esté asociada a su colegio, si se maneja esa asociación.
            // Actualmente, el alumno se asocia a un colegio vía la matrícula.
        }
        next();
    },
    matriculaFileUpload,
    matriculaController.createMatricula
);

// Actualizar una matrícula
router.put(
    '/:id',
    authenticateToken,
    authorizeRoles('Administrador Global', 'Administrador Colegio'),
    getColegioIdFromMatricula, // Obtiene el id_colegio de la matrícula
    // authorizeColegio, // Este middleware ya está en el flujo
    // Lógica adicional para Admin Colegio si intenta cambiar FKs
    async (req, res, next) => {
        if (req.user.role === 'Administrador Colegio' && req.user.colegioId) {
            const { id_persona, id_grupo_clase } = req.body;
            // Si cambia id_grupo_clase, verificar que el nuevo grupo sea de su colegio
            if (id_grupo_clase) {
                const newGrupo = await GrupoClaseModel.getByIdWithDetails(id_grupo_clase);
                if (!newGrupo || newGrupo.id_colegio !== req.user.colegioId) {
                    return res.status(403).json({ message: 'El nuevo grupo/clase no pertenece a su colegio.' });
                }
            }
            // Opcional: Si cambia id_persona, verificar que la nueva persona (alumno) esté en su colegio.
        }
        next();
    },
    matriculaFileUpload,
    matriculaController.updateMatricula
);

// Eliminar una matrícula
router.delete(
    '/:id',
    authenticateToken,
    authorizeRoles('Administrador Global', 'Administrador Colegio'),
    getColegioIdFromMatricula, // Obtiene el id_colegio de la matrícula
    // authorizeColegio, // Este middleware ya está en el flujo
    matriculaController.deleteMatricula
);

module.exports = router;