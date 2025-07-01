const BaseModel = require('./base.model');
const { pool } = require('../db/connection'); // Asegúrate de que pool sea accesible

class AulaModel extends BaseModel {
    constructor() {
        super('Aulas'); // Asegúrate de que el nombre de la tabla coincida con tu migración
        this.pool = pool; // Acceso al pool de conexiones si BaseModel no lo pasa
    }

    // Método para encontrar un aula por nombre y sede
    async findByNameAndSede(nombre_aula, id_sede) {
        const [rows] = await this.pool.query(
            `SELECT * FROM ${this.tableName} WHERE nombre_aula = ? AND id_sede = ?`,
            [nombre_aula, id_sede]
        );
        return rows[0];
    }

    // Método para obtener todas las aulas con detalles de la sede y el colegio
    async getAllWithDetails() {
        const [rows] = await this.pool.query(`
            SELECT
                A.id_aula,
                A.nombre_aula,
                A.capacidad,
                A.tipo,
                A.url_foto_aula,
                S.id_sede,
                S.nombre_sede AS sede_nombre,
                S.direccion AS sede_direccion,
                C.id_colegio,
                C.nombre_colegio AS colegio_nombre
            FROM Aulas AS A
            JOIN Sedes AS S ON A.id_sede = S.id_sede
            JOIN Colegios AS C ON S.id_colegio = C.id_colegio
        `);
        return rows;
    }

    // Método para obtener un aula por ID con detalles de la sede y el colegio
    async getByIdWithDetails(id_aula) {
        const [rows] = await this.pool.query(`
            SELECT
                A.id_aula,
                A.nombre_aula,
                A.capacidad,
                A.tipo,
                A.url_foto_aula,
                S.id_sede,
                S.nombre_sede AS sede_nombre,
                S.direccion AS sede_direccion,
                C.id_colegio,
                C.nombre_colegio AS colegio_nombre
            FROM Aulas AS A
            JOIN Sedes AS S ON A.id_sede = S.id_sede
            JOIN Colegios AS C ON S.id_colegio = C.id_colegio
            WHERE A.id_aula = ?
        `, [id_aula]);
        return rows[0];
    }

    // Obtener aulas por ID de sede
    async getAulasBySedeId(id_sede) {
        const [rows] = await this.pool.query(`SELECT * FROM ${this.tableName} WHERE id_sede = ?`, [id_sede]);
        return rows;
    }
}

module.exports = new AulaModel();