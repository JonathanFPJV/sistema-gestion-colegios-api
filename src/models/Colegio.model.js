const BaseModel = require('./base.model');
const { pool } = require('../db/connection'); // Asegúrate de que pool sea accesible

class ColegioModel extends BaseModel {
    constructor() {
        super('Colegios'); // Asegúrate de que el nombre de la tabla coincida con tu migración
        this.pool = pool; // Acceso al pool de conexiones si BaseModel no lo pasa
    }

    // Método para encontrar un colegio por su nombre
    async findByName(nombre_colegio) {
        const [rows] = await this.pool.query(`SELECT * FROM ${this.tableName} WHERE nombre_colegio = ?`, [nombre_colegio]);
        return rows[0];
    }

    // Método para encontrar un colegio por su código modular
    async findByCodigoModular(codigo_modular) {
        const [rows] = await this.pool.query(`SELECT * FROM ${this.tableName} WHERE codigo_modular = ?`, [codigo_modular]);
        return rows[0];
    }

    // Método para encontrar un colegio por su RUC
    async findByRuc(ruc) {
        const [rows] = await this.pool.query(`SELECT * FROM ${this.tableName} WHERE ruc = ?`, [ruc]);
        return rows[0];
    }
}

module.exports = new ColegioModel();