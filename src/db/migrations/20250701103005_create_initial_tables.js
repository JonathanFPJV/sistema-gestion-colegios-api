/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Crear la base de datos si no existe (solo si tu usuario lo permite)
  // Esto a veces se hace fuera de Knex, en la configuración del servidor MySQL.
  // Si tu usuario DB_USER tiene permisos de CREATE DATABASE, puedes intentar:
  await knex.raw(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`);
  await knex.raw(`USE ${process.env.DB_NAME}`);


  // 1. Colegios
  await knex.schema.createTable('Colegios', function(table) {
    table.increments('id_colegio').primary();
    table.string('nombre_colegio', 255).notNullable();
    table.string('codigo_modular', 50).notNullable();
    table.string('ruc', 20).notNullable();
    table.string('tipo_institucion', 50).notNullable();
    table.string('regimen_academico', 50).notNullable();
    table.string('direccion_principal', 255).notNullable();
    table.string('telefono_principal', 20).nullable();
    table.string('email_principal', 100).nullable();
    table.string('url_logo_colegio', 255).nullable();
    table.string('url_documento_licencia', 255).nullable();
  });

  // 2. Sedes
  await knex.schema.createTable('Sedes', function(table) {
    table.increments('id_sede').primary();
    table.integer('id_colegio').unsigned().notNullable();
    table.string('nombre_sede', 100).notNullable();
    table.string('direccion', 255).notNullable();
    table.string('distrito', 100).notNullable();
    table.string('ciudad', 100).notNullable();
    table.string('telefono', 20).nullable();
    table.string('url_foto_sede', 255).nullable();
    table.foreign('id_colegio').references('id_colegio').inTable('Colegios').onDelete('CASCADE'); // CASCADE: si se elimina un colegio, se eliminan sus sedes
  });

  // 3. Aulas
  await knex.schema.createTable('Aulas', function(table) {
    table.increments('id_aula').primary();
    table.integer('id_sede').unsigned().notNullable();
    table.string('nombre_aula', 100).notNullable();
    table.integer('capacidad').notNullable();
    table.string('tipo', 50).nullable();
    table.string('url_foto_aula', 255).nullable();
    table.foreign('id_sede').references('id_sede').inTable('Sedes').onDelete('CASCADE');
  });

  // 4. Nivel_ensenanza
  await knex.schema.createTable('Nivel_ensenanza', function(table) {
    table.increments('id_nivel').primary();
    table.string('nombre_nivel', 50).notNullable();
    table.text('descripcion').nullable();
  });

  // 5. AnosAcademicos
  await knex.schema.createTable('AnosAcademicos', function(table) {
    table.increments('id_ano_academico').primary();
    table.integer('id_nivel').unsigned().notNullable();
    table.integer('numero_ano').notNullable();
    table.string('nombre_ano', 100).notNullable();
    table.foreign('id_nivel').references('id_nivel').inTable('Nivel_ensenanza').onDelete('RESTRICT'); // RESTRICT: no permite eliminar nivel si hay años asociados
  });

  // 6. Turnos
  await knex.schema.createTable('Turnos', function(table) {
    table.increments('id_turno').primary();
    table.string('nombre_turno', 50).notNullable();
    table.time('hora_inicio').notNullable();
    table.time('hora_fin').notNullable();
  });

  // 7. Cursos
  await knex.schema.createTable('Cursos', function(table) {
    table.increments('id_curso').primary();
    table.integer('id_colegio').unsigned().notNullable();
    table.string('codigo_curso', 50).notNullable();
    table.string('nombre_curso', 100).notNullable();
    table.text('descripcion').nullable();
    table.string('url_silabo', 255).nullable();
    table.foreign('id_colegio').references('id_colegio').inTable('Colegios').onDelete('CASCADE');
  });

  // 8. Personas
  await knex.schema.createTable('Personas', function(table) {
    table.increments('id_persona').primary();
    table.string('nombre', 100).notNullable();
    table.string('apellido', 100).notNullable();
    table.string('DNI', 20).notNullable().unique();
    table.string('celular', 20).nullable();
    table.string('correo', 100).nullable().unique();
    table.date('fecha_nacimiento').nullable();
    table.string('genero', 10).nullable();
    table.string('direccion', 255).nullable();
    table.string('url_foto_perfil', 255).nullable();
    table.string('url_documento_dni', 255).nullable();
    table.string('url_curriculum_vitae', 255).nullable();
    table.string('url_titulo_academico', 255).nullable();
    table.string('url_antecedentes_penales', 255).nullable();
  });

  // 9. Roles
  await knex.schema.createTable('Roles', function(table) {
    table.increments('id_rol').primary();
    table.string('nombre', 50).notNullable().unique();
    table.text('descripcion').nullable();
  });

  // 10. Usuarios (id_persona aquí actúa como el ID del alumno/docente/admin)
  await knex.schema.createTable('Usuarios', function(table) {
    table.increments('id_usuario').primary();
    table.integer('id_persona').unsigned().notNullable().unique(); // Un usuario por persona
    table.integer('id_rol').unsigned().notNullable();
    table.string('usuario', 50).notNullable().unique();
    table.string('contrasena', 255).notNullable(); // Hashed password
    table.string('especialidad', 100).nullable(); // Solo para rol 'Docente', será NULL para otros
    table.integer('id_colegio_gestion').unsigned().nullable(); // FK a Colegios, NULL para Admin Global o si no gestiona colegio
    table.foreign('id_colegio_gestion').references('id_colegio').inTable('Colegios').onDelete('SET NULL');
    table.foreign('id_persona').references('id_persona').inTable('Personas').onDelete('CASCADE');
    table.foreign('id_rol').references('id_rol').inTable('Roles').onDelete('RESTRICT');
  });

  // 11. GruposClases
  await knex.schema.createTable('GruposClases', function(table) {
    table.increments('id_grupo_clase').primary();
    table.integer('id_sede').unsigned().notNullable();
    table.integer('id_ano_academico').unsigned().notNullable();
    table.integer('id_aula').unsigned().notNullable();
    table.integer('id_turno').unsigned().notNullable();
    table.string('nombre_grupo', 100).notNullable();
    table.integer('capacidad_actual_alumnos').notNullable(); // Cantidad de alumnos matriculados actualmente
    table.foreign('id_sede').references('id_sede').inTable('Sedes').onDelete('CASCADE');
    table.foreign('id_ano_academico').references('id_ano_academico').inTable('AnosAcademicos').onDelete('RESTRICT');
    table.foreign('id_aula').references('id_aula').inTable('Aulas').onDelete('RESTRICT');
    table.foreign('id_turno').references('id_turno').inTable('Turnos').onDelete('RESTRICT');
  });

  // 12. AsignacionesCursosAnos
  await knex.schema.createTable('AsignacionesCursosAnos', function(table) {
    table.increments('id_asignacion_curso_ano').primary();
    table.integer('id_curso').unsigned().notNullable();
    table.integer('id_ano_academico').unsigned().notNullable();
    table.unique(['id_curso', 'id_ano_academico'], 'idx_asignacion_curso_ano_unique'); // Nombre corto personalizado
    table.foreign('id_curso').references('id_curso').inTable('Cursos').onDelete('CASCADE');
    table.foreign('id_ano_academico').references('id_ano_academico').inTable('AnosAcademicos').onDelete('CASCADE');
  });

  // 13. Docente_Curso (Relaciona Personas (rol Docente) con Cursos)
  await knex.schema.createTable('Docente_Curso', function(table) {
    table.increments('id_docente_curso').primary();
    table.integer('id_persona').unsigned().notNullable(); // FK a Personas (donde id_rol = 'Docente')
    table.integer('id_curso').unsigned().notNullable();
    table.unique(['id_persona', 'id_curso'], 'idx_docente_curso_unique'); // Nombre corto personalizado
    table.foreign('id_persona').references('id_persona').inTable('Personas').onDelete('CASCADE');
    table.foreign('id_curso').references('id_curso').inTable('Cursos').onDelete('CASCADE');
  });

  // 14. HorariosClases
  await knex.schema.createTable('HorariosClases', function(table) {
  table.increments('id_horario').primary();
  table.integer('id_grupo_clase').unsigned().notNullable();
  table.integer('id_docente_curso').unsigned().notNullable();
  table.string('dia_semana', 20).notNullable();
  table.time('hora_inicio').notNullable();
  table.time('hora_fin').notNullable();
  // Modificación aquí:
  table.unique(['id_grupo_clase', 'dia_semana', 'hora_inicio', 'hora_fin'], 'idx_horarios_unique'); // Nombre corto personalizado
  table.foreign('id_grupo_clase').references('id_grupo_clase').inTable('GruposClases').onDelete('CASCADE');
  table.foreign('id_docente_curso').references('id_docente_curso').inTable('Docente_Curso').onDelete('CASCADE');
});

  // 15. Matricula (Relaciona Personas (rol Alumno) con GruposClases)
  await knex.schema.createTable('Matricula', function(table) {
    table.increments('id_matricula').primary();
    table.integer('id_persona').unsigned().notNullable(); // FK a Personas (donde id_rol = 'Alumno')
    table.integer('id_grupo_clase').unsigned().notNullable();
    table.date('fecha_matricula').notNullable();
    table.integer('anio_lectivo').notNullable();
    table.string('estado_matricula', 50).notNullable();
    table.string('url_contrato_matricula', 255).nullable();
    table.string('url_historial_medico', 255).nullable();
    table.string('url_ficha_socioeconomica', 255).nullable();
    table.string('url_partida_nacimiento', 255).nullable();
    table.string('url_documento_notas_previas', 255).nullable();
    table.unique(['id_persona', 'id_grupo_clase', 'anio_lectivo'], 'idx_matricula_unique'); // Nombre corto personalizado
    table.foreign('id_persona').references('id_persona').inTable('Personas').onDelete('CASCADE');
    table.foreign('id_grupo_clase').references('id_grupo_clase').inTable('GruposClases').onDelete('CASCADE');
  });

  // 16. Notas
  await knex.schema.createTable('Notas', function(table) {
    table.increments('id_nota').primary();
    table.integer('id_matricula').unsigned().notNullable();
    table.integer('id_docente_curso').unsigned().notNullable();
    table.string('evaluacion', 100).notNullable();
    table.decimal('nota', 4, 2).notNullable();
    table.integer('trimestre').notNullable();
    table.datetime('fecha_registro').notNullable();
    table.string('url_examen_escaneado', 255).nullable();
    table.foreign('id_matricula').references('id_matricula').inTable('Matricula').onDelete('CASCADE');
    table.foreign('id_docente_curso').references('id_docente_curso').inTable('Docente_Curso').onDelete('RESTRICT'); // RESTRICT: no elimina asignación docente-curso si hay notas
  });

  // 17. Asistencias
  await knex.schema.createTable('Asistencias', function(table) {
    table.increments('id_asistencia').primary();
    table.integer('id_matricula').unsigned().notNullable();
    table.integer('id_horario_clase').unsigned().notNullable();
    table.date('fecha_asistencia').notNullable();
    table.string('estado_asistencia', 50).notNullable();
    table.text('observaciones').nullable();
    table.integer('registrado_por_persona_id').unsigned().nullable(); // Persona (docente/admin) que registra
    table.datetime('fecha_hora_registro').notNullable();
    table.string('url_parte_asistencia', 255).nullable();
    table.unique(['id_matricula', 'id_horario_clase', 'fecha_asistencia'], 'idx_asistencias_unique'); // Nombre corto personalizado
    table.foreign('id_matricula').references('id_matricula').inTable('Matricula').onDelete('CASCADE');
    table.foreign('id_horario_clase').references('id_horario').inTable('HorariosClases').onDelete('CASCADE');
    table.foreign('registrado_por_persona_id').references('id_persona').inTable('Personas').onDelete('SET NULL'); // SET NULL si la persona que registró es eliminada
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  // Las tablas deben eliminarse en el orden inverso a su creación debido a las FKs
  // Eliminar FKs primero para evitar errores de dependencia
  await knex.schema.table('Usuarios', function(table) {
    table.dropForeign('id_colegio_gestion'); // Elimina la clave foránea
  });
  await knex.schema.dropTableIfExists('Asistencias');
  await knex.schema.dropTableIfExists('Notas');
  await knex.schema.dropTableIfExists('Matricula');
  await knex.schema.dropTableIfExists('HorariosClases');
  await knex.schema.dropTableIfExists('Docente_Curso');
  await knex.schema.dropTableIfExists('AsignacionesCursosAnos');
  await knex.schema.dropTableIfExists('GruposClases');
  await knex.schema.dropTableIfExists('Usuarios');
  await knex.schema.dropTableIfExists('Roles');
  await knex.schema.dropTableIfExists('Personas');
  await knex.schema.dropTableIfExists('Cursos');
  await knex.schema.dropTableIfExists('Turnos');
  await knex.schema.dropTableIfExists('AnosAcademicos');
  await knex.schema.dropTableIfExists('Nivel_ensenanza');
  await knex.schema.dropTableIfExists('Aulas');
  await knex.schema.dropTableIfExists('Sedes');
  await knex.schema.dropTableIfExists('Colegios');
};