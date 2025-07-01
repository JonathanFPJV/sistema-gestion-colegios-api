const BaseModel = require('./base.model');
const { pool } = require('../db/connection'); // Asegúrate de que pool sea accesible

class NotaModel extends BaseModel {
    constructor() {
        super('Notas'); // Asegúrate de que el nombre de la tabla coincida con tu migración
        this.pool = pool; // Acceso al pool de conexiones si BaseModel no lo pasa
    }

    // Método para obtener todas las notas con detalles de Matricula, Persona, Docente, Curso, Colegio, etc.
    async getAllWithDetails() {
        const [rows] = await this.pool.query(`
            SELECT
                N.id_nota,
                N.evaluacion,
                N.nota,
                N.trimestre,
                N.fecha_registro,
                N.url_examen_escaneado,
                M.id_matricula,
                M.anio_lectivo,
                P_ALUMNO.id_persona AS alumno_id_persona,
                P_ALUMNO.nombre AS alumno_nombre,
                P_ALUMNO.apellido AS alumno_apellido,
                GC.id_grupo_clase,
                GC.nombre_grupo,
                DC.id_docente_curso,
                P_DOCENTE.id_persona AS docente_id_persona,
                P_DOCENTE.nombre AS docente_nombre,
                P_DOCENTE.apellido AS docente_apellido,
                CUR.id_curso,
                CUR.nombre_curso AS curso_nombre,
                COL.id_colegio,
                COL.nombre_colegio AS colegio_nombre
            FROM Notas AS N
            JOIN Matricula AS M ON N.id_matricula = M.id_matricula
            JOIN Personas AS P_ALUMNO ON M.id_persona = P_ALUMNO.id_persona
            JOIN Docente_Curso AS DC ON N.id_docente_curso = DC.id_docente_curso
            JOIN Personas AS P_DOCENTE ON DC.id_persona = P_DOCENTE.id_persona
            JOIN Cursos AS CUR ON DC.id_curso = CUR.id_curso
            JOIN GruposClases AS GC ON M.id_grupo_clase = GC.id_grupo_clase
            JOIN Sedes AS S ON GC.id_sede = S.id_sede
            JOIN Colegios AS COL ON S.id_colegio = COL.id_colegio
        `);
        return rows;
    }

    // Método para obtener una nota por ID con detalles
    async getByIdWithDetails(id_nota) {
        const [rows] = await this.pool.query(`
            SELECT
                N.id_nota,
                N.evaluacion,
                N.nota,
                N.trimestre,
                N.fecha_registro,
                N.url_examen_escaneado,
                M.id_matricula,
                M.anio_lectivo,
                P_ALUMNO.id_persona AS alumno_id_persona,
                P_ALUMNO.nombre AS alumno_nombre,
                P_ALUMNO.apellido AS alumno_apellido,
                GC.id_grupo_clase,
                GC.nombre_grupo,
                DC.id_docente_curso,
                P_DOCENTE.id_persona AS docente_id_persona,
                P_DOCENTE.nombre AS docente_nombre,
                P_DOCENTE.apellido AS docente_apellido,
                CUR.id_curso,
                CUR.nombre_curso AS curso_nombre,
                COL.id_colegio,
                COL.nombre_colegio AS colegio_nombre
            FROM Notas AS N
            JOIN Matricula AS M ON N.id_matricula = M.id_matricula
            JOIN Personas AS P_ALUMNO ON M.id_persona = P_ALUMNO.id_persona
            JOIN Docente_Curso AS DC ON N.id_docente_curso = DC.id_docente_curso
            JOIN Personas AS P_DOCENTE ON DC.id_persona = P_DOCENTE.id_persona
            JOIN Cursos AS CUR ON DC.id_curso = CUR.id_curso
            JOIN GruposClases AS GC ON M.id_grupo_clase = GC.id_grupo_clase
            JOIN Sedes AS S ON GC.id_sede = S.id_sede
            JOIN Colegios AS COL ON S.id_colegio = COL.id_colegio
            WHERE N.id_nota = ?
        `, [id_nota]);
        return rows[0];
    }

    // Obtener notas por ID de colegio
    async getNotasByColegioId(id_colegio) {
        const [rows] = await this.pool.query(`
            SELECT
                N.id_nota, N.evaluacion, N.nota, N.trimestre,
                P_ALUMNO.nombre AS alumno_nombre, P_ALUMNO.apellido AS alumno_apellido,
                CUR.nombre_curso,
                P_DOCENTE.nombre AS docente_nombre, P_DOCENTE.apellido AS docente_apellido
            FROM Notas AS N
            JOIN Matricula AS M ON N.id_matricula = M.id_matricula
            JOIN Personas AS P_ALUMNO ON M.id_persona = P_ALUMNO.id_persona
            JOIN Docente_Curso AS DC ON N.id_docente_curso = DC.id_docente_curso
            JOIN Personas AS P_DOCENTE ON DC.id_persona = P_DOCENTE.id_persona
            JOIN Cursos AS CUR ON DC.id_curso = CUR.id_curso
            JOIN GruposClases AS GC ON M.id_grupo_clase = GC.id_grupo_clase
            JOIN Sedes AS S ON GC.id_sede = S.id_sede
            WHERE S.id_colegio = ?
        `, [id_colegio]);
        return rows;
    }

    // Obtener notas de un alumno específico
    async getNotasByAlumnoPersonaId(id_persona) {
        const [rows] = await this.pool.query(`
            SELECT
                N.id_nota, N.evaluacion, N.nota, N.trimestre,
                CUR.nombre_curso,
                P_DOCENTE.nombre AS docente_nombre, P_DOCENTE.apellido AS docente_apellido,
                M.anio_lectivo,
                GC.nombre_grupo
            FROM Notas AS N
            JOIN Matricula AS M ON N.id_matricula = M.id_matricula
            JOIN Docente_Curso AS DC ON N.id_docente_curso = DC.id_docente_curso
            JOIN Personas AS P_DOCENTE ON DC.id_persona = P_DOCENTE.id_persona
            JOIN Cursos AS CUR ON DC.id_curso = CUR.id_curso
            JOIN GruposClases AS GC ON M.id_grupo_clase = GC.id_grupo_clase
            WHERE M.id_persona = ?
            ORDER BY M.anio_lectivo DESC, N.trimestre ASC, CUR.nombre_curso ASC
        `, [id_persona]);
        return rows;
    }

    // Obtener notas puestas por un docente específico
    async getNotasByDocentePersonaId(id_persona) {
        const [rows] = await this.pool.query(`
            SELECT
                N.id_nota, N.evaluacion, N.nota, N.trimestre,
                P_ALUMNO.nombre AS alumno_nombre, P_ALUMNO.apellido AS alumno_apellido,
                CUR.nombre_curso,
                GC.nombre_grupo,
                M.anio_lectivo
            FROM Notas AS N
            JOIN Matricula AS M ON N.id_matricula = M.id_matricula
            JOIN Personas AS P_ALUMNO ON M.id_persona = P_ALUMNO.id_persona
            JOIN Docente_Curso AS DC ON N.id_docente_curso = DC.id_docente_curso
            JOIN Cursos AS CUR ON DC.id_curso = CUR.id_curso
            JOIN GruposClases AS GC ON M.id_grupo_clase = GC.id_grupo_clase
            WHERE DC.id_persona = ?
            ORDER BY M.anio_lectivo DESC, CUR.nombre_curso ASC, P_ALUMNO.apellido ASC
        `, [id_persona]);
        return rows;
    }
}

module.exports = new NotaModel();