const CursoService = require('../services/curso.service');
const ColegioModel = require('../models/Colegio.model'); // Para verificar la pertenencia a un colegio
const { uploadFileToCloudinary } = require('../utils/fileUpload.util'); // Para la subida de archivos

// Función auxiliar para procesar archivos específicos del curso
const processCursoFiles = async (files) => {
    let urls = {};
    if (files && files.url_silabo && files.url_silabo[0]) {
        urls.url_silabo = await uploadFileToCloudinary(files.url_silabo[0].buffer, 'cursos/silabos');
    }
    return urls;
};

const getAllCursos = async (req, res) => {
    try {
        // La lógica para filtrar por colegio se manejará en el middleware de ruta.
        let cursos;
        if (req.user.role === 'Administrador Colegio' && req.user.colegioId) {
            cursos = await CursoService.getCursosByColegioId(req.user.colegioId);
        } else {
            cursos = await CursoService.getAllCursos(); // Solo Admin Global ve todos
        }
        res.status(200).json(cursos);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getCursoById = async (req, res) => {
    try {
        const { id } = req.params;
        const curso = await CursoService.getCursoById(id);
        res.status(200).json(curso);
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
};

const createCurso = async (req, res) => {
    try {
        const { body, files } = req;

        // Si el usuario es 'Administrador Colegio', verifica que el id_colegio en el body coincida con su colegioId
        if (req.user.role === 'Administrador Colegio' && req.user.colegioId) {
            if (body.id_colegio !== req.user.colegioId) {
                return res.status(403).json({ message: 'No tiene permisos para crear cursos en este colegio.' });
            }
        }
        // Si es Admin Global, se permite el id_colegio del body directamente.

        const fileUrls = await processCursoFiles(files);

        const cursoData = {
            ...body,
            ...fileUrls
        };

        const newCurso = await CursoService.createCurso(cursoData);
        res.status(201).json(newCurso);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const updateCurso = async (req, res) => {
    try {
        const { id } = req.params;
        const { body, files } = req;

        // Si el usuario es 'Administrador Colegio', verifica que el curso pertenezca a su colegio
        if (req.user.role === 'Administrador Colegio' && req.user.colegioId) {
            const cursoToUpdate = await CursoService.getCursoById(id);
            if (!cursoToUpdate || cursoToUpdate.id_colegio !== req.user.colegioId) {
                return res.status(403).json({ message: 'No tiene permisos para actualizar cursos de este colegio.' });
            }
            // Si el id_colegio intenta cambiarse, también debe coincidir con el colegio del admin
            if (body.id_colegio && body.id_colegio !== req.user.colegioId) {
                return res.status(403).json({ message: 'No puede reasignar el curso a otro colegio.' });
            }
        }

        const fileUrls = await processCursoFiles(files);

        const cursoData = {
            ...body,
            ...fileUrls
        };

        const updated = await CursoService.updateCurso(id, cursoData);
        res.status(200).json({ message: 'Curso actualizado exitosamente.', updated: updated });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const deleteCurso = async (req, res) => {
    try {
        const { id } = req.params;

        // Si el usuario es 'Administrador Colegio', verifica que el curso pertenezca a su colegio
        if (req.user.role === 'Administrador Colegio' && req.user.colegioId) {
            const cursoToDelete = await CursoService.getCursoById(id);
            if (!cursoToDelete || cursoToDelete.id_colegio !== req.user.colegioId) {
                return res.status(403).json({ message: 'No tiene permisos para eliminar cursos de este colegio.' });
            }
        }

        const deleted = await CursoService.deleteCurso(id);
        res.status(200).json({ message: 'Curso eliminado exitosamente.', deleted: deleted });
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
};

module.exports = {
    getAllCursos,
    getCursoById,
    createCurso,
    updateCurso,
    deleteCurso
};