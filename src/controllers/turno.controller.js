const TurnoService = require('../services/turno.service');

const getAllTurnos = async (req, res) => {
    try {
        const turnos = await TurnoService.getAllTurnos();
        res.status(200).json(turnos);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getTurnoById = async (req, res) => {
    try {
        const { id } = req.params;
        const turno = await TurnoService.getTurnoById(id);
        res.status(200).json(turno);
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
};

const createTurno = async (req, res) => {
    try {
        const newTurno = await TurnoService.createTurno(req.body);
        res.status(201).json(newTurno);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const updateTurno = async (req, res) => {
    try {
        const { id } = req.params;
        const updated = await TurnoService.updateTurno(id, req.body);
        res.status(200).json({ message: 'Turno actualizado exitosamente.', data: updated });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const deleteTurno = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await TurnoService.deleteTurno(id);
        res.status(200).json({ message: 'Turno eliminado exitosamente.', deleted: deleted });
    } catch (error) {
        res.status(400).json({ message: error.message }); // 400 si hay restricciones de FK
    }
};

module.exports = {
    getAllTurnos,
    getTurnoById,
    createTurno,
    updateTurno,
    deleteTurno
};