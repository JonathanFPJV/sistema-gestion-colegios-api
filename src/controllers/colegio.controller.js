const ColegioService = require('../services/colegio.service');
const { uploadFileToCloudinary } = require('../utils/fileUpload.util'); // Para la subida de archivos

// Función auxiliar para procesar archivos específicos del colegio
const processColegioFiles = async (files) => {
    let urls = {};
    if (files) {
        if (files.url_logo_colegio && files.url_logo_colegio[0]) {
            urls.url_logo_colegio = await uploadFileToCloudinary(files.url_logo_colegio[0].buffer, 'colegios/logos');
        }
        if (files.url_documento_licencia && files.url_documento_licencia[0]) {
            urls.url_documento_licencia = await uploadFileToCloudinary(files.url_documento_licencia[0].buffer, 'colegios/licencias');
        }
    }
    return urls;
};

const getAllColegios = async (req, res) => {
    try {
        const colegios = await ColegioService.getAllColegios();
        res.status(200).json(colegios);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getColegioById = async (req, res) => {
    try {
        const { id } = req.params;
        const colegio = await ColegioService.getColegioById(id);
        res.status(200).json(colegio);
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
};

const createColegio = async (req, res) => {
    try {
        const { body, files } = req; // req.files contendrá los archivos de Multer

        const fileUrls = await processColegioFiles(files); // Procesar archivos y obtener URLs

        const colegioData = {
            ...body,
            ...fileUrls // Combinar datos del cuerpo con las URLs de los archivos
        };

        const newColegio = await ColegioService.createColegio(colegioData);
        res.status(201).json(newColegio);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const updateColegio = async (req, res) => {
    try {
        const { id } = req.params;
        const { body, files } = req;

        const fileUrls = await processColegioFiles(files);

        const colegioData = {
            ...body,
            ...fileUrls
        };

        const updated = await ColegioService.updateColegio(id, colegioData);
        res.status(200).json({ message: 'Colegio actualizado exitosamente.', updated: updated });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const deleteColegio = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await ColegioService.deleteColegio(id);
        res.status(200).json({ message: 'Colegio eliminado exitosamente.', deleted: deleted });
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
};

module.exports = {
    getAllColegios,
    getColegioById,
    createColegio,
    updateColegio,
    deleteColegio
};