const BaseModel = require('./base.model');
const { pool } = require('../db/connection'); // Asegúrate de que pool sea accesible

class CursoModel extends BaseModel {
    constructor() {
        super('Cursos'); // Asegúrate de que el nombre de la tabla coincida con tu migración
        this.pool = pool; // Acceso al pool de conexiones si BaseModel no lo pasa
    }

    // Método para encontrar un curso por código y colegio
    async findByCodigoAndColegio(codigo_curso, id_colegio) {
        const [rows] = await this.pool.query(
            `SELECT * FROM ${this.tableName} WHERE codigo_curso = ? AND id_colegio = ?`,
            [codigo_curso, id_colegio]
        );
        return rows[0];
    }

    // Método para encontrar un curso por nombre y colegio
    async findByNameAndColegio(nombre_curso, id_colegio) {
        const [rows] = await this.pool.query(
            `SELECT * FROM ${this.tableName} WHERE nombre_curso = ? AND id_colegio = ?`,
            [nombre_curso, id_colegio]
        );
        return rows[0];
    }

    // Método para obtener todos los cursos con detalles del colegio
    async getAllWithColegioDetails() {
        const [rows] = await this.pool.query(`
            SELECT
                CUR.id_curso,
                CUR.codigo_curso,
                CUR.nombre_curso,
                CUR.descripcion,
                CUR.url_silabo,
                COL.id_colegio,
                COL.nombre_colegio
            FROM Cursos AS CUR
            JOIN Colegios AS COL ON CUR.id_colegio = COL.id_colegio
        `);
        return rows;
    }

    // Método para obtener un curso por ID con detalles del colegio
    async getByIdWithColegioDetails(id_curso) {
        const [rows] = await this.pool.query(`
            SELECT
                CUR.id_curso,
                CUR.codigo_curso,
                CUR.nombre_curso,
                CUR.descripcion,
                CUR.url_silabo,
                COL.id_colegio,
                COL.nombre_colegio
            FROM Cursos AS CUR
            JOIN Colegios AS COL ON CUR.id_colegio = COL.id_colegio
            WHERE CUR.id_curso = ?
        `, [id_curso]);
        return rows[0];
    }

    // Obtener cursos por ID de colegio
    async getCursosByColegioId(id_colegio) {
        const [rows] = await this.pool.query(`SELECT * FROM ${this.tableName} WHERE id_colegio = ?`, [id_colegio]);
        return rows;
    }
}

module.exports = new CursoModel();