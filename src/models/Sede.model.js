const BaseModel = require('./base.model');
const { pool } = require('../db/connection'); // Asegúrate de que pool sea accesible

class SedeModel extends BaseModel {
    constructor() {
        super('Sedes'); // Asegúrate de que el nombre de la tabla coincida con tu migración
        this.pool = pool; // Acceso al pool de conexiones si BaseModel no lo pasa
    }

    // Método para encontrar una sede por nombre y colegio
    async findByNameAndColegio(nombre_sede, id_colegio) {
        const [rows] = await this.pool.query(
            `SELECT * FROM ${this.tableName} WHERE nombre_sede = ? AND id_colegio = ?`,
            [nombre_sede, id_colegio]
        );
        return rows[0];
    }

    // Método para obtener todas las sedes con detalles del colegio
    async getAllWithColegioDetails() {
        const [rows] = await this.pool.query(`
            SELECT
                S.id_sede,
                S.nombre_sede,
                S.direccion,
                S.distrito,
                S.ciudad,
                S.telefono,
                S.url_foto_sede,
                C.id_colegio,
                C.nombre_colegio
            FROM Sedes AS S
            JOIN Colegios AS C ON S.id_colegio = C.id_colegio
        `);
        return rows;
    }

    // Método para obtener una sede por ID con detalles del colegio
    async getByIdWithColegioDetails(id_sede) {
        const [rows] = await this.pool.query(`
            SELECT
                S.id_sede,
                S.nombre_sede,
                S.direccion,
                S.distrito,
                S.ciudad,
                S.telefono,
                S.url_foto_sede,
                C.id_colegio,
                C.nombre_colegio
            FROM Sedes AS S
            JOIN Colegios AS C ON S.id_colegio = C.id_colegio
            WHERE S.id_sede = ?
        `, [id_sede]);
        return rows[0];
    }

    // Obtener sedes de un colegio específico
    async getSedesByColegioId(id_colegio) {
        const [rows] = await this.pool.query(`SELECT * FROM ${this.tableName} WHERE id_colegio = ?`, [id_colegio]);
        return rows;
    }
}

module.exports = new SedeModel();