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
        const { id_persona, id_rol, usuario, contrasena, especialidad } = usuarioData;

        // Validaciones de existencia de FKs
        const personaExists = await PersonaModel.findById(id_persona);
        if (!personaExists) {
            throw new Error('La persona asociada no existe.');
        }
        const rolExists = await RolModel.findById(id_rol);
        if (!rolExists) {
            throw new Error('El rol especificado no existe.');
        }

        // Validar unicidad del nombre de usuario
        const existingUsuario = await UsuarioModel.findByUsername(usuario);
        if (existingUsuario) {
            throw new Error('El nombre de usuario ya está en uso.');
        }

        // Validar si la persona ya tiene una cuenta de usuario
        const [existingUserByPersonaId] = await UsuarioModel.pool.query(
            `SELECT id_usuario FROM Usuarios WHERE id_persona = ?`,
            [id_persona]
        );
        if (existingUserByPersonaId.length > 0) {
            throw new Error('Esta persona ya tiene una cuenta de usuario asociada.');
        }

        const hashedPassword = await hashPassword(contrasena);

        const newUsuario = await UsuarioModel.create({
            id_persona,
            id_rol,
            usuario,
            contrasena: hashedPassword,
            especialidad: especialidad || null // Asegura NULL si no se proporciona
        });

        // Retornar el usuario con detalles para la respuesta de la API
        return await this.getUsuarioById(newUsuario.id);
    }

    async updateUsuario(id_usuario, usuarioData) {
        const { id_rol, usuario, contrasena, especialidad } = usuarioData;

        const existingUser = await UsuarioModel.findById(id_usuario);
        if (!existingUser) {
            throw new Error('Usuario no encontrado.');
        }

        // Validar unicidad del nombre de usuario si se intenta cambiar
        if (usuario && usuario !== existingUser.usuario) {
            const userWithSameUsername = await UsuarioModel.findByUsername(usuario);
            if (userWithSameUsername && userWithSameUsername.id_usuario !== id_usuario) {
                throw new Error('El nombre de usuario ya está en uso por otro usuario.');
            }
        }

        // Validar existencia del rol si se intenta cambiar
        if (id_rol) {
            const rolExists = await RolModel.findById(id_rol);
            if (!rolExists) {
                throw new Error('El rol especificado no existe.');
            }
        }

        // Hash de la nueva contraseña si se proporciona
        let hashedPassword = existingUser.contrasena;
        if (contrasena) {
            hashedPassword = await hashPassword(contrasena);
        }

        const dataToUpdate = {
            id_rol: id_rol || existingUser.id_rol,
            usuario: usuario || existingUser.usuario,
            contrasena: hashedPassword,
            especialidad: typeof especialidad !== 'undefined' ? especialidad : existingUser.especialidad
        };

        const updated = await UsuarioModel.update(id_usuario, dataToUpdate);
        if (!updated) {
            throw new Error('No se pudo actualizar el usuario.');
        }
        return await this.getUsuarioById(id_usuario); // Retornar el usuario actualizado con detalles
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