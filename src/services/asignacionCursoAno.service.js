const AsignacionCursoAnoModel = require('../models/AsignacionCursoAno.model');
const CursoModel = require('../models/Curso.model'); // Para validar la FK
const AnosAcademicosModel = require('../models/AnosAcademicos.model'); // Para validar la FK

class AsignacionCursoAnoService {
    async getAllAsignaciones() {
        return await AsignacionCursoAnoModel.getAllWithDetails();
    }

    async getAsignacionById(id_asignacion_curso_ano) {
        const asignacion = await AsignacionCursoAnoModel.getByIdWithDetails(id_asignacion_curso_ano);
        if (!asignacion) {
            throw new Error('Asignación de curso a año no encontrada.');
        }
        return asignacion;
    }

    async createAsignacion(asignacionData) {
        const { id_curso, id_ano_academico } = asignacionData;

        // 1. Validar que id_curso exista
        const cursoExists = await CursoModel.findById(id_curso);
        if (!cursoExists) {
            throw new Error('El curso especificado no existe.');
        }

        // 2. Validar que id_ano_academico exista
        const anoAcademicoExists = await AnosAcademicosModel.findById(id_ano_academico);
        if (!anoAcademicoExists) {
            throw new Error('El año académico especificado no existe.');
        }

        // 3. Validar unicidad de la combinación (id_curso, id_ano_academico)
        const existingAsignacion = await AsignacionCursoAnoModel.findUniqueAssignment(id_curso, id_ano_academico);
        if (existingAsignacion) {
            throw new Error('Este curso ya está asignado a este año académico.');
        }

        const newAsignacion = await AsignacionCursoAnoModel.create(asignacionData);
        return await this.getAsignacionById(newAsignacion.id); // Retornar con detalles completos
    }

    async updateAsignacion(id_asignacion_curso_ano, asignacionData) {
        const { id_curso, id_ano_academico } = asignacionData;

        const existingAsignacion = await AsignacionCursoAnoModel.findById(id_asignacion_curso_ano);
        if (!existingAsignacion) {
            throw new Error('Asignación de curso a año no encontrada.');
        }

        // 1. Validar existencia de FKs si se intentan cambiar
        if (id_curso && id_curso !== existingAsignacion.id_curso) {
            const cursoExists = await CursoModel.findById(id_curso);
            if (!cursoExists) {
                throw new Error('El nuevo curso especificado no existe.');
            }
        }
        if (id_ano_academico && id_ano_academico !== existingAsignacion.id_ano_academico) {
            const anoAcademicoExists = await AnosAcademicosModel.findById(id_ano_academico);
            if (!anoAcademicoExists) {
                throw new Error('El nuevo año académico especificado no existe.');
            }
        }

        // 2. Validar unicidad de la combinación de FKs si alguno de ellos se cambia
        const targetCursoId = id_curso || existingAsignacion.id_curso;
        const targetAnoAcademicoId = id_ano_academico || existingAsignacion.id_ano_academico;

        if (id_curso !== undefined || id_ano_academico !== undefined) { // Si alguna de las FKs clave se intenta modificar
            const asignacionWithSameFks = await AsignacionCursoAnoModel.findUniqueAssignment(targetCursoId, targetAnoAcademicoId);
            if (asignacionWithSameFks && asignacionWithSameFks.id_asignacion_curso_ano !== id_asignacion_curso_ano) {
                throw new Error('La nueva combinación de curso y año académico ya existe para otra asignación.');
            }
        }

        const updated = await AsignacionCursoAnoModel.update(id_asignacion_curso_ano, asignacionData);
        if (!updated) {
            throw new Error('No se pudo actualizar la asignación de curso a año.');
        }
        return await this.getAsignacionById(id_asignacion_curso_ano); // Retornar con detalles completos
    }

    async deleteAsignacion(id_asignacion_curso_ano) {
        const asignacion = await AsignacionCursoAnoModel.findById(id_asignacion_curso_ano);
        if (!asignacion) {
            throw new Error('Asignación de curso a año no encontrada.');
        }

        // **IMPORTANTE:** Consideraciones para la eliminación de AsignacionesCursosAnos.
        // Tu migración tiene FKs desde `HorariosClases.id_docente_curso` y `Notas.id_docente_curso` que eventualmente dependen
        // de `Docente_Curso`, que a su vez depende de `Cursos`. La relación no es directa aquí.
        // Las FKs de esta tabla a `Cursos` y `AnosAcademicos` son `ON DELETE CASCADE`.
        // Sin embargo, si quieres asegurar que no se elimine una asignación si ya está en uso en `Docente_Curso`,
        // necesitarías validar eso aquí, o confiar en las restricciones de la DB si hubieran.
        const deleted = await AsignacionCursoAnoModel.delete(id_asignacion_curso_ano);
        if (!deleted) {
            throw new Error('No se pudo eliminar la asignación de curso a año.');
        }
        return deleted;
    }
}

module.exports = new AsignacionCursoAnoService();