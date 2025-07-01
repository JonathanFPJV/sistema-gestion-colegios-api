const AnosAcademicosService = require('../services/anosAcademicos.service');

const getAllAnosAcademicos = async (req, res) => {
    try {
        const anosAcademicos = await AnosAcademicosService.getAllAnosAcademicos();
        res.status(200).json(anosAcademicos);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getAnoAcademicoById = async (req, res) => {
    try {
        const { id } = req.params;
        const anoAcademico = await AnosAcademicosService.getAnoAcademicoById(id);
        res.status(200).json(anoAcademico);
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
};

const createAnoAcademico = async (req, res) => {
    try {
        const newAnoAcademico = await AnosAcademicosService.createAnoAcademico(req.body);
        res.status(201).json(newAnoAcademico);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const updateAnoAcademico = async (req, res) => {
    try {
        const { id } = req.params;
        const updated = await AnosAcademicosService.updateAnoAcademico(id, req.body);
        res.status(200).json({ message: 'Año académico actualizado exitosamente.', data: updated });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const deleteAnoAcademico = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await AnosAcademicosService.deleteAnoAcademico(id);
        res.status(200).json({ message: 'Año académico eliminado exitosamente.', deleted: deleted });
    } catch (error) {
        res.status(400).json({ message: error.message }); // 400 si hay restricciones de FK
    }
};

module.exports = {
    getAllAnosAcademicos,
    getAnoAcademicoById,
    createAnoAcademico,
    updateAnoAcademico,
    deleteAnoAcademico
};