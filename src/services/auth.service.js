// src/services/auth.service.js
const UsuarioModel = require('../models/Usuario.model');
const PersonaModel = require('../models/Persona.model');
const RolModel = require('../models/Rol.model');
const ColegioModel = require('../models/Colegio.model'); // Necesario para validar id_colegio_gestion en register
const { hashPassword, comparePassword } = require('../utils/hash.util');
const { generateToken } = require('../utils/jwt.util');

class AuthService {
    async register(userData) {
        const {
            nombre,
            apellido,
            DNI,
            celular,
            correo,
            fecha_nacimiento,
            genero,
            direccion,
            id_rol,
            usuario,
            contrasena,
            especialidad, // Puede ser null
            id_colegio_gestion, // <--- NUEVO CAMPO EN EL REGISTRO
            url_foto_perfil,
            url_documento_dni,
            url_curriculum_vitae,
            url_titulo_academico,
            url_antecedentes_penales
        } = userData;

        // 1. Validar si la persona o el usuario ya existen
        const existingPersona = await PersonaModel.findByDNI(DNI);
        if (existingPersona) {
            throw new Error('Ya existe una persona con este DNI.');
        }
        const existingUser = await UsuarioModel.findByUsername(usuario);
        if (existingUser) {
            throw new Error('El nombre de usuario ya está en uso.');
        }

        // 2. Validar que el id_rol exista
        const rolExists = await RolModel.findById(id_rol);
        if (!rolExists) {
            throw new Error('El rol especificado no existe.');
        }

        // 3. Validar id_colegio_gestion si se proporciona
        // Solo debe proporcionarse si el rol es Admin Colegio, Docente, o Alumno.
        // Si el rol es Admin Global, id_colegio_gestion debería ser null.
        // Opcional: Podrías añadir una validación aquí que, si id_rol es Admin Global, id_colegio_gestion DEBE ser null.
        if (id_colegio_gestion) {
            const colegioExists = await ColegioModel.findById(id_colegio_gestion);
            if (!colegioExists) {
                throw new Error('El colegio de gestión especificado no existe.');
            }
        }
        
        const hashedPassword = await hashPassword(contrasena);

        // 4. Crear la Persona
        const newPersona = await PersonaModel.create({
            nombre,
            apellido,
            DNI,
            celular,
            correo,
            fecha_nacimiento,
            genero,
            direccion,
            url_foto_perfil,
            url_documento_dni,
            url_curriculum_vitae,
            url_titulo_academico,
            url_antecedentes_penales
        });

        // 5. Crear el Usuario
        const newUser = await UsuarioModel.create({
            id_persona: newPersona.id,
            id_rol,
            usuario,
            contrasena: hashedPassword,
            especialidad: especialidad || null, // Se mantiene, será null si no es docente
            id_colegio_gestion: id_colegio_gestion || null // <--- Almacena el ID del colegio gestionado
        });

        return { message: 'Usuario registrado exitosamente.', userId: newUser.id };
    }

    async login(username, password) {
        const user = await UsuarioModel.findByUsername(username);
        if (!user) {
            throw new Error('Credenciales inválidas.');
        }

        const isPasswordValid = await comparePassword(password, user.contrasena);
        if (!isPasswordValid) {
            throw new Error('Credenciales inválidas.');
        }

        const persona = await PersonaModel.findById(user.id_persona);
        const rol = await RolModel.findById(user.id_rol);
        const roleName = rol ? rol.nombre : 'Desconocido';

        // ¡Ahora leemos id_colegio_gestion DIRECTAMENTE del objeto 'user' que viene de la BD!
        // Este campo contendrá el id_colegio para Administradores de Colegio, Docentes y Alumnos.
        // Será NULL para Administradores Globales.
        let colegioId = user.id_colegio_gestion;

        // La única lógica adicional es si necesitas asegurar que Administradores Globales SIEMPRE tengan null,
        // aunque debería venir así de la DB.
        if (roleName === 'Administrador Global') {
             colegioId = null; // Reafirmamos que para este rol, colegioId siempre es null en el token
        }
        // Para Docentes y Alumnos, el `id_colegio_gestion` ahora es su colegio principal.

        const payload = {
            userId: user.id_usuario,
            personaId: user.id_persona,
            role: roleName,
            colegioId: colegioId // Ahora directamente desde la columna id_colegio_gestion
        };

        const token = generateToken(payload);
        return { token, user: { id: user.id_usuario, usuario: user.usuario, rol: roleName, persona: { id: persona.id_persona, nombre: persona.nombre, apellido: persona.apellido }, colegioId: colegioId } };
    }
}

module.exports = new AuthService();