const HorarioClaseModel = require('../models/HorarioClase.model');
const GrupoClaseModel = require('../models/GrupoClase.model'); // Para validar FK
const DocenteCursoModel = require('../models/DocenteCurso.model'); // Para validar FK
const { pool } = require('../db/connection'); // Para consultas complejas

class HorarioClaseService {
    async getAllHorariosClases() {
        return await HorarioClaseModel.getAllWithDetails();
    }

    async getHorarioClaseById(id_horario) {
        const horario = await HorarioClaseModel.getByIdWithDetails(id_horario);
        if (!horario) {
            throw new Error('Horario de clase no encontrado.');
        }
        return horario;
    }

    async createHorarioClase(horarioData) {
        const { id_grupo_clase, id_docente_curso, dia_semana, hora_inicio, hora_fin } = horarioData;

        // 1. Validar que las FKs existan
        const grupoExists = await GrupoClaseModel.findById(id_grupo_clase);
        if (!grupoExists) throw new Error('El grupo/clase especificado no existe.');

        const docenteCursoExists = await DocenteCursoModel.findById(id_docente_curso);
        if (!docenteCursoExists) throw new Error('La asignación Docente-Curso especificada no existe.');

        // 2. Validar que hora_inicio sea menor que hora_fin
        if (hora_inicio >= hora_fin) {
            throw new Error('La hora de inicio debe ser anterior a la hora de fin.');
        }

        // 3. Validar unicidad: no se puede superponer horarios para el mismo grupo, día y rango de horas.
        const existingHorario = await HorarioClaseModel.findUniqueSchedule(id_grupo_clase, dia_semana, hora_inicio, hora_fin);
        if (existingHorario) {
            throw new Error('Ya existe un horario para este grupo en este día y rango de horas.');
        }

        // 4. Validar que el docente no tenga otro horario superpuesto en el mismo día.
        // Opcional: Esto es una regla de negocio común. Necesita consulta compleja.
        // No implementado aquí para evitar sobrecomplicar el CRUD básico, pero es vital para un sistema real.
        // Ejemplo de lógica:
        /*
        const [overlappingDocenteHorarios] = await pool.query(`
            SELECT HC.id_horario
            FROM HorariosClases HC
            JOIN Docente_Curso DC ON HC.id_docente_curso = DC.id_docente_curso
            WHERE DC.id_persona = ? AND HC.dia_semana = ?
            AND (
                (HC.hora_inicio < ? AND HC.hora_fin > ?) OR
                (HC.hora_inicio >= ? AND HC.hora_inicio < ?) OR
                (HC.hora_fin > ? AND HC.hora_fin <= ?)
            )
        `, [docenteCursoExists.id_persona, dia_semana, hora_fin, hora_inicio, hora_inicio, hora_fin, hora_inicio, hora_fin]);

        if (overlappingDocenteHorarios.length > 0) {
            throw new Error('El docente ya tiene otro horario superpuesto en este día.');
        }
        */


        const newHorario = await HorarioClaseModel.create(horarioData);
        return await this.getHorarioClaseById(newHorario.id); // Retornar con detalles completos
    }

    async updateHorarioClase(id_horario, horarioData) {
        const { id_grupo_clase, id_docente_curso, dia_semana, hora_inicio, hora_fin } = horarioData;

        const existingHorario = await HorarioClaseModel.findById(id_horario);
        if (!existingHorario) {
            throw new Error('Horario de clase no encontrado.');
        }

        // 1. Validar existencia de FKs si se intentan cambiar
        if (id_grupo_clase && id_grupo_clase !== existingHorario.id_grupo_clase) {
            const grupoExists = await GrupoClaseModel.findById(id_grupo_clase);
            if (!grupoExists) throw new Error('El nuevo grupo/clase especificado no existe.');
        }
        if (id_docente_curso && id_docente_curso !== existingHorario.id_docente_curso) {
            const docenteCursoExists = await DocenteCursoModel.findById(id_docente_curso);
            if (!docenteCursoExists) throw new Error('La nueva asignación Docente-Curso especificada no existe.');
        }

        // 2. Validar que hora_inicio sea menor que hora_fin si se actualizan
        const finalHoraInicio = hora_inicio || existingHorario.hora_inicio;
        const finalHoraFin = hora_fin || existingHorario.hora_fin;
        if (finalHoraInicio >= finalHoraFin) {
            throw new Error('La hora de inicio debe ser anterior a la hora de fin.');
        }

        // 3. Validar unicidad de la combinación de FKs si alguno de ellos se cambia
        const targetGrupo = id_grupo_clase || existingHorario.id_grupo_clase;
        const targetDia = dia_semana || existingHorario.dia_semana;
        const targetHoraInicio = finalHoraInicio; // Ya validado arriba
        const targetHoraFin = finalHoraFin;       // Ya validado arriba

        if (id_grupo_clase !== undefined || dia_semana !== undefined || hora_inicio !== undefined || hora_fin !== undefined) {
            const horarioWithSameFks = await HorarioClaseModel.findUniqueSchedule(targetGrupo, targetDia, targetHoraInicio, targetHoraFin);
            if (horarioWithSameFks && horarioWithSameFks.id_horario !== id_horario) {
                throw new Error('La nueva combinación de grupo, día y rango de horas ya existe para otro horario.');
            }
        }
        // Opcional: Validar no superposición para el docente (similar a create)

        const updated = await HorarioClaseModel.update(id_horario, horarioData);
        if (!updated) {
            throw new Error('No se pudo actualizar el horario de clase.');
        }
        return await this.getHorarioClaseById(id_horario); // Retornar con detalles completos
    }

    async deleteHorarioClase(id_horario) {
        const horario = await HorarioClaseModel.findById(id_horario);
        if (!horario) {
            throw new Error('Horario de clase no encontrado.');
        }

        // **IMPORTANTE:** Consideraciones para la eliminación de HorariosClases.
        // Tu migración tiene FKs desde `Asistencias.id_horario_clase` con `ON DELETE CASCADE`.
        // Esto significa que al eliminar un horario, todos los registros de asistencia asociados a ese horario también se eliminarán automáticamente.
        const deleted = await HorarioClaseModel.delete(id_horario);
        if (!deleted) {
            throw new Error('No se pudo eliminar el horario de clase.');
        }
        return deleted;
    }
}

module.exports = new HorarioClaseService();