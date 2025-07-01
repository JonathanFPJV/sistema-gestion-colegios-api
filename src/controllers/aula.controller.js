const AulaService = require('../services/aula.service');
const SedeModel = require('../models/Sede.model'); // Para verificar la pertenencia a un colegio
const { uploadFileToCloudinary } = require('../utils/fileUpload.util'); // Para la subida de archivos

// Función auxiliar para procesar archivos específicos del aula
const processAulaFiles = async (files) => {
    let urls = {};
    if (files && files.url_foto_aula && files.url_foto_aula[0]) {
        urls.url_foto_aula = await uploadFileToCloudinary(files.url_foto_aula[0].buffer, 'aulas/fotos');
    }
    return urls;
};

const getAllAulas = async (req, res) => {
    try {
        // La lógica para filtrar por colegio se manejará en el middleware de ruta,
        // o si es Admin Colegio, el servicio deberá filtrar.
        let aulas;
        if (req.user.role === 'Administrador Colegio' && req.user.colegioId) {
            // Si el Admin Colegio solo debe ver aulas de sus sedes, y de su colegio
            // Esto requeriría una consulta JOIN más compleja en el modelo Aula, o en el servicio
            // que filtre por id_colegio a través de la relación Aulas -> Sedes.
            // Para simplificar, la lógica de authorizeColegio en la ruta ya lo filtra.
            aulas = await AulaService.getAllAulas(); // Devuelve todas, luego la auth filtra.
        } else {
            aulas = await AulaService.getAllAulas();
        }
        res.status(200).json(aulas);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getAulaById = async (req, res) => {
    try {
        const { id } = req.params;
        const aula = await AulaService.getAulaById(id);
        res.status(200).json(aula);
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
};

const createAula = async (req, res) => {
    try {
        const { body, files } = req;

        // Si el usuario es 'Administrador Colegio', verifica que la sede pertenezca a su colegio
        if (req.user.role === 'Administrador Colegio' && req.user.colegioId) {
            const sede = await SedeModel.findById(body.id_sede);
            if (!sede || sede.id_colegio !== req.user.colegioId) {
                return res.status(403).json({ message: 'No tiene permisos para crear aulas en esta sede o colegio.' });
            }
        }

        const fileUrls = await processAulaFiles(files);

        const aulaData = {
            ...body,
            ...fileUrls
        };

        const newAula = await AulaService.createAula(aulaData);
        res.status(201).json(newAula);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const updateAula = async (req, res) => {
    try {
        const { id } = req.params;
        const { body, files } = req;

        // Si el usuario es 'Administrador Colegio', verifica que el aula y la nueva sede (si cambia) pertenezcan a su colegio
        if (req.user.role === 'Administrador Colegio' && req.user.colegioId) {
            const aulaToUpdate = await AulaService.getAulaById(id); // Obtener aula con detalles de sede/colegio
            if (!aulaToUpdate || aulaToUpdate.colegio_id !== req.user.colegioId) {
                return res.status(403).json({ message: 'No tiene permisos para actualizar aulas de este colegio.' });
            }
            if (body.id_sede && body.id_sede !== aulaToUpdate.id_sede) {
                const newSede = await SedeModel.findById(body.id_sede);
                if (!newSede || newSede.id_colegio !== req.user.colegioId) {
                     return res.status(403).json({ message: 'No puede reasignar el aula a una sede fuera de su colegio.' });
                }
            }
        }

        const fileUrls = await processAulaFiles(files);

        const aulaData = {
            ...body,
            ...fileUrls
        };

        const updated = await AulaService.updateAula(id, aulaData);
        res.status(200).json({ message: 'Aula actualizada exitosamente.', updated: updated });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const deleteAula = async (req, res) => {
    try {
        const { id } = req.params;

        // Si el usuario es 'Administrador Colegio', verifica que el aula pertenezca a su colegio
        if (req.user.role === 'Administrador Colegio' && req.user.colegioId) {
            const aulaToDelete = await AulaService.getAulaById(id);
            if (!aulaToDelete || aulaToDelete.colegio_id !== req.user.colegioId) {
                return res.status(403).json({ message: 'No tiene permisos para eliminar aulas de este colegio.' });
            }
        }

        const deleted = await AulaService.deleteAula(id);
        res.status(200).json({ message: 'Aula eliminada exitosamente.', deleted: deleted });
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
};

module.exports = {
    getAllAulas,
    getAulaById,
    createAula,
    updateAula,
    deleteAula
};