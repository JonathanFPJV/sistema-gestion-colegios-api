const TurnoModel = require('../models/Turno.model');

class TurnoService {
    async getAllTurnos() {
        return await TurnoModel.findAll();
    }

    async getTurnoById(id_turno) {
        const turno = await TurnoModel.findById(id_turno);
        if (!turno) {
            throw new Error('Turno no encontrado.');
        }
        return turno;
    }

    async createTurno(turnoData) {
        const { nombre_turno, hora_inicio, hora_fin } = turnoData;

        // Validar unicidad del nombre del turno
        const existingTurno = await TurnoModel.findByName(nombre_turno);
        if (existingTurno) {
            throw new Error('Ya existe un turno con este nombre.');
        }

        // Puedes añadir validaciones para que hora_inicio sea menor que hora_fin
        if (hora_inicio >= hora_fin) {
            throw new Error('La hora de inicio debe ser anterior a la hora de fin.');
        }

        return await TurnoModel.create(turnoData);
    }

    async updateTurno(id_turno, turnoData) {
        const { nombre_turno, hora_inicio, hora_fin } = turnoData;

        const existingTurno = await TurnoModel.findById(id_turno);
        if (!existingTurno) {
            throw new Error('Turno no encontrado.');
        }

        // Validar unicidad del nombre si se intenta cambiar
        if (nombre_turno && nombre_turno !== existingTurno.nombre_turno) {
            const turnoWithSameName = await TurnoModel.findByName(nombre_turno);
            if (turnoWithSameName && turnoWithSameName.id_turno !== id_turno) {
                throw new Error('El nombre de turno ya está en uso.');
            }
        }

        // Validar que hora_inicio sea menor que hora_fin si se actualizan
        const finalHoraInicio = hora_inicio || existingTurno.hora_inicio;
        const finalHoraFin = hora_fin || existingTurno.hora_fin;
        if (finalHoraInicio >= finalHoraFin) {
            throw new Error('La hora de inicio debe ser anterior a la hora de fin.');
        }

        const updated = await TurnoModel.update(id_turno, turnoData);
        if (!updated) {
            throw new Error('No se pudo actualizar el turno.');
        }
        return updated;
    }

    async deleteTurno(id_turno) {
        const turno = await TurnoModel.findById(id_turno);
        if (!turno) {
            throw new Error('Turno no encontrado.');
        }

        // **IMPORTANTE:** Consideraciones para la eliminación de Turnos.
        // Tu migración tiene FKs desde `GruposClases.id_turno` con `ON DELETE RESTRICT`.
        // Esto significa que no podrás eliminar un Turno si hay `GruposClases` asociados a él.
        const deleted = await TurnoModel.delete(id_turno);
        if (!deleted) {
            throw new Error('No se pudo eliminar el turno. Verifique si hay grupos de clases asociados a este turno.');
        }
        return deleted;
    }
}

module.exports = new TurnoService();