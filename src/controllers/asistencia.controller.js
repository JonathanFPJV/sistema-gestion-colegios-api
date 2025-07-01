const AsistenciaService = require('../services/asistencia.service');
const MatriculaModel = require('../models/Matricula.model');     // Para verificar alumno y colegio
const HorarioClaseModel = require('../models/HorarioClase.model'); // Para verificar colegio y grupo
const PersonaModel = require('../models/Persona.model');         // Para verificar registrador
const { uploadFileToCloudinary } = require('../utils/fileUpload.util'); // Para la subida de archivos

// Función auxiliar para procesar archivos específicos de la asistencia
const processAsistenciaFiles = async (files) => {
    let urls = {};
    if (files && files.url_parte_asistencia && files.url_parte_asistencia[0]) {
        urls.url_parte_asistencia = await uploadFileToCloudinary(files.url_parte_asistencia[0].buffer, 'asistencias/partes');
    }
    return urls;
};

const getAllAsistencias = async (req, res) => {
    try {
        let asistencias;
        // La lógica para filtrar por colegio o rol se manejará en el middleware de ruta.
        if (req.user.role === 'Administrador Colegio' && req.user.colegioId) {
            asistencias = await AsistenciaService.asistenciaModel.getAsistenciasByColegioId(req.user.colegioId); // Método en el modelo
        } else if (req.user.role === 'Docente' && req.user.personaId) {
            // Un docente solo puede ver las asistencias que él registró o las de los grupos donde dicta
            asistencias = await AsistenciaService.asistenciaModel.getAsistenciasByRegistradorPersonaId(req.user.personaId);
            // Opcional: También obtener asistencias de sus propios grupos, si el requisito lo pide.
        } else if (req.user.role === 'Alumno' && req.user.personaId) {
            // Un alumno solo puede ver sus propias asistencias
            asistencias = await AsistenciaService.asistenciaModel.getAsistenciasByAlumnoPersonaId(req.user.personaId);
        } else {
            asistencias = await AsistenciaService.getAllAsistencias(); // Solo Admin Global ve todos
        }
        res.status(200).json(asistencias);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getAsistenciaById = async (req, res) => {
    try {
        const { id } = req.params;
        const asistencia = await AsistenciaService.getAsistenciaById(id);
        res.status(200).json(asistencia);
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
};

const createAsistencia = async (req, res) => {
    try {
        const { body, files } = req;
        const { id_matricula, id_horario_clase, registrado_por_persona_id } = body;

        // Validaciones de autorización y consistencia de colegio
        // Solo un Docente o Administrador puede crear asistencias
        if (req.user.role === 'Docente' && req.user.personaId) {
            // El docente que registra debe ser el mismo que el usuario logueado
            if (registrado_por_persona_id !== req.user.personaId) {
                return res.status(403).json({ message: 'No tiene permisos para registrar asistencias por otra persona.' });
            }
            // Validar que el horario de clase y la matrícula corresponden a su colegio
            const horario = await HorarioClaseModel.getByIdWithDetails(id_horario_clase);
            if (!horario || horario.docente_persona_id !== req.user.personaId) { // Es el docente de este horario?
                 return res.status(403).json({ message: 'No tiene permisos para registrar asistencias en este horario.' });
            }
            const matricula = await MatriculaModel.getByIdWithDetails(id_matricula);
            if (!matricula || matricula.colegio_id !== horario.colegio_id) { // Matricula y Horario del mismo colegio
                return res.status(403).json({ message: 'La matrícula o el horario no pertenecen al mismo colegio.' });
            }
        } else if (req.user.role === 'Administrador Colegio' && req.user.colegioId) {
            // Un Admin Colegio solo puede crear asistencias para su colegio
            const horario = await HorarioClaseModel.getByIdWithDetails(id_horario_clase);
            if (!horario || horario.colegio_id !== req.user.colegioId) {
                return res.status(403).json({ message: 'El horario de clase no pertenece a su colegio.' });
            }
            const matricula = await MatriculaModel.getByIdWithDetails(id_matricula);
            if (!matricula || matricula.colegio_id !== req.user.colegioId) {
                return res.status(403).json({ message: 'La matrícula no pertenece a su colegio.' });
            }
        } else if (req.user.role === 'Administrador Global') {
            // Admin Global puede hacer todo
        } else {
            return res.status(403).json({ message: 'No tiene permisos para crear registros de asistencia.' });
        }


        const fileUrls = await processAsistenciaFiles(files);
        const asistenciaData = { ...body, ...fileUrls };

        const newAsistencia = await AsistenciaService.createAsistencia(asistenciaData);
        res.status(201).json(newAsistencia);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const updateAsistencia = async (req, res) => {
    try {
        const { id } = req.params;
        const { body, files } = req;

        // Validaciones de autorización y consistencia de colegio
        if (req.user.role === 'Docente' && req.user.personaId) {
            const asistenciaToUpdate = await AsistenciaService.getAsistenciaById(id);
            if (!asistenciaToUpdate || asistenciaToUpdate.registrador_id_persona !== req.user.personaId) {
                return res.status(403).json({ message: 'No tiene permisos para actualizar esta asistencia (no fue registrada por usted).' });
            }
            // Si cambia FKs, verificar que sigan siendo de su colegio/sus clases.
            if (body.id_horario_clase) {
                const newHorario = await HorarioClaseModel.getByIdWithDetails(body.id_horario_clase);
                if (!newHorario || newHorario.docente_persona_id !== req.user.personaId) { // Nuevo horario le pertenece?
                    return res.status(403).json({ message: 'No tiene permisos para actualizar a este horario.' });
                }
            }
        } else if (req.user.role === 'Administrador Colegio' && req.user.colegioId) {
            const asistenciaToUpdate = await AsistenciaService.getAsistenciaById(id);
            if (!asistenciaToUpdate || asistenciaToUpdate.colegio_id !== req.user.colegioId) {
                return res.status(403).json({ message: 'No tiene permisos para actualizar asistencias de este colegio.' });
            }
            // Si cambia FKs, verificar que las nuevas FKs sean de su colegio
            if (body.id_horario_clase) {
                const newHorario = await HorarioClaseModel.getByIdWithDetails(body.id_horario_clase);
                if (!newHorario || newHorario.colegio_id !== req.user.colegioId) {
                    return res.status(403).json({ message: 'El nuevo horario de clase no pertenece a su colegio.' });
                }
            }
            if (body.id_matricula) {
                const newMatricula = await MatriculaModel.getByIdWithDetails(body.id_matricula);
                if (!newMatricula || newMatricula.colegio_id !== req.user.colegioId) {
                    return res.status(403).json({ message: 'La nueva matrícula no pertenece a su colegio.' });
                }
            }
        } else if (req.user.role === 'Administrador Global') {
            // Admin Global puede actualizar cualquier asistencia
        } else {
            return res.status(403).json({ message: 'No tiene permisos para actualizar registros de asistencia.' });
        }

        const fileUrls = await processAsistenciaFiles(files);
        const asistenciaData = { ...body, ...fileUrls };

        const updated = await AsistenciaService.updateAsistencia(id, asistenciaData);
        res.status(200).json({ message: 'Registro de asistencia actualizado exitosamente.', data: updated });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const deleteAsistencia = async (req, res) => {
    try {
        const { id } = req.params;

        // Validaciones de autorización y consistencia de colegio
        if (req.user.role === 'Docente' && req.user.personaId) {
            const asistenciaToDelete = await AsistenciaService.getAsistenciaById(id);
            if (!asistenciaToDelete || asistenciaToDelete.registrador_id_persona !== req.user.personaId) {
                return res.status(403).json({ message: 'No tiene permisos para eliminar esta asistencia (no fue registrada por usted).' });
            }
        } else if (req.user.role === 'Administrador Colegio' && req.user.colegioId) {
            const asistenciaToDelete = await AsistenciaService.getAsistenciaById(id);
            if (!asistenciaToDelete || asistenciaToDelete.colegio_id !== req.user.colegioId) {
                return res.status(403).json({ message: 'No tiene permisos para eliminar asistencias de este colegio.' });
            }
        } else if (req.user.role === 'Administrador Global') {
            // Admin Global puede eliminar cualquier asistencia
        } else {
            return res.status(403).json({ message: 'No tiene permisos para eliminar registros de asistencia.' });
        }

        const deleted = await AsistenciaService.deleteAsistencia(id);
        res.status(200).json({ message: 'Registro de asistencia eliminado exitosamente.', deleted: deleted });
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
};

module.exports = {
    getAllAsistencias,
    getAsistenciaById,
    createAsistencia,
    updateAsistencia,
    deleteAsistencia
};