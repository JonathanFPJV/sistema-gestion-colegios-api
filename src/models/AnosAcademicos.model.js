const BaseModel = require('./base.model');
const { pool } = require('../db/connection'); // Asegúrate de que pool sea accesible

class AnosAcademicosModel extends BaseModel {
    constructor() {
        super('AnosAcademicos'); // Asegúrate de que el nombre de la tabla coincida con tu migración
        this.pool = pool; // Acceso al pool de conexiones si BaseModel no lo pasa
    }

    // Método para encontrar un año académico por número y nivel (útil para validaciones)
    async findByNumeroAndNivel(numero_ano, id_nivel) {
        const [rows] = await this.pool.query(
            `SELECT * FROM ${this.tableName} WHERE numero_ano = ? AND id_nivel = ?`,
            [numero_ano, id_nivel]
        );
        return rows[0];
    }

    // Método para encontrar un año académico por nombre y nivel (útil para validaciones)
    async findByNameAndNivel(nombre_ano, id_nivel) {
        const [rows] = await this.pool.query(
            `SELECT * FROM ${this.tableName} WHERE nombre_ano = ? AND id_nivel = ?`,
            [nombre_ano, id_nivel]
        );
        return rows[0];
    }

    // Método para obtener años académicos con detalles del nivel
    async getAllWithNivelDetails() {
        const [rows] = await this.pool.query(`
            SELECT
                AA.id_ano_academico,
                AA.numero_ano,
                AA.nombre_ano,
                NE.id_nivel,
                NE.nombre_nivel AS nivel_nombre,
                NE.descripcion AS nivel_descripcion
            FROM AnosAcademicos AS AA
            JOIN Nivel_ensenanza AS NE ON AA.id_nivel = NE.id_nivel
        `);
        return rows;
    }

    async getByIdWithNivelDetails(id_ano_academico) {
        const [rows] = await this.pool.query(`
            SELECT
                AA.id_ano_academico,
                AA.numero_ano,
                AA.nombre_ano,
                NE.id_nivel,
                NE.nombre_nivel AS nivel_nombre,
                NE.descripcion AS nivel_descripcion
            FROM AnosAcademicos AS AA
            JOIN Nivel_ensenanza AS NE ON AA.id_nivel = NE.id_nivel
            WHERE AA.id_ano_academico = ?
        `, [id_ano_academico]);
        return rows[0];
    }
}

module.exports = new AnosAcademicosModel();