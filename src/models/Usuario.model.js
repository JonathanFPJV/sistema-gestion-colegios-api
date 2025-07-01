//src/models/Usuario.model.js
const BaseModel = require('./base.model');
const { pool } = require('../db/connection'); // Asegúrate de que pool sea accesible

class UsuarioModel extends BaseModel {
    constructor() {
        super('Usuarios'); // Asegúrate de que el nombre de la tabla coincida con tu migración
        this.pool = pool; // Acceso al pool de conexiones si BaseModel no lo pasa
    }

    // Método para encontrar un usuario por su nombre de usuario
    async findByUsername(username) {
        const [rows] = await this.pool.query(`SELECT * FROM ${this.tableName} WHERE usuario = ?`, [username]);
        return rows[0];
    }

    // Método para obtener un usuario con su información de persona y rol
    async getByIdWithDetails(id_usuario) {
        const [rows] = await this.pool.query(`
            SELECT
                U.id_usuario,
                U.usuario,
                U.especialidad,
                P.id_persona,
                P.nombre,
                P.apellido,
                P.DNI,
                P.celular,
                P.correo,
                R.nombre AS rol_nombre,
                R.id_rol
            FROM Usuarios AS U
            JOIN Personas AS P ON U.id_persona = P.id_persona
            JOIN Roles AS R ON U.id_rol = R.id_rol
            WHERE U.id_usuario = ?
        `, [id_usuario]);
        return rows[0];
    }

    // Método para obtener todos los usuarios con su información de persona y rol
    async getAllWithDetails() {
        const [rows] = await this.pool.query(`
            SELECT
                U.id_usuario,
                U.usuario,
                U.especialidad,
                P.id_persona,
                P.nombre,
                P.apellido,
                P.DNI,
                P.celular,
                P.correo,
                R.nombre AS rol_nombre,
                R.id_rol
            FROM Usuarios AS U
            JOIN Personas AS P ON U.id_persona = P.id_persona
            JOIN Roles AS R ON U.id_rol = R.id_rol
        `);
        return rows;
    }
}

module.exports = new UsuarioModel();