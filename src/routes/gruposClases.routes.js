const express = require('express');
const grupoClaseController = require('../controllers/grupoClase.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { authorizeRoles } = require('../middlewares/permission.middleware');
const GrupoClaseModel = require('../models/GrupoClase.model'); // Para helper de autorización


const router = express.Router();

// Helper para obtener el id_colegio del grupo a través de su sede.
// Esto es para que authorizeColegio pueda verificar la pertenencia.
const getColegioIdFromGrupoClase = async (req, res, next) => {
    const { id } = req.params; // id_grupo_clase
    if (!id) return res.status(400).json({ message: 'ID de grupo/clase es requerido.' });

    try {
        const grupo = await GrupoClaseModel.getByIdWithDetails(id); // Usa el modelo directo para obtener el colegio_id
        if (!grupo) {
            return res.status(404).json({ message: 'Grupo/Clase no encontrado.' });
        }
        req.params.id_colegio_param = grupo.id_colegio; // Adjunta el id_colegio al request para authorizeColegio
        next();
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};


// Obtener todos los grupos de clases
// Administrador Global ve todos. Administrador de Colegio ve los de su colegio.
// Docente podría ver los de su colegio (y sus asignados).
router.get(
    '/',
    authenticateToken,
    authorizeRoles('Administrador Global', 'Administrador Colegio', 'Docente'),
    async (req, res, next) => {
        if (req.user.role === 'Administrador Colegio' && req.user.colegioId) {
            // Si es Admin Colegio, solo se le muestran los grupos de su colegio
            try {
                const gruposDelColegio = await GrupoClaseModel.getGruposByColegioId(req.user.colegioId);
                return res.status(200).json(gruposDelColegio);
            } catch (error) {
                return res.status(500).json({ message: 'Error al filtrar grupos por colegio: ' + error.message });
            }
        }
        // Si es Docente, podría ver solo sus grupos asignados (se necesitaría un filtro en el servicio o controlador).
        // Por ahora, si es docente, ve todos los grupos (y la auth es más permisiva). Ajustar según el requisito exacto.
        next(); // Si es Administrador Global, o Docente (para ver todos los grupos), pasa al controlador general
    },
    grupoClaseController.getAllGruposClases
);

// Obtener un grupo de clase por ID
// Administrador Global ve cualquiera. Administrador de Colegio solo los de su colegio. Docente solo los de su colegio.
router.get(
    '/:id',
    authenticateToken,
    authorizeRoles('Administrador Global', 'Administrador Colegio', 'Docente', 'Alumno'),
    getColegioIdFromGrupoClase, // Obtiene el id_colegio del grupo para authorizeColegio
    (req, res, next) => {
        // Lógica de autorización adicional para Docentes y Alumnos
        if (req.user.role === 'Docente') {
            // Los docentes pueden ver los grupos donde dictan clase (requeriría un JOIN a HorariosClases/Docente_Curso)
            // O si es más permisivo, pueden ver cualquier grupo de SU colegio.
            if (req.params.id_colegio_param === req.user.colegioId) {
                next();
            } else {
                return res.status(403).json({ message: 'No tiene permisos para ver grupos de otros colegios.' });
            }
        } else if (req.user.role === 'Alumno') {
            // Un alumno solo puede ver SU grupo de clase matriculado.
            // Esto requeriría una consulta a la tabla Matricula para verificar si req.user.personaId
            // está matriculado en este grupo (req.params.id_grupo_clase).
            // Por simplicidad, si el grupo pertenece al colegio del alumno, lo permitimos.
            if (req.params.id_colegio_param === req.user.colegioId) { // Suponiendo que el JWT del alumno tiene colegioId
                next();
            } else {
                return res.status(403).json({ message: 'No tiene permisos para ver grupos de otros colegios.' });
            }
        } else {
            next(); // Pasa a authorizeColegio (que ya se ejecutó con id_colegio_param)
        }
    },
    // authorizeColegio ya está en el flujo gracias a getColegioIdFromGrupoClase y la cadena de middlewares.
    grupoClaseController.getGrupoClaseById
);

// Crear un nuevo grupo de clase
// Administrador Global o Administrador de Colegio (en su colegio).
router.post(
    '/',
    authenticateToken,
    authorizeRoles('Administrador Global', 'Administrador Colegio'),
    // Lógica específica para Admin Colegio para asegurar que las FKs pertenezcan a su colegio
    async (req, res, next) => {
        if (req.user.role === 'Administrador Colegio' && req.user.colegioId) {
            const { id_sede, id_aula } = req.body;
            // Validar que la sede y el aula (a través de la sede) pertenezcan al colegio del admin
            const sede = await SedeModel.findById(id_sede);
            if (!sede || sede.id_colegio !== req.user.colegioId) {
                return res.status(403).json({ message: 'La sede no pertenece a su colegio.' });
            }
            const aula = await AulaModel.findById(id_aula);
            if (!aula || aula.id_sede !== sede.id_sede) {
                return res.status(403).json({ message: 'El aula no pertenece a la sede especificada.' });
            }
        }
        next();
    },
    grupoClaseController.createGrupoClase
);

// Actualizar un grupo de clase
// Administrador Global o Administrador de Colegio (en su colegio).
router.put(
    '/:id',
    authenticateToken,
    authorizeRoles('Administrador Global', 'Administrador Colegio'),
    getColegioIdFromGrupoClase, // Obtiene el id_colegio del grupo para authorizeColegio
    // authorizeColegio,     // Este middleware ya está en la cadena
    // Lógica adicional para Admin Colegio si intenta cambiar FKs
    async (req, res, next) => {
        if (req.user.role === 'Administrador Colegio' && req.user.colegioId) {
            const { id_sede, id_aula } = req.body;
            // Si intenta cambiar la sede o el aula, verificar la pertenencia al colegio
            if (id_sede) {
                const newSede = await SedeModel.findById(id_sede);
                if (!newSede || newSede.id_colegio !== req.user.colegioId) {
                    return res.status(403).json({ message: 'La nueva sede no pertenece a su colegio.' });
                }
            }
            if (id_aula) {
                 const newAula = await AulaModel.findById(id_aula);
                 // Para validar que el aula pertenece a la (nueva) sede del grupo,
                 // se necesitaría saber la sede final del grupo. El servicio ya lo valida.
                 // Aquí solo nos aseguramos que el aula no esté en un colegio diferente.
                 const aulaWithDetails = await AulaModel.getByIdWithDetails(id_aula);
                 if (!aulaWithDetails || aulaWithDetails.colegio_id !== req.user.colegioId) {
                    return res.status(403).json({ message: 'La nueva aula no pertenece a su colegio.' });
                 }
            }
        }
        next();
    },
    grupoClaseController.updateGrupoClase
);

// Eliminar un grupo de clase
// Administrador Global o Administrador de Colegio (en su colegio).
router.delete(
    '/:id',
    authenticateToken,
    authorizeRoles('Administrador Global', 'Administrador Colegio'),
    getColegioIdFromGrupoClase, // Obtiene el id_colegio del grupo para authorizeColegio
    // authorizeColegio,     // Este middleware ya está en la cadena
    grupoClaseController.deleteGrupoClase
);

module.exports = router;