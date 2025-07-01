const BaseModel = require('./base.model');
const { pool } = require('../db/connection'); // Asegúrate de que pool sea accesible

class TurnoModel extends BaseModel {
    constructor() {
        super('Turnos'); // Asegúrate de que el nombre de la tabla coincida con tu migración
        this.pool = pool; // Acceso al pool de conexiones si BaseModel no lo pasa
    }

    // Método para encontrar un turno por su nombre
    async findByName(nombre_turno) {
        const [rows] = await this.pool.query(`SELECT * FROM ${this.tableName} WHERE nombre_turno = ?`, [nombre_turno]);
        return rows[0];
    }
}

module.exports = new TurnoModel();