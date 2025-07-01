const BaseModel = require('./base.model');
const { pool } = require('../db/connection');

class UsuarioModel extends BaseModel {
    constructor() {
        super('Usuarios');
        this.pool = pool;
    }

    async findByUsername(username) {
        const [rows] = await this.pool.query(`SELECT * FROM ${this.tableName} WHERE usuario = ?`, [username]);
        return rows[0];
    }

    // Actualiza los métodos de detalles para incluir el id_colegio_gestion
    async getByIdWithDetails(id_usuario) {
        const [rows] = await this.pool.query(`
            SELECT
                U.id_usuario,
                U.usuario,
                U.especialidad,
                U.id_colegio_gestion, -- AÑADIR AQUÍ
                P.id_persona,
                P.nombre,
                P.apellido,
                P.DNI,
                P.celular,
                P.correo,
                R.nombre AS rol_nombre,
                R.id_rol,
                C.nombre_colegio AS colegio_gestion_nombre -- Para el nombre del colegio de gestión
            FROM Usuarios AS U
            JOIN Personas AS P ON U.id_persona = P.id_persona
            JOIN Roles AS R ON U.id_rol = R.id_rol
            LEFT JOIN Colegios AS C ON U.id_colegio_gestion = C.id_colegio -- JOIN OPCIONAL
            WHERE U.id_usuario = ?
        `, [id_usuario]);
        return rows[0];
    }

    async getAllWithDetails() {
        const [rows] = await this.pool.query(`
            SELECT
                U.id_usuario,
                U.usuario,
                U.especialidad,
                U.id_colegio_gestion, -- AÑADIR AQUÍ
                P.id_persona,
                P.nombre,
                P.apellido,
                P.DNI,
                P.celular,
                P.correo,
                R.nombre AS rol_nombre,
                R.id_rol,
                C.nombre_colegio AS colegio_gestion_nombre -- Para el nombre del colegio de gestión
            FROM Usuarios AS U
            JOIN Personas AS P ON U.id_persona = P.id_persona
            JOIN Roles AS R ON U.id_rol = R.id_rol
            LEFT JOIN Colegios AS C ON U.id_colegio_gestion = C.id_colegio -- JOIN OPCIONAL
        `);
        return rows;
    }
}

module.exports = new UsuarioModel();