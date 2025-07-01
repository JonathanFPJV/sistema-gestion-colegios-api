const RolModel = require('../models/Rol.model');

class RolService {
    async getAllRoles() {
        return await RolModel.findAll();
    }

    async getRolById(id_rol) {
        const rol = await RolModel.findById(id_rol);
        if (!rol) {
            throw new Error('Rol no encontrado.');
        }
        return rol;
    }

    async createRol(rolData) {
        const { nombre } = rolData;

        // Validar unicidad del nombre del rol
        const existingRol = await RolModel.findByName(nombre);
        if (existingRol) {
            throw new Error('Ya existe un rol con este nombre.');
        }

        return await RolModel.create(rolData);
    }

    async updateRol(id_rol, rolData) {
        const { nombre } = rolData;

        const existingRol = await RolModel.findById(id_rol);
        if (!existingRol) {
            throw new Error('Rol no encontrado.');
        }

        // Validar unicidad del nombre si se intenta cambiar
        if (nombre && nombre !== existingRol.nombre) {
            const rolWithSameName = await RolModel.findByName(nombre);
            if (rolWithSameName && rolWithSameName.id_rol !== id_rol) {
                throw new Error('El nombre de rol ya está en uso por otro rol.');
            }
        }

        const updated = await RolModel.update(id_rol, rolData);
        if (!updated) {
            throw new Error('No se pudo actualizar el rol.');
        }
        return updated; // Devuelve true si se actualizó, o el objeto actualizado si lo modificas
    }

    async deleteRol(id_rol) {
        const rol = await RolModel.findById(id_rol);
        if (!rol) {
            throw new Error('Rol no encontrado.');
        }

        // **IMPORTANTE:** Consideraciones para la eliminación de Roles.
        // Si hay 'Usuarios' asociados a este 'id_rol', y la FK en Usuarios tiene ON DELETE RESTRICT,
        // la eliminación fallará. Esto es lo ideal para evitar usuarios sin rol.
        // Si tu migración tiene ON DELETE RESTRICT para `Usuarios.id_rol`, no podrás eliminar
        // un rol que esté siendo usado por algún usuario.

        const deleted = await RolModel.delete(id_rol);
        if (!deleted) {
            throw new Error('No se pudo eliminar el rol. Verifique si hay usuarios asociados.');
        }
        return deleted;
    }
}

module.exports = new RolService();