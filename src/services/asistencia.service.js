const AsistenciaModel = require('../models/Asistencia.model');
const MatriculaModel = require('../models/Matricula.model');     // Para validar id_matricula
const HorarioClaseModel = require('../models/HorarioClase.model'); // Para validar id_horario_clase
const PersonaModel = require('../models/Persona.model');         // Para validar registrado_por_persona_id
const RolModel = require('../models/Rol.model');                 // Para verificar rol de registrador

class AsistenciaService {
    async getAllAsistencias() {
        return await AsistenciaModel.getAllWithDetails();
    }

    async getAsistenciaById(id_asistencia) {
        const asistencia = await AsistenciaModel.getByIdWithDetails(id_asistencia);
        if (!asistencia) {
            throw new Error('Registro de asistencia no encontrado.');
        }
        return asistencia;
    }

    async createAsistencia(asistenciaData) {
        let { id_matricula, id_horario_clase, fecha_asistencia, estado_asistencia, observaciones, registrado_por_persona_id, fecha_hora_registro } = asistenciaData;

        // Si fecha_hora_registro no viene, usar la actual
        fecha_hora_registro = fecha_hora_registro || new Date();

        // 1. Validar que id_matricula exista
        const matricula = await MatriculaModel.getByIdWithDetails(id_matricula);
        if (!matricula) throw new Error('La matrícula especificada no existe.');

        // 2. Validar que id_horario_clase exista
        const horario = await HorarioClaseModel.getByIdWithDetails(id_horario_clase);
        if (!horario) throw new Error('El horario de clase especificado no existe.');

        // 3. Validar que registrado_por_persona_id exista y tenga rol Docente o Admin (si no es NULL)
        if (registrado_por_persona_id) {
            const registrador = await PersonaModel.findById(registrado_por_persona_id);
            if (!registrador) throw new Error('La persona que registra la asistencia no existe.');
            const [userCheck] = await PersonaModel.pool.query(`SELECT id_rol FROM Usuarios WHERE id_persona = ?`, [registrador_por_persona_id]);
            const rolDocente = await RolModel.findByName('Docente');
            const rolAdminGlobal = await RolModel.findByName('Administrador Global');
            const rolAdminColegio = await RolModel.findByName('Administrador Colegio');

            if (userCheck.length === 0 || !(userCheck[0].id_rol === rolDocente.id_rol || userCheck[0].id_rol === rolAdminGlobal.id_rol || userCheck[0].id_rol === rolAdminColegio.id_rol)) {
                throw new Error('La persona que registra debe tener un rol de Docente o Administrador.');
            }
        }

        // 4. Validar unicidad: un alumno solo puede tener un registro de asistencia por clase y fecha
        const existingAsistencia = await AsistenciaModel.findUniqueAsistencia(id_matricula, id_horario_clase, fecha_asistencia);
        if (existingAsistencia) {
            throw new Error(`Ya existe un registro de asistencia para este alumno en esta clase en la fecha ${fecha_asistencia}.`);
        }

        // 5. Validar que la matrícula corresponde al grupo del horario de clase
        if (matricula.id_grupo_clase !== horario.id_grupo_clase) {
            throw new Error('La matrícula del alumno no corresponde al grupo de la clase en el horario.');
        }

        // 6. Validar que el día de la asistencia corresponda al día de la semana del horario
        // Convertir dia_semana de la migración (ej. 'Lunes') a un día de la semana numérico si es necesario
        // O comparar strings directamente si son consistentes.
        const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const dayOfWeek = new Date(fecha_asistencia).getDay(); // 0 = Domingo, 1 = Lunes, etc.
        if (horario.dia_semana !== dayNames[dayOfWeek]) {
             throw new Error(`El día de la asistencia (${dayNames[dayOfWeek]}) no coincide con el día de la semana del horario de clase (${horario.dia_semana}).`);
        }

        const newAsistencia = await AsistenciaModel.create({
            id_matricula,
            id_horario_clase,
            fecha_asistencia,
            estado_asistencia,
            observaciones,
            registrado_por_persona_id,
            fecha_hora_registro
        });
        return await this.getAsistenciaById(newAsistencia.id); // Retornar con detalles completos
    }

    async updateAsistencia(id_asistencia, asistenciaData) {
        let { id_matricula, id_horario_clase, fecha_asistencia, estado_asistencia, observaciones, registrado_por_persona_id } = asistenciaData;

        const existingAsistencia = await AsistenciaModel.getByIdWithDetails(id_asistencia);
        if (!existingAsistencia) {
            throw new Error('Registro de asistencia no encontrado.');
        }

        // 1. Validar existencia de FKs si se intentan cambiar
        if (id_matricula && id_matricula !== existingAsistencia.id_matricula) {
            const matricula = await MatriculaModel.getByIdWithDetails(id_matricula);
            if (!matricula) throw new Error('La nueva matrícula especificada no existe.');
        }
        if (id_horario_clase && id_horario_clase !== existingAsistencia.id_horario_clase) {
            const horario = await HorarioClaseModel.getByIdWithDetails(id_horario_clase);
            if (!horario) throw new Error('El nuevo horario de clase especificado no existe.');
        }
        if (registrado_por_persona_id && registrado_por_persona_id !== existingAsistencia.registrado_por_persona_id) {
            const registrador = await PersonaModel.findById(registrado_por_persona_id);
            if (!registrador) throw new Error('La nueva persona que registra la asistencia no existe.');
            const [userCheck] = await PersonaModel.pool.query(`SELECT id_rol FROM Usuarios WHERE id_persona = ?`, [registrador_por_persona_id]);
            const rolDocente = await RolModel.findByName('Docente');
            const rolAdminGlobal = await RolModel.findByName('Administrador Global');
            const rolAdminColegio = await RolModel.findByName('Administrador Colegio');
            if (userCheck.length === 0 || !(userCheck[0].id_rol === rolDocente.id_rol || userCheck[0].id_rol === rolAdminGlobal.id_rol || userCheck[0].id_rol === rolAdminColegio.id_rol)) {
                throw new Error('La nueva persona que registra debe tener un rol de Docente o Administrador.');
            }
        }

        // 2. Validar unicidad si la combinación de (id_matricula, id_horario_clase, fecha_asistencia) cambia
        const targetMatriculaId = id_matricula || existingAsistencia.id_matricula;
        const targetHorarioClaseId = id_horario_clase || existingAsistencia.horario_id; // Usa horario_id del detalle
        const targetFechaAsistencia = fecha_asistencia || existingAsistencia.fecha_asistencia;

        if (id_matricula !== undefined || id_horario_clase !== undefined || fecha_asistencia !== undefined) {
            const asistenciaWithSameFks = await AsistenciaModel.findUniqueAsistencia(targetMatriculaId, targetHorarioClaseId, targetFechaAsistencia);
            if (asistenciaWithSameFks && asistenciaWithSameFks.id_asistencia !== id_asistencia) {
                throw new Error(`Ya existe un registro de asistencia con la nueva combinación para la fecha ${targetFechaAsistencia}.`);
            }
        }

        // 3. Validar que la matrícula corresponde al grupo del horario de clase si alguna de esas FKs cambió
        const currentMatricula = id_matricula ? await MatriculaModel.getByIdWithDetails(id_matricula) : existingAsistencia;
        const currentHorario = id_horario_clase ? await HorarioClaseModel.getByIdWithDetails(id_horario_clase) : existingAsistencia;

        if (currentMatricula.id_grupo_clase !== currentHorario.id_grupo_clase) {
            throw new Error('La matrícula del alumno no corresponde al grupo de la clase en el horario.');
        }

        // 4. Validar que el día de la asistencia corresponda al día de la semana del horario (si fecha_asistencia o id_horario_clase cambian)
        if (fecha_asistencia !== undefined || (id_horario_clase !== undefined && id_horario_clase !== existingAsistencia.id_horario_clase)) {
            const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
            const finalFechaAsistencia = fecha_asistencia || existingAsistencia.fecha_asistencia;
            const finalHorarioDiaSemana = id_horario_clase ? (await HorarioClaseModel.findById(id_horario_clase)).dia_semana : existingAsistencia.dia_semana;

            const dayOfWeek = new Date(finalFechaAsistencia).getDay();
            if (finalHorarioDiaSemana !== dayNames[dayOfWeek]) {
                throw new Error(`El día de la asistencia (${dayNames[dayOfWeek]}) no coincide con el día de la semana del horario de clase (${finalHorarioDiaSemana}).`);
            }
        }

        const updated = await AsistenciaModel.update(id_asistencia, asistenciaData);
        if (!updated) {
            throw new Error('No se pudo actualizar el registro de asistencia.');
        }
        return await this.getAsistenciaById(id_asistencia); // Retornar con detalles completos
    }

    async deleteAsistencia(id_asistencia) {
        const asistencia = await AsistenciaModel.findById(id_asistencia);
        if (!asistencia) {
            throw new Error('Registro de asistencia no encontrado.');
        }

        // No hay FKs que dependan de Asistencias, así que la eliminación es directa.
        const deleted = await AsistenciaModel.delete(id_asistencia);
        if (!deleted) {
            throw new Error('No se pudo eliminar el registro de asistencia.');
        }
        return deleted;
    }
}

module.exports = new AsistenciaService();