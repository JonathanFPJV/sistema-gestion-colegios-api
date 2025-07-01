const SedeService = require('../services/sede.service');
const { uploadFileToCloudinary } = require('../utils/fileUpload.util'); // Para la subida de archivos

// Función auxiliar para procesar archivos específicos de la sede
const processSedeFiles = async (files) => {
    let urls = {};
    if (files && files.url_foto_sede && files.url_foto_sede[0]) {
        urls.url_foto_sede = await uploadFileToCloudinary(files.url_foto_sede[0].buffer, 'sedes/fotos');
    }
    return urls;
};

const getAllSedes = async (req, res) => {
    try {
        // En un sistema multi-colegio, 'getAllSedes' puede necesitar filtrar por el colegio del usuario.
        // req.user.colegioId estará presente para Administradores de Colegio.
        // Un Administrador Global verá todas las sedes.
        if (req.user.role === 'Administrador Colegio' && req.user.colegioId) {
            // Si quieres que el Admin Colegio solo vea sus sedes:
            const sedes = await SedeModel.getSedesByColegioId(req.user.colegioId);
            return res.status(200).json(sedes);
        }

        const sedes = await SedeService.getAllSedes();
        res.status(200).json(sedes);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getSedeById = async (req, res) => {
    try {
        const { id } = req.params;
        const sede = await SedeService.getSedeById(id);
        res.status(200).json(sede);
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
};

const createSede = async (req, res) => {
    try {
        const { body, files } = req;

        const fileUrls = await processSedeFiles(files);

        const sedeData = {
            ...body,
            ...fileUrls
        };

        const newSede = await SedeService.createSede(sedeData);
        res.status(201).json(newSede);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const updateSede = async (req, res) => {
    try {
        const { id } = req.params;
        const { body, files } = req;

        const fileUrls = await processSedeFiles(files);

        const sedeData = {
            ...body,
            ...fileUrls
        };

        const updated = await SedeService.updateSede(id, sedeData);
        res.status(200).json({ message: 'Sede actualizada exitosamente.', updated: updated });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const deleteSede = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await SedeService.deleteSede(id);
        res.status(200).json({ message: 'Sede eliminada exitosamente.', deleted: deleted });
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
};

module.exports = {
    getAllSedes,
    getSedeById,
    createSede,
    updateSede,
    deleteSede
};