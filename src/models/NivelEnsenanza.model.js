const BaseModel = require('./base.model');
const { pool } = require('../db/connection'); // Asegúrate de que pool sea accesible

class NivelEnsenanzaModel extends BaseModel {
    constructor() {
        super('Nivel_ensenanza'); // Asegúrate de que el nombre de la tabla coincida con tu migración
        this.pool = pool; // Acceso al pool de conexiones si BaseModel no lo pasa
    }

    // Método para encontrar un nivel por su nombre (útil para validaciones)
    async findByName(nombre_nivel) {
        const [rows] = await this.pool.query(`SELECT * FROM ${this.tableName} WHERE nombre_nivel = ?`, [nombre_nivel]);
        return rows[0];
    }
}

module.exports = new NivelEnsenanzaModel();