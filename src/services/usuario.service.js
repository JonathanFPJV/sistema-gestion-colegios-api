const UsuarioModel = require('../models/Usuario.model');
const PersonaModel = require('../models/Persona.model');
const RolModel = require('../models/Rol.model'); // Necesario para validar id_rol
const { hashPassword, comparePassword } = require('../utils/hash.util');

class UsuarioService {
    async getAllUsuarios() {
        return await UsuarioModel.getAllWithDetails();
    }

    async getUsuarioById(id_usuario) {
        const usuario = await UsuarioModel.getByIdWithDetails(id_usuario);
        if (!usuario) {
            throw new Error('Usuario no encontrado.');
        }
        return usuario;
    }

    async createUsuario(usuarioData) {
        const { id_persona, id_rol, usuario, contrasena, especialidad, id_colegio_gestion } = usuarioData; // AÑADIR id_colegio_gestion

        // ... (validaciones de persona, rol, usuario existentes)

        // Validar que id_colegio_gestion exista si se proporciona
        if (id_colegio_gestion) {
            const colegioExists = await UsuarioModel.pool.query(`SELECT id_colegio FROM Colegios WHERE id_colegio = ?`, [id_colegio_gestion]);
            if (colegioExists[0].length === 0) {
                throw new Error('El colegio de gestión especificado no existe.');
            }
        }
        
        const hashedPassword = await hashPassword(contrasena);

        const newUsuario = await UsuarioModel.create({
            id_persona,
            id_rol,
            usuario,
            contrasena: hashedPassword,
            especialidad: especialidad || null,
            id_colegio_gestion: id_colegio_gestion || null // AÑADIR Y ASEGURAR NULL
        });

        return await this.getUsuarioById(newUsuario.id);
    }

    async updateUsuario(id_usuario, usuarioData) {
        const { id_rol, usuario, contrasena, especialidad, id_colegio_gestion } = usuarioData; // AÑADIR id_colegio_gestion

        // ... (validaciones de usuario existente, nombre de usuario, rol)

        // Validar id_colegio_gestion si se proporciona
        if (id_colegio_gestion) {
            const colegioExists = await UsuarioModel.pool.query(`SELECT id_colegio FROM Colegios WHERE id_colegio = ?`, [id_colegio_gestion]);
            if (colegioExists[0].length === 0) {
                throw new Error('El colegio de gestión especificado no existe.');
            }
        } else if (id_colegio_gestion === null) {
            // Permitir explícitamente setear a NULL si se envía null
            // No necesita validación de existencia si es null
        }

        let hashedPassword = existingUser.contrasena;
        if (contrasena) {
            hashedPassword = await hashPassword(contrasena);
        }

        const dataToUpdate = {
            id_rol: id_rol || existingUser.id_rol,
            usuario: usuario || existingUser.usuario,
            contrasena: hashedPassword,
            especialidad: typeof especialidad !== 'undefined' ? especialidad : existingUser.especialidad,
            id_colegio_gestion: typeof id_colegio_gestion !== 'undefined' ? id_colegio_gestion : existingUser.id_colegio_gestion // AÑADIR Y MANEJAR UNDEFINED/NULL
        };

        const updated = await UsuarioModel.update(id_usuario, dataToUpdate);
        if (!updated) {
            throw new Error('No se pudo actualizar el usuario.');
        }
        return await this.getUsuarioById(id_usuario);
    }

    async deleteUsuario(id_usuario) {
        const usuario = await UsuarioModel.findById(id_usuario);
        if (!usuario) {
            throw new Error('Usuario no encontrado.');
        }

        // Consideraciones de eliminación:
        // 'Usuarios' tiene una FK a 'Personas' (ON DELETE CASCADE). Si eliminas un usuario, no eliminas la persona.
        // Pero si eliminas la persona, se elimina el usuario.
        // No hay FKs que apunten desde otras tablas a 'Usuarios', por lo que la eliminación es directa.
        const deleted = await UsuarioModel.delete(id_usuario);
        if (!deleted) {
            throw new Error('No se pudo eliminar el usuario.');
        }
        return deleted;
    }
}

module.exports = new UsuarioService();