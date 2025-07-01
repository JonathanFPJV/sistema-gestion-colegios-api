const BaseModel = require('./base.model');
const { pool } = require('../db/connection'); // Asegúrate de que pool sea accesible

class MatriculaModel extends BaseModel {
    constructor() {
        super('Matricula'); // Asegúrate de que el nombre de la tabla coincida con tu migración
        this.pool = pool; // Acceso al pool de conexiones si BaseModel no lo pasa
    }

    // Método para encontrar una matrícula por sus FKs clave para unicidad
    async findUniqueMatricula(id_persona, id_grupo_clase, anio_lectivo) {
        const [rows] = await this.pool.query(
            `SELECT * FROM ${this.tableName} WHERE id_persona = ? AND id_grupo_clase = ? AND anio_lectivo = ?`,
            [id_persona, id_grupo_clase, anio_lectivo]
        );
        return rows[0];
    }

    // Método para obtener todas las matrículas con detalles de Persona, Grupo, Colegio, etc.
    async getAllWithDetails() {
        const [rows] = await this.pool.query(`
            SELECT
                M.id_matricula,
                M.fecha_matricula,
                M.anio_lectivo,
                M.estado_matricula,
                M.url_contrato_matricula,
                M.url_historial_medico,
                M.url_ficha_socioeconomica,
                M.url_partida_nacimiento,
                M.url_documento_notas_previas,
                P.id_persona, P.nombre AS persona_nombre, P.apellido AS persona_apellido, P.DNI,
                GC.id_grupo_clase, GC.nombre_grupo,
                S.id_sede, S.nombre_sede,
                COL.id_colegio, COL.nombre_colegio
            FROM Matricula AS M
            JOIN Personas AS P ON M.id_persona = P.id_persona
            JOIN GruposClases AS GC ON M.id_grupo_clase = GC.id_grupo_clase
            JOIN Sedes AS S ON GC.id_sede = S.id_sede
            JOIN Colegios AS COL ON S.id_colegio = COL.id_colegio
        `);
        return rows;
    }

    // Método para obtener una matrícula por ID con detalles
    async getByIdWithDetails(id_matricula) {
        const [rows] = await this.pool.query(`
            SELECT
                M.id_matricula,
                M.fecha_matricula,
                M.anio_lectivo,
                M.estado_matricula,
                M.url_contrato_matricula,
                M.url_historial_medico,
                M.url_ficha_socioeconomica,
                M.url_partida_nacimiento,
                M.url_documento_notas_previas,
                P.id_persona, P.nombre AS persona_nombre, P.apellido AS persona_apellido, P.DNI,
                GC.id_grupo_clase, GC.nombre_grupo,
                S.id_sede, S.nombre_sede,
                COL.id_colegio, COL.nombre_colegio
            FROM Matricula AS M
            JOIN Personas AS P ON M.id_persona = P.id_persona
            JOIN GruposClases AS GC ON M.id_grupo_clase = GC.id_grupo_clase
            JOIN Sedes AS S ON GC.id_sede = S.id_sede
            JOIN Colegios AS COL ON S.id_colegio = COL.id_colegio
            WHERE M.id_matricula = ?
        `, [id_matricula]);
        return rows[0];
    }

    // Obtener matrículas por ID de colegio (a través del grupo)
    async getMatriculasByColegioId(id_colegio) {
        const [rows] = await this.pool.query(`
            SELECT
                M.id_matricula,
                P.nombre AS persona_nombre,
                P.apellido AS persona_apellido,
                GC.nombre_grupo,
                M.anio_lectivo,
                M.estado_matricula
            FROM Matricula AS M
            JOIN Personas AS P ON M.id_persona = P.id_persona
            JOIN GruposClases AS GC ON M.id_grupo_clase = GC.id_grupo_clase
            JOIN Sedes AS S ON GC.id_sede = S.id_sede
            WHERE S.id_colegio = ?
        `, [id_colegio]);
        return rows;
    }

    // Obtener matrículas por ID de persona (para un alumno ver sus propias matrículas)
    async getMatriculasByPersonaId(id_persona) {
        const [rows] = await this.pool.query(`
            SELECT
                M.id_matricula,
                GC.nombre_grupo,
                M.anio_lectivo,
                M.estado_matricula,
                S.nombre_sede,
                COL.nombre_colegio
            FROM Matricula AS M
            JOIN GruposClases AS GC ON M.id_grupo_clase = GC.id_grupo_clase
            JOIN Sedes AS S ON GC.id_sede = S.id_sede
            JOIN Colegios AS COL ON S.id_colegio = COL.id_colegio
            WHERE M.id_persona = ?
        `, [id_persona]);
        return rows;
    }

    // Método para incrementar/decrementar capacidad_actual_alumnos en GruposClases
    async updateGrupoClaseCapacity(id_grupo_clase, change) {
        await this.pool.query(
            `UPDATE GruposClases SET capacidad_actual_alumnos = capacidad_actual_alumnos + ? WHERE id_grupo_clase = ?`,
            [change, id_grupo_clase]
        );
    }
}

module.exports = new MatriculaModel();