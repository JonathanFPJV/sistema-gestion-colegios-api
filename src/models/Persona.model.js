//src/models/Persona.model.js
const BaseModel = require('./base.model');

class PersonaModel extends BaseModel {
    constructor() {
        super('Personas'); // Nombre de la tabla en la BD
    }

    // Puedes agregar métodos específicos para Personas si los necesitas
    async findByDNI(dni) {
        return this.findByField('DNI', dni);
    }
    // Ejemplo: buscar personas por nombre o apellido
    async search(searchTerm) {
        const [rows] = await this.pool.query(
            `SELECT * FROM ${this.tableName} WHERE nombre LIKE ? OR apellido LIKE ?`,
            [`%${searchTerm}%`, `%${searchTerm}%`]
        );
        return rows;
    }
}

module.exports = new PersonaModel();