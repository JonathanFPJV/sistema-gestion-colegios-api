const DocenteCursoModel = require('../models/DocenteCurso.model');
const PersonaModel = require('../models/Persona.model'); // Para validar id_persona
const CursoModel = require('../models/Curso.model');     // Para validar id_curso
const UsuarioModel = require('../models/Usuario.model'); // Para verificar el rol de la persona
const RolModel = require('../models/Rol.model');         // Para obtener el id del rol 'Docente'

class DocenteCursoService {
    async getAllDocenteCursos() {
        return await DocenteCursoModel.getAllWithDetails();
    }

    async getDocenteCursoById(id_docente_curso) {
        const asignacion = await DocenteCursoModel.getByIdWithDetails(id_docente_curso);
        if (!asignacion) {
            throw new Error('Asignación Docente-Curso no encontrada.');
        }
        return asignacion;
    }

    async createDocenteCurso(asignacionData) {
        const { id_persona, id_curso } = asignacionData;

        // 1. Validar que id_persona exista y que tenga el rol de 'Docente'
        const persona = await PersonaModel.findById(id_persona);
        if (!persona) {
            throw new Error('La persona especificada no existe.');
        }
        const user = await UsuarioModel.findByField('id_persona', id_persona);
        if (!user) {
            throw new Error('La persona no tiene una cuenta de usuario.');
        }
        const rolDocente = await RolModel.findByName('Docente');
        if (!rolDocente || user.id_rol !== rolDocente.id_rol) {
            throw new Error('La persona asignada no tiene el rol de Docente.');
        }

        // 2. Validar que id_curso exista
        const curso = await CursoModel.findById(id_curso);
        if (!curso) {
            throw new Error('El curso especificado no existe.');
        }

        // 3. Validar que el docente y el curso pertenezcan al mismo colegio
        // Asumiendo que el colegioId del docente se puede obtener desde el token o consultando
        // Para esto, el servicio debe recibir el id_colegio del usuario autenticado si es Admin Colegio.
        // O si no, validar que curso.id_colegio coincida con el colegio al que el docente está asociado.
        // Aquí lo verificamos con el `curso.id_colegio`
        const personaColegioId = await PersonaModel.pool.query(`
            SELECT C.id_colegio
            FROM Docente_Curso DC
            JOIN Cursos CUR ON DC.id_curso = CUR.id_curso
            JOIN Colegios C ON CUR.id_colegio = C.id_colegio
            WHERE DC.id_persona = ?
            LIMIT 1
        `, [id_persona]);

        if (personaColegioId[0].length > 0 && personaColegioId[0][0].id_colegio !== curso.id_colegio) {
            throw new Error('El docente no pertenece al colegio de este curso. Asignación no permitida.');
        }
        // Nota: Esta verificación de `personaColegioId` es simplificada. Un docente puede no tener asignaciones
        // previas. La lógica ideal para un `Admin Colegio` es verificar `req.user.colegioId` contra `curso.id_colegio`.
        // Esta validación se hará en el controlador para `Admin Colegio`.

        // 4. Validar unicidad de la combinación (id_persona, id_curso)
        const existingAsignacion = await DocenteCursoModel.findUniqueAssignment(id_persona, id_curso);
        if (existingAsignacion) {
            throw new Error('Esta persona (docente) ya está asignada a este curso.');
        }

        const newAsignacion = await DocenteCursoModel.create(asignacionData);
        return await this.getDocenteCursoById(newAsignacion.id); // Retornar con detalles completos
    }

    async updateDocenteCurso(id_docente_curso, asignacionData) {
        const { id_persona, id_curso } = asignacionData;

        const existingAsignacion = await DocenteCursoModel.findById(id_docente_curso);
        if (!existingAsignacion) {
            throw new Error('Asignación Docente-Curso no encontrada.');
        }

        // 1. Validar existencia de FKs si se intentan cambiar y su rol
        if (id_persona && id_persona !== existingAsignacion.id_persona) {
            const persona = await PersonaModel.findById(id_persona);
            if (!persona) throw new Error('La nueva persona especificada no existe.');
            const user = await UsuarioModel.findByField('id_persona', id_persona);
            const rolDocente = await RolModel.findByName('Docente');
            if (!user || !rolDocente || user.id_rol !== rolDocente.id_rol) {
                throw new Error('La nueva persona asignada no tiene el rol de Docente.');
            }
        }
        if (id_curso && id_curso !== existingAsignacion.id_curso) {
            const curso = await CursoModel.findById(id_curso);
            if (!curso) throw new Error('El nuevo curso especificado no existe.');
        }

        // 2. Validar que el docente y el curso (si se cambian) pertenezcan al mismo colegio
        // Esto se manejará en el controlador para Administrador Colegio.

        // 3. Validar unicidad de la combinación de FKs si alguno de ellos se cambia
        const targetPersonaId = id_persona || existingAsignacion.id_persona;
        const targetCursoId = id_curso || existingAsignacion.id_curso;

        if (id_persona !== undefined || id_curso !== undefined) {
            const asignacionWithSameFks = await DocenteCursoModel.findUniqueAssignment(targetPersonaId, targetCursoId);
            if (asignacionWithSameFameFks && asignacionWithSameFks.id_docente_curso !== id_docente_curso) {
                throw new Error('La nueva combinación de persona (docente) y curso ya existe para otra asignación.');
            }
        }

        const updated = await DocenteCursoModel.update(id_docente_curso, asignacionData);
        if (!updated) {
            throw new Error('No se pudo actualizar la asignación Docente-Curso.');
        }
        return await this.getDocenteCursoById(id_docente_curso); // Retornar con detalles completos
    }

    async deleteDocenteCurso(id_docente_curso) {
        const asignacion = await DocenteCursoModel.findById(id_docente_curso);
        if (!asignacion) {
            throw new Error('Asignación Docente-Curso no encontrada.');
        }

        // **IMPORTANTE:** Consideraciones para la eliminación de Docente_Curso.
        // Tu migración tiene FKs desde `HorariosClases.id_docente_curso` y `Notas.id_docente_curso` con `ON DELETE CASCADE`.
        // Esto significa que al eliminar una asignación docente-curso, sus horarios de clases y notas asociadas también se eliminarán automáticamente.
        const deleted = await DocenteCursoModel.delete(id_docente_curso);
        if (!deleted) {
            throw new Error('No se pudo eliminar la asignación Docente-Curso.');
        }
        return deleted;
    }
}

module.exports = new DocenteCursoService();