const NotaService = require('../services/nota.service');
const MatriculaModel = require('../models/Matricula.model');         // Para verificar colegio del alumno
const DocenteCursoModel = require('../models/DocenteCurso.model');     // Para verificar docente y curso
const { uploadFileToCloudinary } = require('../utils/fileUpload.util'); // Para la subida de archivos

// Función auxiliar para procesar archivos específicos de la nota
const processNotaFiles = async (files) => {
    let urls = {};
    if (files && files.url_examen_escaneado && files.url_examen_escaneado[0]) {
        urls.url_examen_escaneado = await uploadFileToCloudinary(files.url_examen_escaneado[0].buffer, 'notas/examenes');
    }
    return urls;
};

const getAllNotas = async (req, res) => {
    try {
        let notas;
        // La lógica para filtrar por colegio o rol se manejará en el middleware de ruta.
        if (req.user.role === 'Administrador Colegio' && req.user.colegioId) {
            notas = await NotaService.notaModel.getNotasByColegioId(req.user.colegioId);
        } else if (req.user.role === 'Docente' && req.user.personaId) {
            notas = await NotaService.notaModel.getNotasByDocentePersonaId(req.user.personaId);
        } else if (req.user.role === 'Alumno' && req.user.personaId) {
            notas = await NotaService.notaModel.getNotasByAlumnoPersonaId(req.user.personaId);
        } else {
            notas = await NotaService.getAllNotas(); // Solo Admin Global ve todos
        }
        res.status(200).json(notas);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getNotaById = async (req, res) => {
    try {
        const { id } = req.params;
        const nota = await NotaService.getNotaById(id);
        res.status(200).json(nota);
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
};

const createNota = async (req, res) => {
    try {
        const { body, files } = req;
        const { id_matricula, id_docente_curso } = body;

        // Validaciones de autorización y consistencia de colegio
        // Solo un Docente o Administrador puede crear notas
        if (req.user.role === 'Docente' && req.user.personaId) {
            // Un docente solo puede poner notas si el id_docente_curso le corresponde a él
            // Y si la matrícula es de un alumno de un grupo donde él da clases.
            const docenteCurso = await DocenteCursoModel.getByIdWithDetails(id_docente_curso);
            if (!docenteCurso || docenteCurso.docente_id_persona !== req.user.personaId) {
                return res.status(403).json({ message: 'No tiene permisos para poner notas con esta asignación Docente-Curso.' });
            }
            // Validar que el alumno de la matrícula pertenece a un grupo del mismo colegio que el docente
            const matricula = await MatriculaModel.getByIdWithDetails(id_matricula);
            if (!matricula || matricula.colegio_id !== docenteCurso.colegio_id) {
                return res.status(403).json({ message: 'La matrícula no pertenece al colegio de este docente.' });
            }
        } else if (req.user.role === 'Administrador Colegio' && req.user.colegioId) {
            // Un Admin Colegio solo puede poner notas para su colegio
            const matricula = await MatriculaModel.getByIdWithDetails(id_matricula);
            if (!matricula || matricula.colegio_id !== req.user.colegioId) {
                return res.status(403).json({ message: 'La matrícula no pertenece a su colegio.' });
            }
            const docenteCurso = await DocenteCursoModel.getByIdWithDetails(id_docente_curso);
            if (!docenteCurso || docenteCurso.colegio_id !== req.user.colegioId) {
                return res.status(403).json({ message: 'La asignación Docente-Curso no pertenece a su colegio.' });
            }
        } else if (req.user.role === 'Administrador Global') {
            // Admin Global puede hacer todo, no necesita validaciones de colegio aquí
        } else {
            return res.status(403).json({ message: 'No tiene permisos para crear notas.' });
        }


        const fileUrls = await processNotaFiles(files);
        const notaData = { ...body, ...fileUrls };

        const newNota = await NotaService.createNota(notaData);
        res.status(201).json(newNota);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const updateNota = async (req, res) => {
    try {
        const { id } = req.params;
        const { body, files } = req;

        // Validaciones de autorización y consistencia de colegio
        if (req.user.role === 'Docente' && req.user.personaId) {
            const notaToUpdate = await NotaService.getNotaById(id);
            if (!notaToUpdate) { return res.status(404).json({ message: 'Nota no encontrada.' }); }
            if (notaToUpdate.docente_id_persona !== req.user.personaId) { // docente_id_persona viene del modelo
                return res.status(403).json({ message: 'No tiene permisos para actualizar esta nota (no es su nota).' });
            }
            // Además, si cambia id_matricula o id_docente_curso, verificar que sigan siendo de su colegio/sus grupos
            // Esto se valida a un nivel más profundo en el servicio si hay cambios.
        } else if (req.user.role === 'Administrador Colegio' && req.user.colegioId) {
            const notaToUpdate = await NotaService.getNotaById(id);
            if (!notaToUpdate || notaToUpdate.colegio_id !== req.user.colegioId) {
                return res.status(403).json({ message: 'No tiene permisos para actualizar notas de este colegio.' });
            }
            // Si cambia id_matricula o id_docente_curso, verificar que los nuevos FKs sean de su colegio
            if (body.id_matricula && body.id_matricula !== notaToUpdate.id_matricula) {
                const newMatricula = await MatriculaModel.getByIdWithDetails(body.id_matricula);
                if (!newMatricula || newMatricula.colegio_id !== req.user.colegioId) {
                    return res.status(403).json({ message: 'La nueva matrícula no pertenece a su colegio.' });
                }
            }
            if (body.id_docente_curso && body.id_docente_curso !== notaToUpdate.id_docente_curso) {
                const newDocenteCurso = await DocenteCursoModel.getByIdWithDetails(body.id_docente_curso);
                if (!newDocenteCurso || newDocenteCurso.colegio_id !== req.user.colegioId) {
                    return res.status(403).json({ message: 'La nueva asignación Docente-Curso no pertenece a su colegio.' });
                }
            }
        } else if (req.user.role === 'Administrador Global') {
            // Admin Global puede actualizar cualquier nota
        } else {
            return res.status(403).json({ message: 'No tiene permisos para actualizar notas.' });
        }


        const fileUrls = await processNotaFiles(files);
        const notaData = { ...body, ...fileUrls };

        const updated = await NotaService.updateNota(id, notaData);
        res.status(200).json({ message: 'Nota actualizada exitosamente.', data: updated });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const deleteNota = async (req, res) => {
    try {
        const { id } = req.params;

        // Validaciones de autorización y consistencia de colegio
        if (req.user.role === 'Docente' && req.user.personaId) {
            const notaToDelete = await NotaService.getNotaById(id);
            if (!notaToDelete || notaToDelete.docente_id_persona !== req.user.personaId) {
                return res.status(403).json({ message: 'No tiene permisos para eliminar esta nota (no es su nota).' });
            }
        } else if (req.user.role === 'Administrador Colegio' && req.user.colegioId) {
            const notaToDelete = await NotaService.getNotaById(id);
            if (!notaToDelete || notaToDelete.colegio_id !== req.user.colegioId) {
                return res.status(403).json({ message: 'No tiene permisos para eliminar notas de este colegio.' });
            }
        } else if (req.user.role === 'Administrador Global') {
            // Admin Global puede eliminar cualquier nota
        } else {
            return res.status(403).json({ message: 'No tiene permisos para eliminar notas.' });
        }

        const deleted = await NotaService.deleteNota(id);
        res.status(200).json({ message: 'Nota eliminada exitosamente.', deleted: deleted });
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
};

module.exports = {
    getAllNotas,
    getNotaById,
    createNota,
    updateNota,
    deleteNota
};