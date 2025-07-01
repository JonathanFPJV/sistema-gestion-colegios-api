const UsuarioModel = require('../models/Usuario.model');
const PersonaModel = require('../models/Persona.model'); // Para obtener datos de la persona
const { hashPassword, comparePassword } = require('../utils/hash.util');
const { generateToken } = require('../utils/jwt.util');

class AuthService {
    async register(userData) {
        const { nombre, apellido, DNI, celular, correo, fecha_nacimiento, genero, direccion, id_rol, usuario, contrasena, especialidad, url_foto_perfil, url_documento_dni, url_curriculum_vitae, url_titulo_academico, url_antecedentes_penales } = userData;

        // Validar si la persona o el usuario ya existen
        const existingPersona = await PersonaModel.findByDNI(DNI);
        if (existingPersona) {
            throw new Error('Ya existe una persona con este DNI.');
        }
        const existingUser = await UsuarioModel.findByUsername(usuario);
        if (existingUser) {
            throw new Error('El nombre de usuario ya está en uso.');
        }

        const hashedPassword = await hashPassword(contrasena);

        // Crear la Persona
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

        // Crear el Usuario
        const newUser = await UsuarioModel.create({
            id_persona: newPersona.id,
            id_rol,
            usuario,
            contrasena: hashedPassword,
            especialidad: especialidad || null // Será null si no se proporciona o no es docente
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

        // Obtener datos de la persona y el rol para el payload del JWT
        const persona = await PersonaModel.findById(user.id_persona);
        const [roles] = await UsuarioModel.pool.query('SELECT nombre FROM Roles WHERE id_rol = ?', [user.id_rol]);
        const roleName = roles[0] ? roles[0].nombre : 'Desconocido';

        // Payload del JWT: crucial para autorización multi-colegio
        // Aquí deberías determinar el 'colegioId' si el usuario es Admin de Colegio, Docente o Alumno.
        // Esto requeriría lógica adicional para mapear Persona/Usuario a Colegio.
        // Por ahora, asumimos que un Admin Global no tiene colegioId.
        
        let colegioId = null;
        // Lógica simplificada: si el rol es 'Docente' o 'Alumno', buscamos su colegio
        if (roleName === 'Docente' || roleName === 'Alumno') {
            // Esto es un placeholder. La lógica real necesitaría consultar las tablas
            // Alumnos o Docentes (si las tuvieras) para obtener el id_colegio.
            // Dado tu diseño actual, el id_colegio no está directamente en Persona/Usuario.
            // Para simplificar, podrías añadir un campo id_colegio_asociado a Usuarios
            // o recuperar esta info en el servicio de autenticación si es un Docente o Alumno.
            // Por ejemplo, buscar en Matricula si es alumno o Docente_Curso si es docente
            // y luego desde ahí a GruposClases -> Sedes -> Colegio.
            // Para un MVP, quizás puedas pasarlo como parte del registro o login inicial
            // si el usuario siempre pertenece a un colegio.
            // Para un Admin de Colegio, su `id_colegio` debería ser parte del payload.
        }

        const payload = {
            userId: user.id_usuario,
            personaId: user.id_persona,
            role: roleName, // 'Administrador Global', 'Docente', 'Alumno', etc.
            colegioId: colegioId // Este campo es CRÍTICO para la autorización multi-colegio
        };

        const token = generateToken(payload);
        return { token, user: { id: user.id_usuario, usuario: user.usuario, rol: roleName, persona: { id: persona.id_persona, nombre: persona.nombre, apellido: persona.apellido } } };
    }
}

module.exports = new AuthService();