const AsignacionCursoAnoService = require('../services/asignacionCursoAno.service');
const CursoModel = require('../models/Curso.model'); // Para verificar la pertenencia a un colegio
const AnosAcademicosModel = require('../models/AnosAcademicos.model'); // Para obtener detalles del año

const getAllAsignaciones = async (req, res) => {
    try {
        // La lógica para filtrar por colegio se manejará en el middleware de ruta.
        let asignaciones;
        if (req.user.role === 'Administrador Colegio' && req.user.colegioId) {
            // Si es Admin Colegio, solo se le muestran las asignaciones de cursos de su colegio
            asignaciones = await AsignacionCursoAnoService.asignacionCursoAnoModel.getAsignacionesByColegioId(req.user.colegioId); // Método en el modelo
        } else {
            asignaciones = await AsignacionCursoAnoService.getAllAsignaciones(); // Solo Admin Global ve todos
        }
        res.status(200).json(asignaciones);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getAsignacionById = async (req, res) => {
    try {
        const { id } = req.params;
        const asignacion = await AsignacionCursoAnoService.getAsignacionById(id);
        res.status(200).json(asignacion);
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
};

const createAsignacion = async (req, res) => {
    try {
        const { body } = req;

        // Si el usuario es 'Administrador Colegio', verificar que el curso pertenezca a su colegio
        if (req.user.role === 'Administrador Colegio' && req.user.colegioId) {
            const curso = await CursoModel.findById(body.id_curso);
            if (!curso || curso.id_colegio !== req.user.colegioId) {
                return res.status(403).json({ message: 'No tiene permisos para asignar cursos que no pertenecen a su colegio.' });
            }
            // AnosAcademicos son genéricos, así que no hay chequeo de colegio para ellos.
        }

        const newAsignacion = await AsignacionCursoAnoService.createAsignacion(body);
        res.status(201).json(newAsignacion);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const updateAsignacion = async (req, res) => {
    try {
        const { id } = req.params;
        const { body } = req;

        // Si el usuario es 'Administrador Colegio', verificar que la asignación pertenezca a su colegio
        if (req.user.role === 'Administrador Colegio' && req.user.colegioId) {
            const asignacionToUpdate = await AsignacionCursoAnoService.getAsignacionById(id);
            if (!asignacionToUpdate || asignacionToUpdate.colegio_id !== req.user.colegioId) {
                return res.status(403).json({ message: 'No tiene permisos para actualizar asignaciones de este colegio.' });
            }
            // Si intenta cambiar id_curso, verificar que el nuevo curso pertenezca a su colegio
            if (body.id_curso && body.id_curso !== asignacionToUpdate.id_curso) {
                const newCurso = await CursoModel.findById(body.id_curso);
                if (!newCurso || newCurso.id_colegio !== req.user.colegioId) {
                    return res.status(403).json({ message: 'No puede reasignar a un curso que no pertenece a su colegio.' });
                }
            }
        }

        const updated = await AsignacionCursoAnoService.updateAsignacion(id, body);
        res.status(200).json({ message: 'Asignación de curso a año actualizada exitosamente.', data: updated });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const deleteAsignacion = async (req, res) => {
    try {
        const { id } = req.params;

        // Si el usuario es 'Administrador Colegio', verificar que la asignación pertenezca a su colegio
        if (req.user.role === 'Administrador Colegio' && req.user.colegioId) {
            const asignacionToDelete = await AsignacionCursoAnoService.getAsignacionById(id);
            if (!asignacionToDelete || asignacionToDelete.colegio_id !== req.user.colegioId) {
                return res.status(403).json({ message: 'No tiene permisos para eliminar asignaciones de este colegio.' });
            }
        }

        const deleted = await AsignacionCursoAnoService.deleteAsignacion(id);
        res.status(200).json({ message: 'Asignación de curso a año eliminada exitosamente.', deleted: deleted });
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
};

module.exports = {
    getAllAsignaciones,
    getAsignacionById,
    createAsignacion,
    updateAsignacion,
    deleteAsignacion
};