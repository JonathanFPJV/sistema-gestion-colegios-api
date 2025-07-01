/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
const { hashPassword } = require('../../utils/hash.util'); // Asegúrate de que la ruta sea correcta

exports.seed = async function(knex) {
  // Elimina todos los registros existentes (para reinicializar)
  await knex('Asistencias').del();
  await knex('Notas').del();
  await knex('Matricula').del();
  await knex('HorariosClases').del();
  await knex('Docente_Curso').del();
  await knex('AsignacionesCursosAnos').del();
  await knex('GruposClases').del();
  await knex('Usuarios').del();
  await knex('Roles').del(); // Primero roles, luego personas
  await knex('Personas').del();
  await knex('Cursos').del();
  await knex('Turnos').del();
  await knex('AnosAcademicos').del();
  await knex('Nivel_ensenanza').del();
  await knex('Aulas').del();
  await knex('Sedes').del();
  await knex('Colegios').del();


  // Insertar Roles
  await knex('Roles').insert([
    { id_rol: 1, nombre: 'Administrador Global', descripcion: 'Administrador con acceso a todos los colegios.' },
    { id_rol: 2, nombre: 'Administrador Colegio', descripcion: 'Administrador de un colegio específico.' },
    { id_rol: 3, nombre: 'Docente', descripcion: 'Docente que imparte clases.' },
    { id_rol: 4, nombre: 'Alumno', descripcion: 'Estudiante matriculado en un colegio.' },
    { id_rol: 5, nombre: 'Apoderado', descripcion: 'Apoderado de un estudiante.' }
  ]);

  // Insertar Persona (Admin Global)
  const hashedPassword = await hashPassword('adminpassword'); // Contraseña para el admin
  const [adminPersonaId] = await knex('Personas').insert({
    nombre: 'Admin',
    apellido: 'Global',
    DNI: '12345678',
    celular: '987654321',
    correo: 'admin@global.com',
    fecha_nacimiento: '1990-01-01',
    genero: 'M',
    direccion: 'Calle Falsa 123'
  });

  // Insertar Usuario (Admin Global)
  await knex('Usuarios').insert({
    id_persona: adminPersonaId,
    id_rol: 1, // Rol de Administrador Global
    usuario: 'admin.global',
    contrasena: hashedPassword,
    especialidad: null // No aplica para un admin global
  });

  // Insertar un Colegio de ejemplo
  const [colegioId] = await knex('Colegios').insert({
    nombre_colegio: 'Colegio Innova Academy',
    codigo_modular: '001-CIAA',
    ruc: '20500123456',
    tipo_institucion: 'Privada',
    regimen_academico: 'Trimestral',
    direccion_principal: 'Av. Las Palmeras 100, Lima',
    telefono_principal: '012345678',
    email_principal: 'contacto@innovaacademy.edu.pe'
  });

  // Insertar una Persona (Admin de Colegio)
  const hashedPasswordColegio = await hashPassword('colegiopass');
  const [adminColegioPersonaId] = await knex('Personas').insert({
    nombre: 'Admin',
    apellido: 'Colegio',
    DNI: '87654321',
    celular: '998877665',
    correo: 'admin@innovaacademy.edu.pe',
    fecha_nacimiento: '1985-05-10',
    genero: 'F',
    direccion: 'Av. Siempre Viva 456'
  });

  // Insertar Usuario (Admin de Colegio)
  await knex('Usuarios').insert({
    id_persona: adminColegioPersonaId,
    id_rol: 2, // Rol de Administrador Colegio
    usuario: 'admin.innova',
    contrasena: hashedPasswordColegio,
    especialidad: null,
    id_colegio_gestion: colegioId
  });

  // Nota: Para asociar un 'Administrador Colegio' a un colegio específico para la autorización,
  // la lógica de tu API necesitará buscar esta relación (ej., en el servicio de autenticación)
  // o podrías considerar una tabla de relación 'ColegioAdministradores'.
  // Para este ejemplo, lo dejaremos para la lógica del servicio/middleware.

};