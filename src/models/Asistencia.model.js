const BaseModel = require('./base.model');
const { pool } = require('../db/connection'); // Asegúrate de que pool sea accesible

class AsistenciaModel extends BaseModel {
    constructor() {
        super('Asistencias'); // Asegúrate de que el nombre de la tabla coincida con tu migración
        this.pool = pool; // Acceso al pool de conexiones si BaseModel no lo pasa
    }

    // Método para encontrar una asistencia por sus FKs clave para unicidad
    async findUniqueAsistencia(id_matricula, id_horario_clase, fecha_asistencia) {
        const [rows] = await this.pool.query(
            `SELECT * FROM ${this.tableName} WHERE id_matricula = ? AND id_horario_clase = ? AND fecha_asistencia = ?`,
            [id_matricula, id_horario_clase, fecha_asistencia]
        );
        return rows[0];
    }

    // Método para obtener todas las asistencias con detalles de Matricula, Alumno, Horario, Docente, Curso, Colegio, etc.
    async getAllWithDetails() {
        const [rows] = await this.pool.query(`
            SELECT
                A.id_asistencia,
                A.fecha_asistencia,
                A.estado_asistencia,
                A.observaciones,
                A.fecha_hora_registro,
                A.url_parte_asistencia,
                M.id_matricula,
                P_ALUMNO.id_persona AS alumno_id_persona,
                P_ALUMNO.nombre AS alumno_nombre,
                P_ALUMNO.apellido AS alumno_apellido,
                HC.id_horario AS horario_id,
                HC.dia_semana,
                HC.hora_inicio,
                HC.hora_fin,
                GC.id_grupo_clase,
                GC.nombre_grupo,
                CUR.nombre_curso,
                P_REGISTRADOR.id_persona AS registrador_id_persona,
                P_REGISTRADOR.nombre AS registrador_nombre,
                P_REGISTRADOR.apellido AS registrador_apellido,
                COL.id_colegio,
                COL.nombre_colegio AS colegio_nombre
            FROM Asistencias AS A
            JOIN Matricula AS M ON A.id_matricula = M.id_matricula
            JOIN Personas AS P_ALUMNO ON M.id_persona = P_ALUMNO.id_persona
            JOIN HorariosClases AS HC ON A.id_horario_clase = HC.id_horario
            JOIN GruposClases AS GC ON HC.id_grupo_clase = GC.id_grupo_clase
            JOIN Docente_Curso AS DC ON HC.id_docente_curso = DC.id_docente_curso
            JOIN Cursos AS CUR ON DC.id_curso = CUR.id_curso
            JOIN Sedes AS S ON GC.id_sede = S.id_sede
            JOIN Colegios AS COL ON S.id_colegio = COL.id_colegio
            LEFT JOIN Personas AS P_REGISTRADOR ON A.registrado_por_persona_id = P_REGISTRADOR.id_persona
        `);
        return rows;
    }

    // Método para obtener una asistencia por ID con detalles
    async getByIdWithDetails(id_asistencia) {
        const [rows] = await this.pool.query(`
            SELECT
                A.id_asistencia,
                A.fecha_asistencia,
                A.estado_asistencia,
                A.observaciones,
                A.fecha_hora_registro,
                A.url_parte_asistencia,
                M.id_matricula,
                P_ALUMNO.id_persona AS alumno_id_persona,
                P_ALUMNO.nombre AS alumno_nombre,
                P_ALUMNO.apellido AS alumno_apellido,
                HC.id_horario AS horario_id,
                HC.dia_semana,
                HC.hora_inicio,
                HC.hora_fin,
                GC.id_grupo_clase,
                GC.nombre_grupo,
                CUR.id_curso,
                CUR.nombre_curso AS curso_nombre,
                P_REGISTRADOR.id_persona AS registrador_id_persona,
                P_REGISTRADOR.nombre AS registrador_nombre,
                P_REGISTRADOR.apellido AS registrador_apellido,
                COL.id_colegio,
                COL.nombre_colegio AS colegio_nombre
            FROM Asistencias AS A
            JOIN Matricula AS M ON A.id_matricula = M.id_matricula
            JOIN Personas AS P_ALUMNO ON M.id_persona = P_ALUMNO.id_persona
            JOIN HorariosClases AS HC ON A.id_horario_clase = HC.id_horario
            JOIN GruposClases AS GC ON HC.id_grupo_clase = GC.id_grupo_clase
            JOIN Docente_Curso AS DC ON HC.id_docente_curso = DC.id_docente_curso
            JOIN Cursos AS CUR ON DC.id_curso = CUR.id_curso
            JOIN Sedes AS S ON GC.id_sede = S.id_sede
            JOIN Colegios AS COL ON S.id_colegio = COL.id_colegio
            LEFT JOIN Personas AS P_REGISTRADOR ON A.registrado_por_persona_id = P_REGISTRADOR.id_persona
            WHERE A.id_asistencia = ?
        `, [id_asistencia]);
        return rows[0];
    }

    // Obtener asistencias por ID de colegio
    async getAsistenciasByColegioId(id_colegio) {
        const [rows] = await this.pool.query(`
            SELECT
                A.id_asistencia, A.fecha_asistencia, A.estado_asistencia,
                P_ALUMNO.nombre AS alumno_nombre, P_ALUMNO.apellido AS alumno_apellido,
                CUR.nombre_curso,
                GC.nombre_grupo
            FROM Asistencias AS A
            JOIN Matricula AS M ON A.id_matricula = M.id_matricula
            JOIN Personas AS P_ALUMNO ON M.id_persona = P_ALUMNO.id_persona
            JOIN HorariosClases AS HC ON A.id_horario_clase = HC.id_horario
            JOIN GruposClases AS GC ON HC.id_grupo_clase = GC.id_grupo_clase
            JOIN Docente_Curso AS DC ON HC.id_docente_curso = DC.id_docente_curso
            JOIN Cursos AS CUR ON DC.id_curso = CUR.id_curso
            JOIN Sedes AS S ON GC.id_sede = S.id_sede
            WHERE S.id_colegio = ?
            ORDER BY A.fecha_asistencia DESC
        `, [id_colegio]);
        return rows;
    }

    // Obtener asistencias de un alumno específico
    async getAsistenciasByAlumnoPersonaId(id_persona) {
        const [rows] = await this.pool.query(`
            SELECT
                A.id_asistencia, A.fecha_asistencia, A.estado_asistencia, A.observaciones,
                CUR.nombre_curso,
                GC.nombre_grupo,
                HC.dia_semana, HC.hora_inicio, HC.hora_fin
            FROM Asistencias AS A
            JOIN Matricula AS M ON A.id_matricula = M.id_matricula
            JOIN HorariosClases AS HC ON A.id_horario_clase = HC.id_horario
            JOIN GruposClases AS GC ON HC.id_grupo_clase = GC.id_grupo_clase
            JOIN Docente_Curso AS DC ON HC.id_docente_curso = DC.id_docente_curso
            JOIN Cursos AS CUR ON DC.id_curso = CUR.id_curso
            WHERE M.id_persona = ?
            ORDER BY A.fecha_asistencia DESC, HC.hora_inicio ASC
        `, [id_persona]);
        return rows;
    }

    // Obtener asistencias registradas por una persona (docente/admin)
    async getAsistenciasByRegistradorPersonaId(id_persona) {
        const [rows] = await this.pool.query(`
            SELECT
                A.id_asistencia, A.fecha_asistencia, A.estado_asistencia,
                P_ALUMNO.nombre AS alumno_nombre, P_ALUMNO.apellido AS alumno_apellido,
                CUR.nombre_curso,
                GC.nombre_grupo
            FROM Asistencias AS A
            JOIN Matricula AS M ON A.id_matricula = M.id_matricula
            JOIN Personas AS P_ALUMNO ON M.id_persona = P_ALUMNO.id_persona
            JOIN HorariosClases AS HC ON A.id_horario_clase = HC.id_horario
            JOIN GruposClases AS GC ON HC.id_grupo_clase = GC.id_grupo_clase
            JOIN Docente_Curso AS DC ON HC.id_docente_curso = DC.id_docente_curso
            JOIN Cursos AS CUR ON DC.id_curso = CUR.id_curso
            WHERE A.registrado_por_persona_id = ?
            ORDER BY A.fecha_asistencia DESC
        `, [id_persona]);
        return rows;
    }

    // Obtener asistencias de un grupo de clase específico
    async getAsistenciasByGrupoClaseId(id_grupo_clase, fecha = null) {
        let query = `
            SELECT
                A.id_asistencia, A.fecha_asistencia, A.estado_asistencia,
                P_ALUMNO.nombre AS alumno_nombre, P_ALUMNO.apellido AS alumno_apellido,
                CUR.nombre_curso,
                HC.hora_inicio, HC.hora_fin, HC.dia_semana
            FROM Asistencias AS A
            JOIN Matricula AS M ON A.id_matricula = M.id_matricula
            JOIN Personas AS P_ALUMNO ON M.id_persona = P_ALUMNO.id_persona
            JOIN HorariosClases AS HC ON A.id_horario_clase = HC.id_horario
            JOIN Docente_Curso AS DC ON HC.id_docente_curso = DC.id_docente_curso
            JOIN Cursos AS CUR ON DC.id_curso = CUR.id_curso
            WHERE HC.id_grupo_clase = ?
        `;
        const params = [id_grupo_clase];

        if (fecha) {
            query += ` AND A.fecha_asistencia = ?`;
            params.push(fecha);
        }
        query += ` ORDER BY P_ALUMNO.apellido ASC, HC.hora_inicio ASC`;

        const [rows] = await this.pool.query(query, params);
        return rows;
    }
}

module.exports = new AsistenciaModel();