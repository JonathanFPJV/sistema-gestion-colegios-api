const BaseModel = require('./base.model');
const { pool } = require('../db/connection'); // Asegúrate de que pool sea accesible

class DocenteCursoModel extends BaseModel {
    constructor() {
        super('Docente_Curso'); // Asegúrate de que el nombre de la tabla coincida con tu migración
        this.pool = pool; // Acceso al pool de conexiones si BaseModel no lo pasa
    }

    // Método para encontrar una asignación docente-curso por sus FKs clave para unicidad
    async findUniqueAssignment(id_persona, id_curso) {
        const [rows] = await this.pool.query(
            `SELECT * FROM ${this.tableName} WHERE id_persona = ? AND id_curso = ?`,
            [id_persona, id_curso]
        );
        return rows[0];
    }

    // Método para obtener todas las asignaciones docente-curso con detalles de Persona, Rol y Curso
    async getAllWithDetails() {
        const [rows] = await this.pool.query(`
            SELECT
                DC.id_docente_curso,
                P.id_persona,
                P.nombre AS persona_nombre,
                P.apellido AS persona_apellido,
                U.especialidad, -- Asumiendo que especialidad está en Usuarios, que es lo que tienes
                R.nombre AS rol_nombre,
                CUR.id_curso,
                CUR.nombre_curso AS curso_nombre,
                CUR.codigo_curso AS curso_codigo,
                COL.id_colegio,
                COL.nombre_colegio AS colegio_nombre
            FROM Docente_Curso AS DC
            JOIN Personas AS P ON DC.id_persona = P.id_persona
            JOIN Usuarios AS U ON P.id_persona = U.id_persona -- Para especialidad
            JOIN Roles AS R ON U.id_rol = R.id_rol -- Para confirmar que es Docente
            JOIN Cursos AS CUR ON DC.id_curso = CUR.id_curso
            JOIN Colegios AS COL ON CUR.id_colegio = COL.id_colegio
        `);
        return rows;
    }

    // Método para obtener una asignación docente-curso por ID con detalles
    async getByIdWithDetails(id_docente_curso) {
        const [rows] = await this.pool.query(`
            SELECT
                DC.id_docente_curso,
                P.id_persona,
                P.nombre AS persona_nombre,
                P.apellido AS persona_apellido,
                U.especialidad,
                R.nombre AS rol_nombre,
                CUR.id_curso,
                CUR.nombre_curso AS curso_nombre,
                CUR.codigo_curso AS curso_codigo,
                COL.id_colegio,
                COL.nombre_colegio AS colegio_nombre
            FROM Docente_Curso AS DC
            JOIN Personas AS P ON DC.id_persona = P.id_persona
            JOIN Usuarios AS U ON P.id_persona = U.id_persona
            JOIN Roles AS R ON U.id_rol = R.id_rol
            JOIN Cursos AS CUR ON DC.id_curso = CUR.id_curso
            JOIN Colegios AS COL ON CUR.id_colegio = COL.id_colegio
            WHERE DC.id_docente_curso = ?
        `, [id_docente_curso]);
        return rows[0];
    }

    // Obtener asignaciones por ID de persona (para ver qué cursos puede enseñar un docente)
    async getAsignacionesByPersonaId(id_persona) {
        const [rows] = await this.pool.query(`
            SELECT
                DC.id_docente_curso,
                CUR.id_curso,
                CUR.nombre_curso,
                CUR.codigo_curso
            FROM Docente_Curso AS DC
            JOIN Cursos AS CUR ON DC.id_curso = CUR.id_curso
            WHERE DC.id_persona = ?
        `, [id_persona]);
        return rows;
    }

    // Obtener asignaciones por ID de curso (para ver qué docentes pueden enseñar un curso)
    async getAsignacionesByCursoId(id_curso) {
        const [rows] = await this.pool.query(`
            SELECT
                DC.id_docente_curso,
                P.id_persona,
                P.nombre AS persona_nombre,
                P.apellido AS persona_apellido
            FROM Docente_Curso AS DC
            JOIN Personas AS P ON DC.id_persona = P.id_persona
            WHERE DC.id_curso = ?
        `, [id_curso]);
        return rows;
    }
    // Obtener asignaciones por ID de colegio (a través del curso)
    async getAsignacionesByColegioId(id_colegio) {
        const [rows] = await this.pool.query(`
            SELECT
                DC.id_docente_curso,
                P.nombre AS persona_nombre,
                P.apellido AS persona_apellido,
                CUR.nombre_curso AS curso_nombre
            FROM Docente_Curso AS DC
            JOIN Cursos AS CUR ON DC.id_curso = CUR.id_curso
            JOIN Personas AS P ON DC.id_persona = P.id_persona
            WHERE CUR.id_colegio = ?
        `, [id_colegio]);
        return rows;
    }
}

module.exports = new DocenteCursoModel();