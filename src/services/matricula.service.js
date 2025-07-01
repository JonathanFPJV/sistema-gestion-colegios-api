const MatriculaModel = require('../models/Matricula.model');
const PersonaModel = require('../models/Persona.model');     // Para validar id_persona y rol
const GrupoClaseModel = require('../models/GrupoClase.model'); // Para validar id_grupo_clase y capacidad
const RolModel = require('../models/Rol.model');             // Para obtener el id del rol 'Alumno'

class MatriculaService {
    async getAllMatriculas() {
        return await MatriculaModel.getAllWithDetails();
    }

    async getMatriculaById(id_matricula) {
        const matricula = await MatriculaModel.getByIdWithDetails(id_matricula);
        if (!matricula) {
            throw new Error('Matrícula no encontrada.');
        }
        return matricula;
    }

    async createMatricula(matriculaData) {
        const { id_persona, id_grupo_clase, anio_lectivo, estado_matricula, fecha_matricula } = matriculaData;

        // 1. Validar que id_persona exista y que tenga el rol de 'Alumno'
        const persona = await PersonaModel.findById(id_persona);
        if (!persona) throw new Error('La persona especificada no existe.');
        
        const [userCheck] = await PersonaModel.pool.query( // Usamos pool para una query directa
            `SELECT U.id_rol FROM Usuarios U WHERE U.id_persona = ?`,
            [id_persona]
        );
        if (userCheck.length === 0) {
            throw new Error('La persona no tiene una cuenta de usuario asociada.');
        }
        const rolAlumno = await RolModel.findByName('Alumno');
        if (!rolAlumno || userCheck[0].id_rol !== rolAlumno.id_rol) {
            throw new Error('La persona no tiene el rol de Alumno.');
        }

        // 2. Validar que id_grupo_clase exista
        const grupo = await GrupoClaseModel.getByIdWithDetails(id_grupo_clase);
        if (!grupo) throw new Error('El grupo/clase especificado no existe.');

        // 3. Validar unicidad de la matrícula (id_persona, id_grupo_clase, anio_lectivo)
        const existingMatricula = await MatriculaModel.findUniqueMatricula(id_persona, id_grupo_clase, anio_lectivo);
        if (existingMatricula) {
            throw new Error(`Esta persona ya está matriculada en este grupo para el año ${anio_lectivo}.`);
        }

        // 4. Validar que la capacidad del grupo no se exceda
        if (grupo.capacidad_actual_alumnos >= grupo.aula_capacidad) { // aula_capacidad viene de getByIdWithDetails del grupo
            throw new Error('La capacidad máxima de alumnos para este grupo ha sido alcanzada.');
        }

        const newMatricula = await MatriculaModel.create(matriculaData);

        // 5. Incrementar capacidad_actual_alumnos en GruposClases
        await MatriculaModel.updateGrupoClaseCapacity(id_grupo_clase, 1);

        return await this.getMatriculaById(newMatricula.id); // Retornar con detalles completos
    }

    async updateMatricula(id_matricula, matriculaData) {
        const { id_persona, id_grupo_clase, anio_lectivo, estado_matricula } = matriculaData;

        const existingMatricula = await MatriculaModel.getByIdWithDetails(id_matricula);
        if (!existingMatricula) {
            throw new Error('Matrícula no encontrada.');
        }

        // 1. Validar existencia de FKs si se intentan cambiar y su rol
        if (id_persona && id_persona !== existingMatricula.id_persona) {
            const persona = await PersonaModel.findById(id_persona);
            if (!persona) throw new Error('La nueva persona especificada no existe.');
            const [userCheck] = await PersonaModel.pool.query(
                `SELECT U.id_rol FROM Usuarios U WHERE U.id_persona = ?`,
                [id_persona]
            );
            const rolAlumno = await RolModel.findByName('Alumno');
            if (userCheck.length === 0 || userCheck[0].id_rol !== rolAlumno.id_rol) {
                throw new Error('La nueva persona asignada no tiene el rol de Alumno.');
            }
        }
        if (id_grupo_clase && id_grupo_clase !== existingMatricula.id_grupo_clase) {
            const grupoExists = await GrupoClaseModel.findById(id_grupo_clase);
            if (!grupoExists) throw new Error('El nuevo grupo/clase especificado no existe.');
        }

        // 2. Validar unicidad de la combinación de FKs si alguno de ellos se cambia
        const targetPersonaId = id_persona || existingMatricula.id_persona;
        const targetGrupoClaseId = id_grupo_clase || existingMatricula.id_grupo_clase;
        const targetAnioLectivo = anio_lectivo || existingMatricula.anio_lectivo;

        if (id_persona !== undefined || id_grupo_clase !== undefined || anio_lectivo !== undefined) {
            const matriculaWithSameFks = await MatriculaModel.findUniqueMatricula(targetPersonaId, targetGrupoClaseId, targetAnioLectivo);
            if (matriculaWithSameFks && matriculaWithSameFks.id_matricula !== id_matricula) {
                throw new Error(`La nueva combinación de persona, grupo y año ${targetAnioLectivo} ya existe para otra matrícula.`);
            }
        }

        // 3. Manejar cambio de capacidad si el grupo de clase cambia
        if (id_grupo_clase && id_grupo_clase !== existingMatricula.id_grupo_clase) {
            // Decrementar capacidad del grupo anterior
            await MatriculaModel.updateGrupoClaseCapacity(existingMatricula.id_grupo_clase, -1);
            // Incrementar capacidad del nuevo grupo
            const newGrupo = await GrupoClaseModel.getByIdWithDetails(id_grupo_clase);
            if (newGrupo.capacidad_actual_alumnos >= newGrupo.aula_capacidad) {
                // Si el nuevo grupo está lleno, revertir y lanzar error
                await MatriculaModel.updateGrupoClaseCapacity(existingMatricula.id_grupo_clase, 1); // Revertir
                throw new Error('La capacidad máxima de alumnos para el nuevo grupo ha sido alcanzada.');
            }
            await MatriculaModel.updateGrupoClaseCapacity(id_grupo_clase, 1);
        } else if (estado_matricula && estado_matricula === 'Retirado' && existingMatricula.estado_matricula !== 'Retirado') {
             // Si el estado cambia a 'Retirado', decrementar capacidad del grupo actual
             await MatriculaModel.updateGrupoClaseCapacity(existingMatricula.id_grupo_clase, -1);
        } else if (estado_matricula && estado_matricula === 'Activa' && existingMatricula.estado_matricula === 'Retirado') {
            // Si el estado cambia de 'Retirado' a 'Activa', incrementar capacidad (validando antes)
            const currentGrupo = await GrupoClaseModel.getByIdWithDetails(existingMatricula.id_grupo_clase);
            if (currentGrupo.capacidad_actual_alumnos >= currentGrupo.aula_capacidad) {
                throw new Error('No se puede reactivar la matrícula, el grupo está lleno.');
            }
            await MatriculaModel.updateGrupoClaseCapacity(existingMatricula.id_grupo_clase, 1);
        }


        const updated = await MatriculaModel.update(id_matricula, matriculaData);
        if (!updated) {
            throw new Error('No se pudo actualizar la matrícula.');
        }
        return await this.getMatriculaById(id_matricula); // Retornar con detalles completos
    }

    async deleteMatricula(id_matricula) {
        const matricula = await MatriculaModel.getByIdWithDetails(id_matricula);
        if (!matricula) {
            throw new Error('Matrícula no encontrada.');
        }

        // 1. Decrementar capacidad_actual_alumnos en GruposClases antes de eliminar
        if (matricula.estado_matricula === 'Activa') { // Solo si la matrícula estaba activa
            await MatriculaModel.updateGrupoClaseCapacity(matricula.id_grupo_clase, -1);
        }

        // **IMPORTANTE:** Consideraciones para la eliminación de Matricula.
        // Tu migración tiene FKs desde `Notas.id_matricula` y `Asistencias.id_matricula` con `ON DELETE CASCADE`.
        // Esto significa que al eliminar una matrícula, sus notas y registros de asistencia asociados también se eliminarán automáticamente.
        const deleted = await MatriculaModel.delete(id_matricula);
        if (!deleted) {
            // Si falla la eliminación, intentar revertir el cambio de capacidad
            if (matricula.estado_matricula === 'Activa') {
                await MatriculaModel.updateGrupoClaseCapacity(matricula.id_grupo_clase, 1);
            }
            throw new Error('No se pudo eliminar la matrícula.');
        }
        return deleted;
    }
}

module.exports = new MatriculaService();