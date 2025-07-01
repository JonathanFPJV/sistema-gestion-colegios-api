const NivelEnsenanzaService = require('../services/nivelEnsenanza.service');

const getAllNiveles = async (req, res) => {
    try {
        const niveles = await NivelEnsenanzaService.getAllNiveles();
        res.status(200).json(niveles);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getNivelById = async (req, res) => {
    try {
        const { id } = req.params;
        const nivel = await NivelEnsenanzaService.getNivelById(id);
        res.status(200).json(nivel);
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
};

const createNivel = async (req, res) => {
    try {
        const newNivel = await NivelEnsenanzaService.createNivel(req.body);
        res.status(201).json(newNivel);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const updateNivel = async (req, res) => {
    try {
        const { id } = req.params;
        const updated = await NivelEnsenanzaService.updateNivel(id, req.body);
        res.status(200).json({ message: 'Nivel de enseñanza actualizado exitosamente.', data: updated });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const deleteNivel = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await NivelEnsenanzaService.deleteNivel(id);
        res.status(200).json({ message: 'Nivel de enseñanza eliminado exitosamente.', deleted: deleted });
    } catch (error) {
        res.status(400).json({ message: error.message }); // 400 si hay restricciones de FK
    }
};

module.exports = {
    getAllNiveles,
    getNivelById,
    createNivel,
    updateNivel,
    deleteNivel
};