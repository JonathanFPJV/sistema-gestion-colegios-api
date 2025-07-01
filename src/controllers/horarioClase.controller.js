const HorarioClaseService = require('../services/horarioClase.service');
const GrupoClaseModel = require('../models/GrupoClase.model'); // Para verificar la pertenencia a un colegio
const DocenteCursoModel = require('../models/DocenteCurso.model'); // Para verificar la pertenencia a un colegio

const getAllHorariosClases = async (req, res) => {
    try {
        // La lógica para filtrar por colegio se manejará en el middleware de ruta.
        let horarios;
        if (req.user.role === 'Administrador Colegio' && req.user.colegioId) {
            // Si es Admin Colegio, solo se le muestran los horarios de su colegio
            horarios = await HorarioClaseService.horarioClaseModel.getHorariosByColegioId(req.user.colegioId); // Método en el modelo
        } else if (req.user.role === 'Docente' && req.user.personaId) {
            // Un docente solo puede ver sus propios horarios
            horarios = await HorarioClaseService.horarioClaseModel.getHorariosByDocentePersonaId(req.user.personaId);
        } else {
            horarios = await HorarioClaseService.getAllHorariosClases(); // Solo Admin Global ve todos
        }
        res.status(200).json(horarios);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getHorarioClaseById = async (req, res) => {
    try {
        const { id } = req.params;
        const horario = await HorarioClaseService.getHorarioClaseById(id);
        res.status(200).json(horario);
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
};

const createHorarioClase = async (req, res) => {
    try {
        const { body } = req;
        const { id_grupo_clase, id_docente_curso } = body;

        // Validaciones de autorización y consistencia de colegio para Admin Colegio
        if (req.user.role === 'Administrador Colegio' && req.user.colegioId) {
            const grupo = await GrupoClaseModel.getByIdWithDetails(id_grupo_clase);
            if (!grupo || grupo.id_colegio !== req.user.colegioId) {
                return res.status(403).json({ message: 'El grupo/clase no pertenece a su colegio.' });
            }
            const docenteCurso = await DocenteCursoModel.getByIdWithDetails(id_docente_curso);
            if (!docenteCurso || docenteCurso.colegio_id !== req.user.colegioId) {
                return res.status(403).json({ message: 'La asignación docente-curso no pertenece a su colegio.' });
            }
        }
        // Admin Global no tiene estas restricciones de colegio en la creación.

        const newHorario = await HorarioClaseService.createHorarioClase(body);
        res.status(201).json(newHorario);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const updateHorarioClase = async (req, res) => {
    try {
        const { id } = req.params;
        const { body } = req;

        // Validaciones de autorización y consistencia de colegio para Admin Colegio
        if (req.user.role === 'Administrador Colegio' && req.user.colegioId) {
            const horarioToUpdate = await HorarioClaseService.getHorarioClaseById(id);
            if (!horarioToUpdate || horarioToUpdate.colegio_id !== req.user.colegioId) {
                return res.status(403).json({ message: 'No tiene permisos para actualizar horarios de este colegio.' });
            }

            // Si se cambia id_grupo_clase o id_docente_curso, verificar que sean del mismo colegio
            if (body.id_grupo_clase && body.id_grupo_clase !== horarioToUpdate.id_grupo_clase) {
                const newGrupo = await GrupoClaseModel.getByIdWithDetails(body.id_grupo_clase);
                if (!newGrupo || newGrupo.id_colegio !== req.user.colegioId) {
                    return res.status(403).json({ message: 'El nuevo grupo/clase no pertenece a su colegio.' });
                }
            }
            if (body.id_docente_curso && body.id_docente_curso !== horarioToUpdate.id_docente_curso) {
                const newDocenteCurso = await DocenteCursoModel.getByIdWithDetails(body.id_docente_curso);
                if (!newDocenteCurso || newDocenteCurso.colegio_id !== req.user.colegioId) {
                    return res.status(403).json({ message: 'La nueva asignación docente-curso no pertenece a su colegio.' });
                }
            }
        }

        const updated = await HorarioClaseService.updateHorarioClase(id, body);
        res.status(200).json({ message: 'Horario de clase actualizado exitosamente.', data: updated });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const deleteHorarioClase = async (req, res) => {
    try {
        const { id } = req.params;

        // Validaciones de autorización y consistencia de colegio para Admin Colegio
        if (req.user.role === 'Administrador Colegio' && req.user.colegioId) {
            const horarioToDelete = await HorarioClaseService.getHorarioClaseById(id);
            if (!horarioToDelete || horarioToDelete.colegio_id !== req.user.colegioId) {
                return res.status(403).json({ message: 'No tiene permisos para eliminar horarios de este colegio.' });
            }
        }

        const deleted = await HorarioClaseService.deleteHorarioClase(id);
        res.status(200).json({ message: 'Horario de clase eliminado exitosamente.', deleted: deleted });
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
};

module.exports = {
    getAllHorariosClases,
    getHorarioClaseById,
    createHorarioClase,
    updateHorarioClase,
    deleteHorarioClase
};