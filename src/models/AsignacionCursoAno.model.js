const BaseModel = require('./base.model');
const { pool } = require('../db/connection'); // Asegúrate de que pool sea accesible

class AsignacionCursoAnoModel extends BaseModel {
    constructor() {
        super('AsignacionesCursosAnos'); // Asegúrate de que el nombre de la tabla coincida con tu migración
        this.pool = pool; // Acceso al pool de conexiones si BaseModel no lo pasa
    }

    // Método para encontrar una asignación por sus FKs clave para unicidad
    async findUniqueAssignment(id_curso, id_ano_academico) {
        const [rows] = await this.pool.query(
            `SELECT * FROM ${this.tableName} WHERE id_curso = ? AND id_ano_academico = ?`,
            [id_curso, id_ano_academico]
        );
        return rows[0];
    }

    // Método para obtener todas las asignaciones con detalles del curso y año académico
    async getAllWithDetails() {
        const [rows] = await this.pool.query(`
            SELECT
                ACA.id_asignacion_curso_ano,
                CUR.id_curso,
                CUR.nombre_curso AS curso_nombre,
                CUR.codigo_curso AS curso_codigo,
                AA.id_ano_academico,
                AA.nombre_ano AS ano_nombre,
                NE.nombre_nivel AS nivel_nombre,
                COL.id_colegio,
                COL.nombre_colegio AS colegio_nombre
            FROM AsignacionesCursosAnos AS ACA
            JOIN Cursos AS CUR ON ACA.id_curso = CUR.id_curso
            JOIN Colegios AS COL ON CUR.id_colegio = COL.id_colegio
            JOIN AnosAcademicos AS AA ON ACA.id_ano_academico = AA.id_ano_academico
            JOIN Nivel_ensenanza AS NE ON AA.id_nivel = NE.id_nivel
        `);
        return rows;
    }

    // Método para obtener una asignación por ID con detalles del curso y año académico
    async getByIdWithDetails(id_asignacion_curso_ano) {
        const [rows] = await this.pool.query(`
            SELECT
                ACA.id_asignacion_curso_ano,
                CUR.id_curso,
                CUR.nombre_curso AS curso_nombre,
                CUR.codigo_curso AS curso_codigo,
                AA.id_ano_academico,
                AA.nombre_ano AS ano_nombre,
                NE.nombre_nivel AS nivel_nombre,
                COL.id_colegio,
                COL.nombre_colegio AS colegio_nombre
            FROM AsignacionesCursosAnos AS ACA
            JOIN Cursos AS CUR ON ACA.id_curso = CUR.id_curso
            JOIN Colegios AS COL ON CUR.id_colegio = COL.id_colegio
            JOIN AnosAcademicos AS AA ON ACA.id_ano_academico = AA.id_ano_academico
            JOIN Nivel_ensenanza AS NE ON AA.id_nivel = NE.id_nivel
            WHERE ACA.id_asignacion_curso_ano = ?
        `, [id_asignacion_curso_ano]);
        return rows[0];
    }

    // Obtener asignaciones por ID de colegio (a través del curso)
    async getAsignacionesByColegioId(id_colegio) {
        const [rows] = await this.pool.query(`
            SELECT
                ACA.id_asignacion_curso_ano,
                CUR.nombre_curso,
                AA.nombre_ano
            FROM AsignacionesCursosAnos AS ACA
            JOIN Cursos AS CUR ON ACA.id_curso = CUR.id_curso
            JOIN AnosAcademicos AS AA ON ACA.id_ano_academico = AA.id_ano_academico
            WHERE CUR.id_colegio = ?
        `, [id_colegio]);
        return rows;
    }
}

module.exports = new AsignacionCursoAnoModel();