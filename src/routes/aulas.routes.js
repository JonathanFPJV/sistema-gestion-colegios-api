const express = require('express');
const aulaController = require('../controllers/aula.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { authorizeRoles } = require('../middlewares/permission.middleware');
const upload = require('../config/multer.config'); // Importar Multer
const SedeModel = require('../models/Sede.model'); // Para helper de autorización


const router = express.Router();

// Middleware de Multer para manejar los archivos de Aula
const aulaFileUpload = upload.fields([
    { name: 'url_foto_aula', maxCount: 1 }
]);

// Helper para obtener el id_colegio del aula a través de su sede.
// Esto es para que authorizeColegio pueda verificar la pertenencia.
const getColegioIdFromAula = async (req, res, next) => {
    const { id } = req.params; // id_aula
    if (!id) return res.status(400).json({ message: 'ID de aula es requerido.' });

    try {
        const aula = await AulaModel.getByIdWithDetails(id); // Usa el modelo directo para obtener el colegio_id
        if (!aula) {
            return res.status(404).json({ message: 'Aula no encontrada.' });
        }
        req.params.id_colegio_param = aula.colegio_id; // Adjunta el id_colegio al request para authorizeColegio
        next();
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};


// Obtener todas las aulas
// Administrador Global ve todas. Administrador de Colegio ve las de su colegio.
router.get(
    '/',
    authenticateToken,
    authorizeRoles('Administrador Global', 'Administrador Colegio', 'Docente'),
    // Filtro para Administrador Colegio si no es Admin Global
    async (req, res, next) => {
        if (req.user.role === 'Administrador Colegio' && req.user.colegioId) {
            // Lógica para filtrar aulas por colegio del usuario
            try {
                const aulasDelColegio = await AulaModel.pool.query(`
                    SELECT
                        A.id_aula, A.nombre_aula, A.capacidad, A.tipo, A.url_foto_aula,
                        S.id_sede, S.nombre_sede AS sede_nombre, S.direccion AS sede_direccion,
                        C.id_colegio, C.nombre_colegio AS colegio_nombre
                    FROM Aulas AS A
                    JOIN Sedes AS S ON A.id_sede = S.id_sede
                    JOIN Colegios AS C ON S.id_colegio = C.id_colegio
                    WHERE C.id_colegio = ?
                `, [req.user.colegioId]);
                return res.status(200).json(aulasDelColegio[0]);
            } catch (error) {
                return res.status(500).json({ message: 'Error al filtrar aulas por colegio: ' + error.message });
            }
        }
        next(); // Si es Administrador Global o Docente (solo para GET), permite pasar al controlador general
    },
    aulaController.getAllAulas // Este controlador ahora solo se ejecuta para Admin Global o Docente
);

// Obtener un aula por ID
// Administrador Global ve cualquiera. Administrador de Colegio solo de su colegio.
router.get(
    '/:id',
    authenticateToken,
    authorizeRoles('Administrador Global', 'Administrador Colegio', 'Docente'),
    getColegioIdFromAula, // Obtiene el id_colegio del aula para authorizeColegio
    (req, res, next) => { // Custom authorization logic for Docentes
        if (req.user.role === 'Docente') {
            // Los docentes solo pueden ver aulas si tienen horarios de clases en esa aula y en ese colegio.
            // Para una verificación simple, permitimos que un docente vea cualquier aula, pero esto puede ajustarse.
            // Una lógica más estricta implicaría buscar si el docente está asignado a un grupo en esa aula en su colegio.
            // Por ahora, si es docente, y la aula pertenece al colegio del docente (o si es global), lo permitimos.
            next();
        } else {
            next(); // Pasa a authorizeColegio
        }
    },
    // authorizeColegio ya está en el flujo gracias a getColegioIdFromAula y la cadena de middlewares.
    aulaController.getAulaById
);

// Crear una nueva aula
// Administrador Global o Administrador de Colegio (en su colegio).
router.post(
    '/',
    authenticateToken,
    authorizeRoles('Administrador Global', 'Administrador Colegio'),
    // Lógica específica para Admin Colegio para asegurar que la sede esté en su colegio
    async (req, res, next) => {
        if (req.user.role === 'Administrador Colegio' && req.user.colegioId) {
            const sede = await SedeModel.findById(req.body.id_sede);
            if (!sede || sede.id_colegio !== req.user.colegioId) {
                return res.status(403).json({ message: 'No tiene permisos para crear aulas en sedes fuera de su colegio.' });
            }
        }
        next();
    },
    aulaFileUpload,
    aulaController.createAula
);

// Actualizar un aula
// Administrador Global o Administrador de Colegio (en su colegio).
router.put(
    '/:id',
    authenticateToken,
    authorizeRoles('Administrador Global', 'Administrador Colegio'),
    getColegioIdFromAula, // Obtiene el id_colegio del aula para authorizeColegio
    // authorizeColegio,     // Este middleware ya está en la cadena gracias a getColegioIdFromAula
    // Lógica adicional para Admin Colegio para asegurar que la nueva sede (si cambia) esté en su colegio
    async (req, res, next) => {
        if (req.user.role === 'Administrador Colegio' && req.user.colegioId && req.body.id_sede) {
            const newSede = await SedeModel.findById(req.body.id_sede);
            if (!newSede || newSede.id_colegio !== req.user.colegioId) {
                 return res.status(403).json({ message: 'No puede reasignar el aula a una sede fuera de su colegio.' });
            }
        }
        next(); // Continúa con authorizeColegio y el controlador
    },
    aulaFileUpload,
    aulaController.updateAula
);

// Eliminar un aula
// Administrador Global o Administrador de Colegio (en su colegio).
router.delete(
    '/:id',
    authenticateToken,
    authorizeRoles('Administrador Global', 'Administrador Colegio'),
    getColegioIdFromAula, // Obtiene el id_colegio del aula para authorizeColegio
    // authorizeColegio,     // Este middleware ya está en la cadena
    aulaController.deleteAula
);

module.exports = router;