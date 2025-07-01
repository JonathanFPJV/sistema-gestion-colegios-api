const RolService = require('../services/rol.service');

const getAllRoles = async (req, res) => {
    try {
        const roles = await RolService.getAllRoles();
        res.status(200).json(roles);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getRolById = async (req, res) => {
    try {
        const { id } = req.params;
        const rol = await RolService.getRolById(id);
        res.status(200).json(rol);
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
};

const createRol = async (req, res) => {
    try {
        const newRol = await RolService.createRol(req.body);
        res.status(201).json(newRol);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const updateRol = async (req, res) => {
    try {
        const { id } = req.params;
        const updated = await RolService.updateRol(id, req.body);
        res.status(200).json({ message: 'Rol actualizado exitosamente.', data: updated });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const deleteRol = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await RolService.deleteRol(id);
        res.status(200).json({ message: 'Rol eliminado exitosamente.', deleted: deleted });
    } catch (error) {
        res.status(400).json({ message: error.message }); // 400 si hay restricciones de FK
    }
};

module.exports = {
    getAllRoles,
    getRolById,
    createRol,
    updateRol,
    deleteRol
};