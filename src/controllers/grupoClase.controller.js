const GrupoClaseService = require('../services/grupoClase.service');
const SedeModel = require('../models/Sede.model'); // Para verificar la pertenencia a un colegio
const AnosAcademicosModel = require('../models/AnosAcademicos.model'); // Para verificar la pertenencia a un colegio
const AulaModel = require('../models/Aula.model'); // Para verificar la pertenencia a un colegio
const TurnoModel = require('../models/Turno.model'); // No requiere colegio check directo

const getAllGruposClases = async (req, res) => {
    try {
        // La lógica para filtrar por colegio se manejará en el middleware de ruta.
        let grupos;
        if (req.user.role === 'Administrador Colegio' && req.user.colegioId) {
            // Si es Admin Colegio, solo se le muestran los grupos de su colegio
            grupos = await GrupoClaseService.grupoClaseModel.getGruposByColegioId(req.user.colegioId); // Método en el modelo
        } else {
            grupos = await GrupoClaseService.getAllGruposClases(); // Solo Admin Global ve todos
        }
        res.status(200).json(grupos);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getGrupoClaseById = async (req, res) => {
    try {
        const { id } = req.params;
        const grupo = await GrupoClaseService.getGrupoClaseById(id);
        res.status(200).json(grupo);
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
};

const createGrupoClase = async (req, res) => {
    try {
        const { body } = req;

        // Si el usuario es 'Administrador Colegio', verificar que las FKs pertenezcan a su colegio
        if (req.user.role === 'Administrador Colegio' && req.user.colegioId) {
            const sede = await SedeModel.findById(body.id_sede);
            if (!sede || sede.id_colegio !== req.user.colegioId) {
                return res.status(403).json({ message: 'La sede no pertenece a su colegio.' });
            }
            const aula = await AulaModel.findById(body.id_aula);
            if (!aula || aula.id_sede !== sede.id_sede) { // El aula debe pertenecer a la sede indicada
                return res.status(403).json({ message: 'El aula no pertenece a la sede indicada.' });
            }
            // Los años académicos y turnos son genéricos o ya validados en el servicio.
        }

        const newGrupo = await GrupoClaseService.createGrupoClase(body);
        res.status(201).json(newGrupo);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const updateGrupoClase = async (req, res) => {
    try {
        const { id } = req.params;
        const { body } = req;

        // Si el usuario es 'Administrador Colegio', verificar que el grupo y las nuevas FKs pertenezcan a su colegio
        if (req.user.role === 'Administrador Colegio' && req.user.colegioId) {
            const grupoToUpdate = await GrupoClaseService.getGrupoClaseById(id);
            if (!grupoToUpdate || grupoToUpdate.colegio_id !== req.user.colegioId) { // colegio_id viene de getByIdWithDetails en el modelo
                return res.status(403).json({ message: 'No tiene permisos para actualizar grupos de este colegio.' });
            }

            // Si se intenta cambiar id_sede o id_aula, validar que las nuevas FKs estén en su colegio
            if (body.id_sede && body.id_sede !== grupoToUpdate.id_sede) {
                const newSede = await SedeModel.findById(body.id_sede);
                if (!newSede || newSede.id_colegio !== req.user.colegioId) {
                    return res.status(403).json({ message: 'No puede reasignar el grupo a una sede fuera de su colegio.' });
                }
            }
            if (body.id_aula && body.id_aula !== grupoToUpdate.id_aula) {
                 const newAula = await AulaModel.findById(body.id_aula);
                 const relatedSede = await SedeModel.findById(body.id_sede || grupoToUpdate.id_sede);
                 if (!newAula || newAula.id_sede !== relatedSede.id_sede) {
                     return res.status(403).json({ message: 'La nueva aula no pertenece a la sede del grupo.' });
                 }
            }
        }

        const updated = await GrupoClaseService.updateGrupoClase(id, body);
        res.status(200).json({ message: 'Grupo/Clase actualizado exitosamente.', updated: updated });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const deleteGrupoClase = async (req, res) => {
    try {
        const { id } = req.params;

        // Si el usuario es 'Administrador Colegio', verifica que el grupo pertenezca a su colegio
        if (req.user.role === 'Administrador Colegio' && req.user.colegioId) {
            const grupoToDelete = await GrupoClaseService.getGrupoClaseById(id);
            if (!grupoToDelete || grupoToDelete.colegio_id !== req.user.colegioId) {
                return res.status(403).json({ message: 'No tiene permisos para eliminar grupos de este colegio.' });
            }
        }

        const deleted = await GrupoClaseService.deleteGrupoClase(id);
        res.status(200).json({ message: 'Grupo/Clase eliminado exitosamente.', deleted: deleted });
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
};

module.exports = {
    getAllGruposClases,
    getGrupoClaseById,
    createGrupoClase,
    updateGrupoClase,
    deleteGrupoClase
};