const NotaModel = require('../models/Nota.model');
const MatriculaModel = require('../models/Matricula.model');     // Para validar id_matricula
const DocenteCursoModel = require('../models/DocenteCurso.model'); // Para validar id_docente_curso y obtener docente_id_persona y curso_id

class NotaService {
    async getAllNotas() {
        return await NotaModel.getAllWithDetails();
    }

    async getNotaById(id_nota) {
        const nota = await NotaModel.getByIdWithDetails(id_nota);
        if (!nota) {
            throw new Error('Nota no encontrada.');
        }
        return nota;
    }

    async createNota(notaData) {
        const { id_matricula, id_docente_curso, evaluacion, nota, trimestre, fecha_registro, url_examen_escaneado } = notaData;

        // 1. Validar que id_matricula exista
        const matricula = await MatriculaModel.getByIdWithDetails(id_matricula);
        if (!matricula) throw new Error('La matrícula especificada no existe.');

        // 2. Validar que id_docente_curso exista
        const docenteCurso = await DocenteCursoModel.getByIdWithDetails(id_docente_curso);
        if (!docenteCurso) throw new Error('La asignación Docente-Curso especificada no existe.');

        // 3. Validar que el docente (de docenteCurso) sea el mismo que el docente_curso.id_persona
        // Y que el curso (de docenteCurso) sea el mismo que el curso de la matrícula.
        // Esto es CRÍTICO para asegurar que el docente está poniendo nota al alumno correcto en el curso correcto.
        if (docenteCurso.curso_id !== matricula.curso_id) { // Asume que matricula.curso_id existe o puedes obtenerlo
            // Necesitamos saber el curso del grupo de la matrícula.
            // Para eso, necesitaríamos un JOIN adicional en getByIdWithDetails de Matricula
            // o pasarlo como parte de la data.
            // Por ahora, para esta validación, si no está directo en matricula, habría que consultarlo:
            const [matriculaCurso] = await NotaModel.pool.query(`
                SELECT CUR.id_curso FROM GruposClases GC
                JOIN AnosAcademicos AA ON GC.id_ano_academico = AA.id_ano_academico
                JOIN AsignacionesCursosAnos ACA ON AA.id_ano_academico = ACA.id_ano_academico
                JOIN Cursos CUR ON ACA.id_curso = CUR.id_curso
                WHERE GC.id_grupo_clase = ?
                AND ACA.id_curso = ?
                LIMIT 1
            `, [matricula.id_grupo_clase, docenteCurso.curso_id]); // Verifica si el curso es parte del grupo
            if (matriculaCurso.length === 0) {
                 throw new Error('El curso de la asignación Docente-Curso no corresponde a este grupo de matrícula.');
            }
        }


        // 4. Validar el rango de la nota (ej. 0.00 a 20.00 o 0.00 a 100.00)
        if (nota < 0 || nota > 20) { // Ajusta el rango según tu sistema de calificación
            throw new Error('La nota debe estar entre 0 y 20.');
        }

        // Puedes añadir validaciones para que un alumno no tenga dos notas del mismo tipo para el mismo trimestre, curso, etc.
        // Esto requeriría una consulta única compuesta: (id_matricula, id_docente_curso, evaluacion, trimestre)
        /*
        const [existingNoteForType] = await NotaModel.pool.query(`
            SELECT id_nota FROM Notas WHERE id_matricula = ? AND id_docente_curso = ? AND evaluacion = ? AND trimestre = ?
        `, [id_matricula, id_docente_curso, evaluacion, trimestre]);
        if (existingNoteForType.length > 0) {
            throw new Error('Ya existe una nota de este tipo para el alumno en este curso y trimestre.');
        }
        */

        const newNota = await NotaModel.create(notaData);
        return await this.getNotaById(newNota.id); // Retornar con detalles completos
    }

    async updateNota(id_nota, notaData) {
        const { id_matricula, id_docente_curso, nota, evaluacion, trimestre } = notaData;

        const existingNota = await NotaModel.findById(id_nota);
        if (!existingNota) {
            throw new Error('Nota no encontrada.');
        }

        // 1. Validar existencia de FKs si se intentan cambiar
        if (id_matricula && id_matricula !== existingNota.id_matricula) {
            const matriculaExists = await MatriculaModel.findById(id_matricula);
            if (!matriculaExists) throw new Error('La nueva matrícula especificada no existe.');
        }
        if (id_docente_curso && id_docente_curso !== existingNota.id_docente_curso) {
            const docenteCursoExists = await DocenteCursoModel.findById(id_docente_curso);
            if (!docenteCursoExists) throw new Error('La nueva asignación Docente-Curso especificada no existe.');
        }

        // 2. Validar que la nueva nota esté en el rango
        if (nota !== undefined && (nota < 0 || nota > 20)) {
            throw new Error('La nota debe estar entre 0 y 20.');
        }

        // Opcional: Validar unicidad si la combinación de (id_matricula, id_docente_curso, evaluacion, trimestre) cambia
        // Esto es más complejo y depende de si permites múltiples notas por la misma evaluación en el mismo trimestre.
        // Si la combinación es única, la migración de DB debería tener un unique constraint.

        const updated = await NotaModel.update(id_nota, notaData);
        if (!updated) {
            throw new Error('No se pudo actualizar la nota.');
        }
        return await this.getNotaById(id_nota); // Retornar con detalles completos
    }

    async deleteNota(id_nota) {
        const nota = await NotaModel.findById(id_nota);
        if (!nota) {
            throw new Error('Nota no encontrada.');
        }

        // **IMPORTANTE:** Consideraciones para la eliminación de Notas.
        // No hay FKs que dependan de Notas, así que la eliminación es directa.
        const deleted = await NotaModel.delete(id_nota);
        if (!deleted) {
            throw new Error('No se pudo eliminar la nota.');
        }
        return deleted;
    }
}

module.exports = new NotaService();