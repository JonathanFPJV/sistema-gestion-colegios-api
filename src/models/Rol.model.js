const BaseModel = require('./base.model');
const { pool } = require('../db/connection'); // Asegúrate de que pool sea accesible

class RolModel extends BaseModel {
    constructor() {
        super('Roles'); // Asegúrate de que el nombre de la tabla coincida con tu migración
        this.pool = pool; // Acceso al pool de conexiones si BaseModel no lo pasa
    }

    // Método para encontrar un rol por su nombre (si necesitas lógica específica)
    async findByName(name) {
        const [rows] = await this.pool.query(`SELECT * FROM ${this.tableName} WHERE nombre = ?`, [name]);
        return rows[0];
    }
}

module.exports = new RolModel();