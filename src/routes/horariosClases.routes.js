const express = require('express');
const horarioClaseController = require('../controllers/horarioClase.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { authorizeRoles } = require('../middlewares/permission.middleware');
const HorarioClaseModel = require('../models/HorarioClase.model'); // Para helper de autorización


const router = express.Router();

// Helper para obtener el id_colegio del horario a través del grupo.
const getColegioIdFromHorario = async (req, res, next) => {
    const { id } = req.params; // id_horario
    if (!id) return res.status(400).json({ message: 'ID de horario es requerido.' });

    try {
        const horario = await HorarioClaseModel.getByIdWithDetails(id); // Usa el modelo para obtener el colegio_id
        if (!horario) {
            return res.status(404).json({ message: 'Horario de clase no encontrado.' });
        }
        req.params.id_colegio_param = horario.id_colegio; // Adjunta el id_colegio al request para authorizeColegio
        next();
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};


// Obtener todos los horarios de clases
// Administrador Global ve todos. Administrador de Colegio ve los de su colegio.
// Docente ve sus propios horarios. Alumno puede ver horarios de su grupo.
router.get(
    '/',
    authenticateToken,
    authorizeRoles('Administrador Global', 'Administrador Colegio', 'Docente', 'Alumno'),
    async (req, res, next) => {
        if (req.user.role === 'Administrador Colegio' && req.user.colegioId) {
            try {
                const horariosDelColegio = await HorarioClaseModel.getHorariosByColegioId(req.user.colegioId);
                return res.status(200).json(horariosDelColegio);
            } catch (error) {
                return res.status(500).json({ message: 'Error al filtrar horarios por colegio: ' + error.message });
            }
        }
        if (req.user.role === 'Docente' && req.user.personaId) {
            try {
                const propiosHorarios = await HorarioClaseModel.getHorariosByDocentePersonaId(req.user.personaId);
                return res.status(200).json(propiosHorarios);
            } catch (error) {
                return res.status(500).json({ message: 'Error al obtener horarios propios: ' + error.message });
            }
        }
        if (req.user.role === 'Alumno' && req.user.personaId) {
            // Un alumno debe ver los horarios de su grupo de clase.
            // Esto requerirá una consulta más compleja para obtener el id_grupo_clase del alumno.
            // Para simplificar, asumimos que el payload del alumno tiene id_grupo_clase_actual
            // O se hace una consulta aquí.
            const [matriculas] = await HorarioClaseModel.pool.query(`
                SELECT id_grupo_clase FROM Matricula WHERE id_persona = ? AND anio_lectivo = YEAR(CURDATE()) LIMIT 1
            `, [req.user.personaId]);
            if (matriculas.length > 0) {
                const horariosDelGrupo = await HorarioClaseModel.getHorariosByGrupoClaseId(matriculas[0].id_grupo_clase);
                return res.status(200).json(horariosDelGrupo);
            } else {
                return res.status(404).json({ message: 'Alumno no matriculado en un grupo para el año actual.' });
            }
        }
        next(); // Si es Administrador Global, pasa al controlador general
    },
    horarioClaseController.getAllHorariosClases // Se ejecutará solo para Admin Global
);

// Obtener un horario de clase por ID
router.get(
    '/:id',
    authenticateToken,
    authorizeRoles('Administrador Global', 'Administrador Colegio', 'Docente', 'Alumno'),
    getColegioIdFromHorario, // Obtiene el id_colegio del horario
    // authorizeColegio, // Este middleware ya está en el flujo
    (req, res, next) => {
        // Lógica de autorización adicional para Docentes y Alumnos
        if (req.user.role === 'Docente') {
            // Un docente solo puede ver horarios si es el docente asignado o si es un horario de su colegio.
            // Para ser más estricto, verificar si req.user.personaId es el docente de este horario.
            if (req.params.id_colegio_param === req.user.colegioId) { // Asegura que es del mismo colegio
                next();
            } else {
                return res.status(403).json({ message: 'No tiene permisos para ver este horario.' });
            }
        } else if (req.user.role === 'Alumno') {
            // Un alumno solo puede ver los horarios de su grupo matriculado.
            // Se debe verificar si este horario pertenece al id_grupo_clase donde el alumno está matriculado.
            // Asumiendo que el JWT del alumno tiene id_grupo_clase, o consultar aquí.
            if (req.params.id_colegio_param === req.user.colegioId) { // Primer filtro de colegio
                 // Segunda parte de la validación: ¿este horario es de su grupo?
                 HorarioClaseModel.pool.query(`
                     SELECT M.id_matricula FROM Matricula M
                     WHERE M.id_persona = ? AND M.id_grupo_clase = (SELECT id_grupo_clase FROM HorariosClases WHERE id_horario = ?)
                 `, [req.user.personaId, req.params.id]).then(([rows]) => {
                     if (rows.length > 0) {
                         next();
                     } else {
                         return res.status(403).json({ message: 'No tiene permisos para ver este horario (no es de su grupo).' });
                     }
                 }).catch(err => res.status(500).json({ message: 'Error de autorización: ' + err.message }));
             } else {
                 return res.status(403).json({ message: 'No tiene permisos para ver horarios de otros colegios.' });
             }
        } else {
            next(); // Para Admin Global y Admin Colegio, se aplica authorizeColegio.
        }
    },
    horarioClaseController.getHorarioClaseById
);

// Crear un nuevo horario de clase
router.post(
    '/',
    authenticateToken,
    authorizeRoles('Administrador Global', 'Administrador Colegio'),
    // Lógica específica para Admin Colegio para asegurar que el grupo y docente/curso sean de su colegio
    async (req, res, next) => {
        if (req.user.role === 'Administrador Colegio' && req.user.colegioId) {
            const { id_grupo_clase, id_docente_curso } = req.body;

            const grupo = await GrupoClaseModel.getByIdWithDetails(id_grupo_clase);
            if (!grupo || grupo.id_colegio !== req.user.colegioId) {
                return res.status(403).json({ message: 'El grupo/clase no pertenece a su colegio.' });
            }
            const docenteCurso = await DocenteCursoModel.getByIdWithDetails(id_docente_curso);
            if (!docenteCurso || docenteCurso.colegio_id !== req.user.colegioId) {
                return res.status(403).json({ message: 'La asignación docente-curso no pertenece a su colegio.' });
            }
        }
        next();
    },
    horarioClaseController.createHorarioClase
);

// Actualizar un horario de clase
router.put(
    '/:id',
    authenticateToken,
    authorizeRoles('Administrador Global', 'Administrador Colegio'),
    getColegioIdFromHorario, // Obtiene el id_colegio del horario
    // authorizeColegio, // Este middleware ya está en la cadena
    // Lógica adicional para Admin Colegio si intenta cambiar FKs
    async (req, res, next) => {
        if (req.user.role === 'Administrador Colegio' && req.user.colegioId) {
            const { id_grupo_clase, id_docente_curso } = req.body;
            // Si cambia id_grupo_clase, verificar que el nuevo grupo sea de su colegio
            if (id_grupo_clase) {
                const newGrupo = await GrupoClaseModel.getByIdWithDetails(id_grupo_clase);
                if (!newGrupo || newGrupo.id_colegio !== req.user.colegioId) {
                    return res.status(403).json({ message: 'El nuevo grupo/clase no pertenece a su colegio.' });
                }
            }
            // Si cambia id_docente_curso, verificar que la nueva asignación sea de su colegio
            if (id_docente_curso) {
                const newDocenteCurso = await DocenteCursoModel.getByIdWithDetails(id_docente_curso);
                if (!newDocenteCurso || newDocenteCurso.colegio_id !== req.user.colegioId) {
                    return res.status(403).json({ message: 'La nueva asignación docente-curso no pertenece a su colegio.' });
                }
            }
        }
        next();
    },
    horarioClaseController.updateHorarioClase
);

// Eliminar un horario de clase
router.delete(
    '/:id',
    authenticateToken,
    authorizeRoles('Administrador Global', 'Administrador Colegio'),
    getColegioIdFromHorario, // Obtiene el id_colegio del horario
    // authorizeColegio, // Este middleware ya está en la cadena
    horarioClaseController.deleteHorarioClase
);

module.exports = router;