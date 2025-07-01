const PersonaService = require('../services/persona.service');
const { uploadFileToCloudinary } = require('../utils/fileUpload.util'); // Para la subida de archivos

// Función para procesar archivos y devolver URLs
const processFiles = async (files) => {
    let urls = {};
    if (files) {
        if (files.foto_perfil && files.foto_perfil[0]) {
            urls.url_foto_perfil = await uploadFileToCloudinary(files.foto_perfil[0].buffer, 'personas/fotos_perfil');
        }
        if (files.documento_dni && files.documento_dni[0]) {
            urls.url_documento_dni = await uploadFileToCloudinary(files.documento_dni[0].buffer, 'personas/dni');
        }
        if (files.curriculum_vitae && files.curriculum_vitae[0]) {
            urls.url_curriculum_vitae = await uploadFileToCloudinary(files.curriculum_vitae[0].buffer, 'personas/cv');
        }
        if (files.titulo_academico && files.titulo_academico[0]) {
            urls.url_titulo_academico = await uploadFileToCloudinary(files.titulo_academico[0].buffer, 'personas/titulos');
        }
        if (files.antecedentes_penales && files.antecedentes_penales[0]) {
            urls.url_antecedentes_penales = await uploadFileToCloudinary(files.antecedentes_penales[0].buffer, 'personas/antecedentes');
        }
    }
    return urls;
};


const getAllPersonas = async (req, res) => {
    try {
        const personas = await PersonaService.getAllPersonas();
        res.status(200).json(personas);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getPersonaById = async (req, res) => {
    try {
        const { id } = req.params;
        const persona = await PersonaService.getPersonaById(id);
        res.status(200).json(persona);
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
};

const createPersona = async (req, res) => {
    try {
        const { body, files } = req; // req.body para datos de texto, req.files para archivos

        const fileUrls = await processFiles(files); // Procesar archivos y obtener URLs

        const personaData = {
            ...body,
            ...fileUrls // Combinar datos del cuerpo con las URLs de los archivos
        };

        const newPersona = await PersonaService.createPersona(personaData);
        res.status(201).json(newPersona);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const updatePersona = async (req, res) => {
    try {
        const { id } = req.params;
        const { body, files } = req;

        const fileUrls = await processFiles(files);

        const personaData = {
            ...body,
            ...fileUrls
        };

        const updated = await PersonaService.updatePersona(id, personaData);
        res.status(200).json({ message: 'Persona actualizada exitosamente.', updated: updated });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const deletePersona = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await PersonaService.deletePersona(id);
        res.status(200).json({ message: 'Persona eliminada exitosamente.', deleted: deleted });
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
};

module.exports = {
    getAllPersonas,
    getPersonaById,
    createPersona,
    updatePersona,
    deletePersona
};