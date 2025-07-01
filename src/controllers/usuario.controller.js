const UsuarioService = require('../services/usuario.service');

const getAllUsuarios = async (req, res) => {
    try {
        const usuarios = await UsuarioService.getAllUsuarios();
        res.status(200).json(usuarios);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getUsuarioById = async (req, res) => {
    try {
        const { id } = req.params;
        const usuario = await UsuarioService.getUsuarioById(id);
        res.status(200).json(usuario);
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
};

const createUsuario = async (req, res) => {
    try {
        // En este controlador NO se manejan archivos, solo datos JSON
        const newUsuario = await UsuarioService.createUsuario(req.body);
        res.status(201).json(newUsuario);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const updateUsuario = async (req, res) => {
    try {
        const { id } = req.params;
        const updated = await UsuarioService.updateUsuario(id, req.body);
        res.status(200).json({ message: 'Usuario actualizado exitosamente.', data: updated });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const deleteUsuario = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await UsuarioService.deleteUsuario(id);
        res.status(200).json({ message: 'Usuario eliminado exitosamente.', deleted: deleted });
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
};

module.exports = {
    getAllUsuarios,
    getUsuarioById,
    createUsuario,
    updateUsuario,
    deleteUsuario
};