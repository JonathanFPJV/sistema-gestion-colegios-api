const GrupoClaseModel = require('../models/GrupoClase.model');
const SedeModel = require('../models/Sede.model');
const AnosAcademicosModel = require('../models/AnosAcademicos.model');
const AulaModel = require('../models/Aula.model');
const TurnoModel = require('../models/Turno.model');

class GrupoClaseService {
    async getAllGruposClases() {
        return await GrupoClaseModel.getAllWithDetails();
    }

    async getGrupoClaseById(id_grupo_clase) {
        const grupo = await GrupoClaseModel.getByIdWithDetails(id_grupo_clase);
        if (!grupo) {
            throw new Error('Grupo/Clase no encontrado.');
        }
        return grupo;
    }

    async createGrupoClase(grupoData) {
        const { id_sede, id_ano_academico, id_aula, id_turno, nombre_grupo, capacidad_actual_alumnos } = grupoData;

        // 1. Validar que todas las FKs existan
        const sedeExists = await SedeModel.findById(id_sede);
        if (!sedeExists) throw new Error('La sede especificada no existe.');

        const anoAcademicoExists = await AnosAcademicosModel.findById(id_ano_academico);
        if (!anoAcademicoExists) throw new Error('El año académico especificado no existe.');

        const aulaExists = await AulaModel.findById(id_aula);
        if (!aulaExists) throw new Error('El aula especificada no existe.');

        const turnoExists = await TurnoModel.findById(id_turno);
        if (!turnoExists) throw new Error('El turno especificado no existe.');

        // 2. Validar que la sede y el aula pertenezcan al mismo colegio (opcional, pero buena práctica si tu lógica lo requiere)
        // Ya lo verificaremos en el controlador si el usuario es Admin Colegio.
        // Si no se hace en el controlador, podrías hacerlo aquí:
        // const sede = await SedeModel.findById(id_sede);
        // const aula = await AulaModel.findById(id_aula);
        // if (sede.id_colegio !== aula.colegio_id) throw new Error('La sede y el aula deben pertenecer al mismo colegio.');


        // 3. Validar unicidad de la combinación de FKs (Sede, Año Académico, Aula, Turno)
        const existingGrupo = await GrupoClaseModel.findUniqueGroup(id_sede, id_ano_academico, id_aula, id_turno);
        if (existingGrupo) {
            throw new Error('Ya existe un grupo/clase con la misma combinación de sede, año académico, aula y turno.');
        }

        // 4. Validar que la capacidad actual no exceda la capacidad del aula
        const aula = await AulaModel.findById(id_aula);
        if (capacidad_actual_alumnos > aula.capacidad) {
            throw new Error('La capacidad actual de alumnos excede la capacidad del aula.');
        }

        const newGrupo = await GrupoClaseModel.create(grupoData);
        return await this.getGrupoClaseById(newGrupo.id); // Retornar con detalles completos
    }

    async updateGrupoClase(id_grupo_clase, grupoData) {
        const { id_sede, id_ano_academico, id_aula, id_turno, capacidad_actual_alumnos } = grupoData;

        const existingGrupo = await GrupoClaseModel.findById(id_grupo_clase);
        if (!existingGrupo) {
            throw new Error('Grupo/Clase no encontrado.');
        }

        // 1. Validar existencia de FKs si se intentan cambiar
        if (id_sede && id_sede !== existingGrupo.id_sede) {
            const sedeExists = await SedeModel.findById(id_sede);
            if (!sedeExists) throw new Error('La nueva sede especificada no existe.');
        }
        if (id_ano_academico && id_ano_academico !== existingGrupo.id_ano_academico) {
            const anoAcademicoExists = await AnosAcademicosModel.findById(id_ano_academico);
            if (!anoAcademicoExists) throw new Error('El nuevo año académico especificado no existe.');
        }
        if (id_aula && id_aula !== existingGrupo.id_aula) {
            const aulaExists = await AulaModel.findById(id_aula);
            if (!aulaExists) throw new Error('La nueva aula especificada no existe.');
        }
        if (id_turno && id_turno !== existingGrupo.id_turno) {
            const turnoExists = await TurnoModel.findById(id_turno);
            if (!turnoExists) throw new Error('El nuevo turno especificado no existe.');
        }

        // 2. Validar unicidad de la combinación de FKs si alguno de ellos se cambia
        const targetSede = id_sede || existingGrupo.id_sede;
        const targetAnoAcademico = id_ano_academico || existingGrupo.id_ano_academico;
        const targetAula = id_aula || existingGrupo.id_aula;
        const targetTurno = id_turno || existingGrupo.id_turno;

        if (id_sede || id_ano_academico || id_aula || id_turno) { // Si alguna de las FKs clave se intenta modificar
            const grupoWithSameFks = await GrupoClaseModel.findUniqueGroup(targetSede, targetAnoAcademico, targetAula, targetTurno);
            if (grupoWithSameFks && grupoWithSameFks.id_grupo_clase !== id_grupo_clase) {
                throw new Error('La combinación de sede, año académico, aula y turno ya existe para otro grupo/clase.');
            }
        }

        // 3. Validar que la capacidad actual no exceda la capacidad del aula (si cambia el aula o la capacidad)
        if (capacidad_actual_alumnos !== undefined || (id_aula && id_aula !== existingGrupo.id_aula)) {
            const aula = await AulaModel.findById(id_aula || existingGrupo.id_aula);
            const finalCapacidadAlumnos = capacidad_actual_alumnos || existingGrupo.capacidad_actual_alumnos;
            if (finalCapacidadAlumnos > aula.capacidad) {
                throw new Error('La capacidad actual de alumnos excede la capacidad del aula.');
            }
        }


        const updated = await GrupoClaseModel.update(id_grupo_clase, grupoData);
        if (!updated) {
            throw new Error('No se pudo actualizar el grupo/clase.');
        }
        return await this.getGrupoClaseById(id_grupo_clase); // Retornar con detalles completos
    }

    async deleteGrupoClase(id_grupo_clase) {
        const grupo = await GrupoClaseModel.findById(id_grupo_clase);
        if (!grupo) {
            throw new Error('Grupo/Clase no encontrado.');
        }

        // **IMPORTANTE:** Consideraciones para la eliminación de GruposClases.
        // Tu migración tiene FKs desde `Matricula.id_grupo_clase` y `HorariosClases.id_grupo_clase` con `ON DELETE CASCADE`.
        // Esto significa que al eliminar un grupo, sus matrículas y horarios de clases asociados también se eliminarán automáticamente.
        const deleted = await GrupoClaseModel.delete(id_grupo_clase);
        if (!deleted) {
            throw new Error('No se pudo eliminar el grupo/clase.');
        }
        return deleted;
    }
}

module.exports = new GrupoClaseService();