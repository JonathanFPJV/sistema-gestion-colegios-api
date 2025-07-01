const PersonaModel = require('../models/Persona.model');
const RolModel = require('../models/Rol.model'); // Necesitaremos esto para roles en algunas verificaciones
const UsuarioModel = require('../models/Usuario.model'); // Para verificar si ya es usuario

class PersonaService {
    async getAllPersonas() {
        return await PersonaModel.findAll();
    }

    async getPersonaById(id) {
        const persona = await PersonaModel.findById(id);
        if (!persona) {
            throw new Error('Persona no encontrada.');
        }
        return persona;
    }

    async createPersona(personaData) {
        // Validaciones básicas de negocio
        const { DNI, correo } = personaData;

        const existingDNI = await PersonaModel.findByDNI(DNI);
        if (existingDNI) {
            throw new Error('Ya existe una persona con este DNI.');
        }

        if (correo) { // Correo es UNIQUE pero NULLable, solo validamos si se proporciona
            const existingCorreo = await PersonaModel.findByField('correo', correo);
            if (existingCorreo) {
                throw new Error('Ya existe una persona con este correo electrónico.');
            }
        }

        // Puedes añadir más validaciones aquí (ej. formato de DNI, fechas)

        return await PersonaModel.create(personaData);
    }

    async updatePersona(id, personaData) {
        const persona = await PersonaModel.findById(id);
        if (!persona) {
            throw new Error('Persona no encontrada.');
        }

        // Validaciones para DNI y correo en caso de actualización
        if (personaData.DNI && personaData.DNI !== persona.DNI) {
            const existingDNI = await PersonaModel.findByDNI(personaData.DNI);
            if (existingDNI && existingDNI.id_persona !== id) {
                throw new Error('El DNI ya está en uso por otra persona.');
            }
        }
        if (personaData.correo && personaData.correo !== persona.correo) {
            const existingCorreo = await PersonaModel.findByField('correo', personaData.correo);
            if (existingCorreo && existingCorreo.id_persona !== id) {
                throw new Error('El correo electrónico ya está en uso por otra persona.');
            }
        }

        const updated = await PersonaModel.update(id, personaData);
        if (!updated) {
            throw new Error('No se pudo actualizar la persona.');
        }
        return updated;
    }

    async deletePersona(id) {
        const persona = await PersonaModel.findById(id);
        if (!persona) {
            throw new Error('Persona no encontrada.');
        }

        // **IMPORTANTE para la integridad referencial:**
        // Antes de eliminar una persona, debemos considerar qué otras tablas hacen referencia a ella.
        // En tu modelo, 'Usuarios', 'Matricula', 'Docente_Curso', 'Asistencias' tienen FK a Personas.
        // Las acciones ON DELETE (CASCADE, RESTRICT, SET NULL) en la migración manejan esto automáticamente.
        // Si tienes ON DELETE RESTRICT, la eliminación fallará si hay dependencias.
        // Si tienes ON DELETE CASCADE, se eliminarán en cascada.
        // Si tienes ON DELETE SET NULL, las FKs se pondrán a NULL.

        // Si tienes ON DELETE RESTRICT y quieres permitir la eliminación, primero deberías
        // desvincular o eliminar los registros dependientes.
        // Por ejemplo, un usuario no puede ser eliminado si tiene matrículas o asignaciones de cursos.
        // Esto es una decisión de negocio. Por ahora, confiamos en ON DELETE en la DB.

        const deleted = await PersonaModel.delete(id);
        if (!deleted) {
            throw new Error('No se pudo eliminar la persona.');
        }
        return deleted;
    }

    // Método para obtener el rol de una persona (útil para la API)
    async getPersonaRole(id_persona) {
        const [rows] = await PersonaModel.pool.query(
            `SELECT R.nombre FROM Usuarios U JOIN Roles R ON U.id_rol = R.id_rol WHERE U.id_persona = ?`,
            [id_persona]
        );
        return rows[0] ? rows[0].nombre : null;
    }

    // Método para obtener el ID del colegio al que pertenece una persona
    // Esto es CRÍTICO para la autorización a nivel de colegio
    async getColegioIdForPersona(personaId) {
        // Lógica para determinar el colegioId según el rol y las tablas de relación
        const role = await this.getPersonaRole(personaId);
        if (!role) return null;

        if (role === 'Alumno') {
            // Un alumno está vinculado a un colegio a través de Matricula -> GruposClases -> Sedes -> Colegios
            const [rows] = await PersonaModel.pool.query(`
                SELECT C.id_colegio
                FROM Matricula M
                JOIN GruposClases GC ON M.id_grupo_clase = GC.id_grupo_clase
                JOIN Sedes S ON GC.id_sede = S.id_sede
                JOIN Colegios C ON S.id_colegio = C.id_colegio
                WHERE M.id_persona = ?
                LIMIT 1
            `, [personaId]);
            return rows.length > 0 ? rows[0].id_colegio : null;
        } else if (role === 'Docente') {
            // Un docente está vinculado a un colegio a través de Docente_Curso -> Cursos -> Colegios
            const [rows] = await PersonaModel.pool.query(`
                SELECT C.id_colegio
                FROM Docente_Curso DC
                JOIN Cursos CUR ON DC.id_curso = CUR.id_curso
                JOIN Colegios C ON CUR.id_colegio = C.id_colegio
                WHERE DC.id_persona = ?
                LIMIT 1
            `, [personaId]);
            return rows.length > 0 ? rows[0].id_colegio : null;
        } else if (role === 'Administrador Colegio') {
             // Si hay una tabla de administradores de colegio, buscar ahí
             // Si el id_colegio del admin de colegio está directamente en la tabla Usuarios (menos flexible)
             // O si hay una tabla 'Colegio_Administradores' (id_colegio, id_persona)
             // Por ahora, asumiremos que un 'Administrador Colegio' tiene su 'id_colegio' en el token
             // o se asocia en una tabla intermedia si no lo agregaste a 'Usuarios'.
             // Para simplificar, si no tienes una tabla de asociación directa, el 'colegioId'
             // para el rol 'Administrador Colegio' deberá ser manejado en la autenticación (login)
             // y puesto en el JWT payload.
             return null; // Necesitarías una tabla o lógica específica para esto.
        }
        return null; // Roles como 'Administrador Global' no están vinculados a un colegio específico.
    }
}

module.exports = new PersonaService();