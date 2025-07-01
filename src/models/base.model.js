//src/models/base.model.js
// src/models/base.model.js
const { pool } = require('../db/connection');

class BaseModel {
    constructor(tableName) {
        this.tableName = tableName;
        // La clave primaria de la tabla será 'id_' + el nombre de la tabla en minúsculas y singular
        // O podrías tener un mapeo de nombres de tablas a nombres de PKs si no siguen un patrón.
        // Para este caso, asumimos que tu PK es 'id_' + nombreTablaEnSingularMinusculas
        // Ejemplo: 'Colegios' -> 'id_colegio', 'Personas' -> 'id_persona'
        this.primaryKeyName = `id_${tableName.toLowerCase().slice(0, -1)}`; // Remueve la 's' final y convierte a minúsculas
        
        // Excepciones (si las hubiera, ajusta según tu migración exacta):
        // 'Nivel_ensenanza' -> 'id_nivel_ensenanza' (no 'id_nivel_ensenanzas')
        if (tableName === 'Nivel_ensenanza') {
            this.primaryKeyName = 'id_nivel'; // Corregir si el constructor de arriba no funciona para casos especiales
        }
        if (tableName === 'AnosAcademicos') {
            this.primaryKeyName = 'id_ano_academico';
        }
        if (tableName === 'GruposClases') {
            this.primaryKeyName = 'id_grupo_clase';
        }
        if (tableName === 'AsignacionesCursosAnos') {
            this.primaryKeyName = 'id_asignacion_curso_ano';
        }
        if (tableName === 'Docente_Curso') {
            this.primaryKeyName = 'id_docente_curso';
        }
        if (tableName === 'HorariosClases') {
            this.primaryKeyName = 'id_horario';
        }
        if (tableName === 'Matricula') {
            this.primaryKeyName = 'id_matricula';
        }
        if (tableName === 'Notas') {
            this.primaryKeyName = 'id_nota';
        }
        if (tableName === 'Asistencias') {
            this.primaryKeyName = 'id_asistencia';
        }
        if (tableName === 'Roles') { // Roles ya es plural, pero su PK es 'id_rol'
            this.primaryKeyName = 'id_rol';
        }
        if (tableName === 'Usuarios') { // Usuarios ya es plural, pero su PK es 'id_usuario'
            this.primaryKeyName = 'id_usuario';
        }
        if (tableName === 'Turnos') { // Turnos ya es plural, pero su PK es 'id_turno'
            this.primaryKeyName = 'id_turno';
        }
        if (tableName === 'Cursos') { // Cursos ya es plural, pero su PK es 'id_curso'
            this.primaryKeyName = 'id_curso';
        }
        // ... Asegúrate de que todas las tablas tengan su nombre de PK correcto aquí
        // La mejor forma de hacer esto es basarse en el nombre exacto de la PK de tu migración.
    }

    async findAll() {
        const [rows] = await pool.query(`SELECT * FROM ${this.tableName}`);
        return rows;
    }

    async findById(id) {
        // Usa this.primaryKeyName aquí
        const [rows] = await pool.query(`SELECT * FROM ${this.tableName} WHERE ${this.primaryKeyName} = ?`, [id]);
        return rows[0];
    }

    async create(data) {
        const [result] = await pool.query(`INSERT INTO ${this.tableName} SET ?`, [data]);
        return { id: result.insertId, ...data };
    }

    async update(id, data) {
        // Usa this.primaryKeyName aquí
        const [result] = await pool.query(`UPDATE ${this.tableName} SET ? WHERE ${this.primaryKeyName} = ?`, [data, id]);
        return result.affectedRows > 0;
    }

    async delete(id) {
        // Usa this.primaryKeyName aquí
        const [result] = await pool.query(`DELETE FROM ${this.tableName} WHERE ${this.primaryKeyName} = ?`, [id]);
        return result.affectedRows > 0;
    }
    
    async findByField(fieldName, value) {
        const [rows] = await pool.query(`SELECT * FROM ${this.tableName} WHERE ${fieldName} = ?`, [value]);
        return rows[0];
    }
}

module.exports = BaseModel;