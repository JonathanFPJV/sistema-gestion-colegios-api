const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors'); // Para permitir solicitudes desde otros dominios
const knex = require('knex');
const knexConfig = require('../knexfile'); 

// Cargar variables de entorno
dotenv.config();

const dbKnex = knex(knexConfig.development);
const app = express();
const PORT = process.env.PORT || 3000;

// Importar rutas
const authRoutes = require('./routes/auth.routes');
const colegioRoutes = require('./routes/colegios.routes');
const personaRoutes = require('./routes/personas.routes');
const usuarioRoutes = require('./routes/usuarios.routes');
const rolRoutes = require('./routes/rol.routes');
const nivelEnsenanzaRoutes = require('./routes/nivelEnsenanza.routes');
const anosAcademicosRoutes = require('./routes/anosAcademicos.routes');
const sedeRoutes = require('./routes/sedes.routes');
const aulasRoutes = require('./routes/aulas.routes');
const turnosRoutes = require('./routes/turnos.routes');
const cursosRoutes = require('./routes/cursos.routes');
const gruposClasesRoutes = require('./routes/gruposClases.routes');
const asignacionesCursosAnosRoutes = require('./routes/asignacionesCursosAnos.routes'); // <-- AÑADIR ESTA LÍNEA
const docenteCursoRoutes = require('./routes/docenteCurso.routes'); 
const horariosClasesRoutes = require('./routes/horariosClases.routes');
const matriculaRoutes = require('./routes/matricula.routes');
const notasRoutes = require('./routes/notas.routes');
const asistenciasRoutes = require('./routes/asistencias.routes');
// ... importar el resto de rutas aquí

// Middlewares globales
app.use(cors()); // Habilitar CORS para todas las solicitudes
app.use(express.json()); // Habilitar el parsing de JSON en el cuerpo de las solicitudes
app.use(express.urlencoded({ extended: true })); // Habilitar el parsing de datos de formularios URL-encoded

// Función para ejecutar migraciones
const runMigrations = async () => {
    try {
        console.log('Ejecutando migraciones de base de datos...');
        await dbKnex.migrate.latest();
        console.log('Migraciones completadas exitosamente.');

        // Opcional: Ejecutar seeds (datos iniciales)
        // console.log('Ejecutando seeds...');
        // await dbKnex.seed.run();
        // console.log('Seeds completados exitosamente.');

    } catch (error) {
        console.error('Error al ejecutar migraciones:', error);
        process.exit(1); // Salir si las migraciones fallan
    }
};


// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/colegios', colegioRoutes);
app.use('/api/personas', personaRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/roles', rolRoutes);
app.use('/api/niveles-ensenanza', nivelEnsenanzaRoutes);
app.use('/api/anos-academicos', anosAcademicosRoutes);
app.use('/api/colegios', colegioRoutes);
app.use('/api/sedes', sedeRoutes);
app.use('/api/aulas', aulasRoutes);
app.use('/api/turnos', turnosRoutes);
app.use('/api/cursos', cursosRoutes);
app.use('/api/grupos-clases', gruposClasesRoutes);
app.use('/api/asignaciones-cursos-anos', asignacionesCursosAnosRoutes); 
app.use('/api/docente-curso', docenteCursoRoutes);
app.use('/api/horarios-clases', horariosClasesRoutes);
app.use('/api/matriculas', matriculaRoutes);
app.use('/api/notas', notasRoutes); 
app.use('/api/asistencias', asistenciasRoutes);
// ... usar el resto de rutas aquí (ej. app.use('/api/sedes', sedesRoutes);)

// Manejo de errores 404
app.use((req, res, next) => {
    res.status(404).json({ message: 'Ruta no encontrada.' });
});

// Manejador de errores global (opcional, puedes crear un error.middleware.js más sofisticado)
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Algo salió mal en el servidor.', error: err.message });
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
});