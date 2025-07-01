const DocenteCursoService = require('../services/docenteCurso.service');
const PersonaModel = require('../models/Persona.model'); // Para verificar el rol y colegio de la persona
const CursoModel = require('../models/Curso.model');     // Para verificar el colegio del curso
const RolModel = require('../models/Rol.model');         // Para obtener ID de rol 'Docente'
const UsuarioModel = require('../models/Usuario.model'); // Para obtener user.id_rol


const getAllDocenteCursos = async (req, res) => {
    try {
        // La lógica para filtrar por colegio se manejará en el middleware de ruta.
        let asignaciones;
        if (req.user.role === 'Administrador Colegio' && req.user.colegioId) {
            // Si es Admin Colegio, solo se le muestran las asignaciones de su colegio
            asignaciones = await DocenteCursoService.docenteCursoModel.getAsignacionesByColegioId(req.user.colegioId); // Método en el modelo
        } else {
            asignaciones = await DocenteCursoService.getAllDocenteCursos(); // Solo Admin Global ve todos
        }
        res.status(200).json(asignaciones);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getDocenteCursoById = async (req, res) => {
    try {
        const { id } = req.params;
        const asignacion = await DocenteCursoService.getDocenteCursoById(id);
        res.status(200).json(asignacion);
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
};

const createDocenteCurso = async (req, res) => {
    try {
        const { body } = req;
        const { id_persona, id_curso } = body;

        // Validaciones de autorización y consistencia de colegio
        if (req.user.role === 'Administrador Colegio' && req.user.colegioId) {
            const rolDocente = await RolModel.findByName('Docente');
            const targetUser = await UsuarioModel.findByField('id_persona', id_persona);
            if (!targetUser || targetUser.id_rol !== rolDocente.id_rol) {
                return res.status(400).json({ message: 'La persona asignada no tiene el rol de Docente.' });
            }

            // Obtener el colegio al que pertenece el docente
            const docenteColegioId = await PersonaModel.pool.query(`
                SELECT C.id_colegio
                FROM Docente_Curso DC
                JOIN Cursos CUR ON DC.id_curso = CUR.id_curso
                JOIN Colegios C ON CUR.id_colegio = C.id_colegio
                WHERE DC.id_persona = ?
                LIMIT 1
            `, [id_persona]);

            // Obtener el colegio al que pertenece el curso
            const curso = await CursoModel.findById(id_curso);
            if (!curso) {
                return res.status(400).json({ message: 'El curso especificado no existe.' });
            }

            if (docenteColegioId[0].length > 0 && docenteColegioId[0][0].id_colegio !== req.user.colegioId) {
                 return res.status(403).json({ message: 'El docente no pertenece a su colegio.' });
            }
            if (curso.id_colegio !== req.user.colegioId) {
                return res.status(403).json({ message: 'El curso no pertenece a su colegio.' });
            }
        }
        // Admin Global no tiene estas restricciones de colegio en la creación, solo el servicio valida existencia.

        const newAsignacion = await DocenteCursoService.createDocenteCurso(body);
        res.status(201).json(newAsignacion);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const updateDocenteCurso = async (req, res) => {
    try {
        const { id } = req.params;
        const { body } = req;

        // Si el usuario es 'Administrador Colegio', verificar que la asignación, docente y curso pertenezcan a su colegio
        if (req.user.role === 'Administrador Colegio' && req.user.colegioId) {
            const asignacionToUpdate = await DocenteCursoService.getDocenteCursoById(id);
            if (!asignacionToUpdate || asignacionToUpdate.colegio_id !== req.user.colegioId) {
                return res.status(403).json({ message: 'No tiene permisos para actualizar asignaciones de este colegio.' });
            }

            // Si se cambia id_persona, verificar que el nuevo docente sea de su colegio
            if (body.id_persona && body.id_persona !== asignacionToUpdate.id_persona) {
                const rolDocente = await RolModel.findByName('Docente');
                const newDocenteUser = await UsuarioModel.findByField('id_persona', body.id_persona);
                if (!newDocenteUser || newDocenteUser.id_rol !== rolDocente.id_rol) {
                    return res.status(400).json({ message: 'La nueva persona asignada no tiene el rol de Docente.' });
                }
                const newDocenteColegioId = await PersonaModel.pool.query(`
                    SELECT C.id_colegio
                    FROM Docente_Curso DC
                    JOIN Cursos CUR ON DC.id_curso = CUR.id_curso
                    JOIN Colegios C ON CUR.id_colegio = C.id_colegio
                    WHERE DC.id_persona = ?
                    LIMIT 1
                `, [body.id_persona]);
                if (newDocenteColegioId[0].length > 0 && newDocenteColegioId[0][0].id_colegio !== req.user.colegioId) {
                    return res.status(403).json({ message: 'El nuevo docente no pertenece a su colegio.' });
                }
            }

            // Si se cambia id_curso, verificar que el nuevo curso sea de su colegio
            if (body.id_curso && body.id_curso !== asignacionToUpdate.id_curso) {
                const newCurso = await CursoModel.findById(body.id_curso);
                if (!newCurso || newCurso.id_colegio !== req.user.colegioId) {
                    return res.status(403).json({ message: 'El nuevo curso no pertenece a su colegio.' });
                }
            }
        }

        const updated = await DocenteCursoService.updateDocenteCurso(id, body);
        res.status(200).json({ message: 'Asignación Docente-Curso actualizada exitosamente.', data: updated });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const deleteDocenteCurso = async (req, res) => {
    try {
        const { id } = req.params;

        // Si el usuario es 'Administrador Colegio', verificar que la asignación pertenezca a su colegio
        if (req.user.role === 'Administrador Colegio' && req.user.colegioId) {
            const asignacionToDelete = await DocenteCursoService.getDocenteCursoById(id);
            if (!asignacionToDelete || asignacionToDelete.colegio_id !== req.user.colegioId) {
                return res.status(403).json({ message: 'No tiene permisos para eliminar asignaciones de este colegio.' });
            }
        }

        const deleted = await DocenteCursoService.deleteDocenteCurso(id);
        res.status(200).json({ message: 'Asignación Docente-Curso eliminada exitosamente.', deleted: deleted });
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
};

module.exports = {
    getAllDocenteCursos,
    getDocenteCursoById,
    createDocenteCurso,
    updateDocenteCurso,
    deleteDocenteCurso
};