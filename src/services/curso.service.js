const CursoModel = require('../models/Curso.model');
const ColegioModel = require('../models/Colegio.model'); // Para validar la FK

class CursoService {
    async getAllCursos() {
        return await CursoModel.getAllWithColegioDetails();
    }

    async getCursoById(id_curso) {
        const curso = await CursoModel.getByIdWithColegioDetails(id_curso);
        if (!curso) {
            throw new Error('Curso no encontrado.');
        }
        return curso;
    }

    async createCurso(cursoData) {
        const { id_colegio, codigo_curso, nombre_curso } = cursoData;

        // 1. Validar que el id_colegio exista
        const colegioExists = await ColegioModel.findById(id_colegio);
        if (!colegioExists) {
            throw new Error('El colegio especificado no existe.');
        }

        // 2. Validar unicidad de código_curso para el mismo colegio
        const existingByCodigo = await CursoModel.findByCodigoAndColegio(codigo_curso, id_colegio);
        if (existingByCodigo) {
            throw new Error(`Ya existe un curso con el código '${codigo_curso}' para el colegio (ID: ${id_colegio}).`);
        }

        // 3. Validar unicidad de nombre_curso para el mismo colegio
        const existingByName = await CursoModel.findByNameAndColegio(nombre_curso, id_colegio);
        if (existingByName) {
            throw new Error(`Ya existe un curso con el nombre '${nombre_curso}' para el colegio (ID: ${id_colegio}).`);
        }

        const newCurso = await CursoModel.create(cursoData);
        return await this.getCursoById(newCurso.id); // Retornar con detalles del colegio
    }

    async updateCurso(id_curso, cursoData) {
        const { id_colegio, codigo_curso, nombre_curso } = cursoData;

        const existingCurso = await CursoModel.findById(id_curso);
        if (!existingCurso) {
            throw new Error('Curso no encontrado.');
        }

        // 1. Validar que el id_colegio exista si se intenta cambiar (o si se reasigna)
        if (id_colegio && id_colegio !== existingCurso.id_colegio) {
            const colegioExists = await ColegioModel.findById(id_colegio);
            if (!colegioExists) {
                throw new Error('El nuevo colegio especificado para el curso no existe.');
            }
        }

        // 2. Validar unicidad si se intenta cambiar codigo_curso o nombre_curso junto con id_colegio
        const targetColegioId = id_colegio || existingCurso.id_colegio;
        const targetCodigoCurso = codigo_curso || existingCurso.codigo_curso;
        const targetNombreCurso = nombre_curso || existingCurso.nombre_curso;

        if (codigo_curso && codigo_curso !== existingCurso.codigo_curso || (id_colegio && id_colegio !== existingCurso.id_colegio)) {
            const cursoWithSameCodigo = await CursoModel.findByCodigoAndColegio(targetCodigoCurso, targetColegioId);
            if (cursoWithSameCodigo && cursoWithSameCodigo.id_curso !== id_curso) {
                throw new Error(`Ya existe un curso con el código '${targetCodigoCurso}' para el colegio (ID: ${targetColegioId}).`);
            }
        }

        if (nombre_curso && nombre_curso !== existingCurso.nombre_curso || (id_colegio && id_colegio !== existingCurso.id_colegio)) {
            const cursoWithSameName = await CursoModel.findByNameAndColegio(targetNombreCurso, targetColegioId);
            if (cursoWithSameName && cursoWithSameName.id_curso !== id_curso) {
                throw new Error(`Ya existe un curso con el nombre '${targetNombreCurso}' para el colegio (ID: ${targetColegioId}).`);
            }
        }

        const updated = await CursoModel.update(id_curso, cursoData);
        if (!updated) {
            throw new Error('No se pudo actualizar el curso.');
        }
        return await this.getCursoById(id_curso); // Retornar con detalles del colegio
    }

    async deleteCurso(id_curso) {
        const curso = await CursoModel.findById(id_curso);
        if (!curso) {
            throw new Error('Curso no encontrado.');
        }

        // **IMPORTANTE:** Consideraciones para la eliminación de Cursos.
        // Tu migración tiene FKs desde `AsignacionesCursosAnos.id_curso`, `Docente_Curso.id_curso` con `ON DELETE CASCADE`.
        // Esto significa que al eliminar un curso, sus asignaciones a años y las relaciones docente-curso también se eliminarán automáticamente.
        const deleted = await CursoModel.delete(id_curso);
        if (!deleted) {
            throw new Error('No se pudo eliminar el curso.');
        }
        return deleted;
    }
}

module.exports = new CursoService();