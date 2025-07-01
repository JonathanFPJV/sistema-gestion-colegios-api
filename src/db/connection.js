const mysql = require('mysql2/promise');
const dbConfig = require('../config/db');

// Crear un pool de conexiones
const pool = mysql.createPool(dbConfig);

// Función para obtener una conexión del pool
async function getConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('Conexión a la base de datos exitosa.');
        return connection;
    } catch (error) {
        console.error('Error al conectar a la base de datos:', error.message);
        throw new Error('No se pudo conectar a la base de datos.');
    }
}

module.exports = {
    getConnection,
    pool // Exportar el pool directamente para consultas más simples
};