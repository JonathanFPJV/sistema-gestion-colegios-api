const BaseModel = require('./base.model');
const { pool } = require('../db/connection'); // Asegúrate de que pool sea accesible

class GrupoClaseModel extends BaseModel {
    constructor() {
        super('GruposClases'); // Asegúrate de que el nombre de la tabla coincida con tu migración
        this.pool = pool; // Acceso al pool de conexiones si BaseModel no lo pasa
    }

    // Método para encontrar un grupo por sus FKs clave para unicidad
    async findUniqueGroup(id_sede, id_ano_academico, id_aula, id_turno) {
        const [rows] = await this.pool.query(
            `SELECT * FROM ${this.tableName} WHERE id_sede = ? AND id_ano_academico = ? AND id_aula = ? AND id_turno = ?`,
            [id_sede, id_ano_academico, id_aula, id_turno]
        );
        return rows[0];
    }

    // Método para obtener todos los grupos con detalles de todas sus FKs relacionadas
    async getAllWithDetails() {
        const [rows] = await this.pool.query(`
            SELECT
                GC.id_grupo_clase,
                GC.nombre_grupo,
                GC.capacidad_actual_alumnos,
                S.id_sede, S.nombre_sede, S.direccion AS sede_direccion,
                AA.id_ano_academico, AA.nombre_ano,
                NE.nombre_nivel,
                A.id_aula, A.nombre_aula, A.capacidad AS aula_capacidad,
                T.id_turno, T.nombre_turno, T.hora_inicio, T.hora_fin,
                COL.id_colegio, COL.nombre_colegio
            FROM GruposClases AS GC
            JOIN Sedes AS S ON GC.id_sede = S.id_sede
            JOIN Colegios AS COL ON S.id_colegio = COL.id_colegio
            JOIN AnosAcademicos AS AA ON GC.id_ano_academico = AA.id_ano_academico
            JOIN Nivel_ensenanza AS NE ON AA.id_nivel = NE.id_nivel
            JOIN Aulas AS A ON GC.id_aula = A.id_aula
            JOIN Turnos AS T ON GC.id_turno = T.id_turno
        `);
        return rows;
    }

    // Método para obtener un grupo por ID con detalles de todas sus FKs relacionadas
    async getByIdWithDetails(id_grupo_clase) {
        const [rows] = await this.pool.query(`
            SELECT
                GC.id_grupo_clase,
                GC.nombre_grupo,
                GC.capacidad_actual_alumnos,
                S.id_sede, S.nombre_sede, S.direccion AS sede_direccion,
                AA.id_ano_academico, AA.nombre_ano,
                NE.nombre_nivel,
                A.id_aula, A.nombre_aula, A.capacidad AS aula_capacidad,
                T.id_turno, T.nombre_turno, T.hora_inicio, T.hora_fin,
                COL.id_colegio, COL.nombre_colegio
            FROM GruposClases AS GC
            JOIN Sedes AS S ON GC.id_sede = S.id_sede
            JOIN Colegios AS COL ON S.id_colegio = COL.id_colegio
            JOIN AnosAcademicos AS AA ON GC.id_ano_academico = AA.id_ano_academico
            JOIN Nivel_ensenanza AS NE ON AA.id_nivel = NE.id_nivel
            JOIN Aulas AS A ON GC.id_aula = A.id_aula
            JOIN Turnos AS T ON GC.id_turno = T.id_turno
            WHERE GC.id_grupo_clase = ?
        `, [id_grupo_clase]);
        return rows[0];
    }

    // Obtener grupos por ID de colegio (a través de la sede)
    async getGruposByColegioId(id_colegio) {
        const [rows] = await this.pool.query(`
            SELECT
                GC.id_grupo_clase,
                GC.nombre_grupo,
                GC.capacidad_actual_alumnos,
                S.id_sede, S.nombre_sede,
                AA.id_ano_academico, AA.nombre_ano,
                A.id_aula, A.nombre_aula,
                T.id_turno, T.nombre_turno
            FROM GruposClases AS GC
            JOIN Sedes AS S ON GC.id_sede = S.id_sede
            WHERE S.id_colegio = ?
        `, [id_colegio]);
        return rows;
    }

    // Obtener grupos por ID de sede
    async getGruposBySedeId(id_sede) {
        const [rows] = await this.pool.query(`SELECT * FROM ${this.tableName} WHERE id_sede = ?`, [id_sede]);
        return rows;
    }
}

module.exports = new GrupoClaseModel();