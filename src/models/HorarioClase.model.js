const BaseModel = require('./base.model');
const { pool } = require('../db/connection'); // Asegúrate de que pool sea accesible

class HorarioClaseModel extends BaseModel {
    constructor() {
        super('HorariosClases'); // Asegúrate de que el nombre de la tabla coincida con tu migración
        this.pool = pool; // Acceso al pool de conexiones si BaseModel no lo pasa
    }

    // Método para encontrar un horario por sus FKs clave para unicidad
    async findUniqueSchedule(id_grupo_clase, dia_semana, hora_inicio, hora_fin) {
        const [rows] = await this.pool.query(
            `SELECT * FROM ${this.tableName} WHERE id_grupo_clase = ? AND dia_semana = ? AND hora_inicio = ? AND hora_fin = ?`,
            [id_grupo_clase, dia_semana, hora_inicio, hora_fin]
        );
        return rows[0];
    }

    // Método para obtener todos los horarios con detalles de Grupo, Docente, Curso, etc.
    async getAllWithDetails() {
        const [rows] = await this.pool.query(`
            SELECT
                HC.id_horario,
                HC.dia_semana,
                HC.hora_inicio,
                HC.hora_fin,
                GC.id_grupo_clase,
                GC.nombre_grupo AS grupo_nombre,
                S.nombre_sede,
                AA.nombre_ano,
                A.nombre_aula,
                T.nombre_turno,
                DC.id_docente_curso,
                P.nombre AS docente_nombre,
                P.apellido AS docente_apellido,
                CUR.nombre_curso AS curso_nombre,
                COL.id_colegio,
                COL.nombre_colegio AS colegio_nombre
            FROM HorariosClases AS HC
            JOIN GruposClases AS GC ON HC.id_grupo_clase = GC.id_grupo_clase
            JOIN Sedes AS S ON GC.id_sede = S.id_sede
            JOIN Colegios AS COL ON S.id_colegio = COL.id_colegio
            JOIN AnosAcademicos AS AA ON GC.id_ano_academico = AA.id_ano_academico
            JOIN Aulas AS A ON GC.id_aula = A.id_aula
            JOIN Turnos AS T ON GC.id_turno = T.id_turno
            JOIN Docente_Curso AS DC ON HC.id_docente_curso = DC.id_docente_curso
            JOIN Personas AS P ON DC.id_persona = P.id_persona
            JOIN Cursos AS CUR ON DC.id_curso = CUR.id_curso
        `);
        return rows;
    }

    // Método para obtener un horario por ID con detalles
    async getByIdWithDetails(id_horario) {
        const [rows] = await this.pool.query(`
            SELECT
                HC.id_horario,
                HC.dia_semana,
                HC.hora_inicio,
                HC.hora_fin,
                GC.id_grupo_clase,
                GC.nombre_grupo AS grupo_nombre,
                S.nombre_sede,
                AA.nombre_ano,
                A.nombre_aula,
                T.nombre_turno,
                DC.id_docente_curso,
                P.id_persona AS docente_persona_id,
                P.nombre AS docente_nombre,
                P.apellido AS docente_apellido,
                CUR.id_curso AS curso_id,
                CUR.nombre_curso AS curso_nombre,
                COL.id_colegio,
                COL.nombre_colegio AS colegio_nombre
            FROM HorariosClases AS HC
            JOIN GruposClases AS GC ON HC.id_grupo_clase = GC.id_grupo_clase
            JOIN Sedes AS S ON GC.id_sede = S.id_sede
            JOIN Colegios AS COL ON S.id_colegio = COL.id_colegio
            JOIN AnosAcademicos AS AA ON GC.id_ano_academico = AA.id_ano_academico
            JOIN Aulas AS A ON GC.id_aula = A.id_aula
            JOIN Turnos AS T ON GC.id_turno = T.id_turno
            JOIN Docente_Curso AS DC ON HC.id_docente_curso = DC.id_docente_curso
            JOIN Personas AS P ON DC.id_persona = P.id_persona
            JOIN Cursos AS CUR ON DC.id_curso = CUR.id_curso
            WHERE HC.id_horario = ?
        `, [id_horario]);
        return rows[0];
    }

    // Obtener horarios por ID de colegio (a través del grupo)
    async getHorariosByColegioId(id_colegio) {
        const [rows] = await this.pool.query(`
            SELECT
                HC.id_horario,
                HC.dia_semana,
                HC.hora_inicio,
                HC.hora_fin,
                GC.nombre_grupo,
                P.nombre AS docente_nombre,
                P.apellido AS docente_apellido,
                CUR.nombre_curso
            FROM HorariosClases AS HC
            JOIN GruposClases AS GC ON HC.id_grupo_clase = GC.id_grupo_clase
            JOIN Sedes AS S ON GC.id_sede = S.id_sede
            JOIN Docente_Curso AS DC ON HC.id_docente_curso = DC.id_docente_curso
            JOIN Personas AS P ON DC.id_persona = P.id_persona
            JOIN Cursos AS CUR ON DC.id_curso = CUR.id_curso
            WHERE S.id_colegio = ?
        `, [id_colegio]);
        return rows;
    }

    // Obtener horarios por ID de persona (docente)
    async getHorariosByDocentePersonaId(id_persona) {
        const [rows] = await this.pool.query(`
            SELECT
                HC.id_horario,
                HC.dia_semana,
                HC.hora_inicio,
                HC.hora_fin,
                GC.nombre_grupo,
                CUR.nombre_curso,
                S.nombre_sede,
                A.nombre_aula
            FROM HorariosClases AS HC
            JOIN Docente_Curso AS DC ON HC.id_docente_curso = DC.id_docente_curso
            JOIN GruposClases AS GC ON HC.id_grupo_clase = GC.id_grupo_clase
            JOIN Sedes AS S ON GC.id_sede = S.id_sede
            JOIN Aulas AS A ON GC.id_aula = A.id_aula
            JOIN Cursos AS CUR ON DC.id_curso = CUR.id_curso
            WHERE DC.id_persona = ?
        `, [id_persona]);
        return rows;
    }

    // Obtener horarios por ID de grupo de clase
    async getHorariosByGrupoClaseId(id_grupo_clase) {
        const [rows] = await this.pool.query(`
            SELECT
                HC.id_horario,
                HC.dia_semana,
                HC.hora_inicio,
                HC.hora_fin,
                P.nombre AS docente_nombre,
                P.apellido AS docente_apellido,
                CUR.nombre_curso
            FROM HorariosClases AS HC
            JOIN Docente_Curso AS DC ON HC.id_docente_curso = DC.id_docente_curso
            JOIN Personas AS P ON DC.id_persona = P.id_persona
            JOIN Cursos AS CUR ON DC.id_curso = CUR.id_curso
            WHERE HC.id_grupo_clase = ?
        `, [id_grupo_clase]);
        return rows;
    }
}

module.exports = new HorarioClaseModel();