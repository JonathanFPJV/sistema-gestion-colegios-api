const AnosAcademicosModel = require('../models/AnosAcademicos.model');
const NivelEnsenanzaModel = require('../models/NivelEnsenanza.model'); // Para validar la FK

class AnosAcademicosService {
    async getAllAnosAcademicos() {
        return await AnosAcademicosModel.getAllWithNivelDetails();
    }

    async getAnoAcademicoById(id_ano_academico) {
        const anoAcademico = await AnosAcademicosModel.getByIdWithNivelDetails(id_ano_academico);
        if (!anoAcademico) {
            throw new Error('Año académico no encontrado.');
        }
        return anoAcademico;
    }

    async createAnoAcademico(anoAcademicoData) {
        const { id_nivel, numero_ano, nombre_ano } = anoAcademicoData;

        // 1. Validar que el id_nivel exista
        const nivelExists = await NivelEnsenanzaModel.findById(id_nivel);
        if (!nivelExists) {
            throw new Error('El nivel de enseñanza especificado no existe.');
        }

        // 2. Validar unicidad: no puede haber el mismo número de año para el mismo nivel
        const existingAnoByNumero = await AnosAcademicosModel.findByNumeroAndNivel(numero_ano, id_nivel);
        if (existingAnoByNumero) {
            throw new Error(`Ya existe el año ${numero_ano} para el nivel de enseñanza (ID: ${id_nivel}).`);
        }

        // 3. Validar unicidad: no puede haber el mismo nombre de año para el mismo nivel
        const existingAnoByName = await AnosAcademicosModel.findByNameAndNivel(nombre_ano, id_nivel);
        if (existingAnoByName) {
            throw new Error(`Ya existe un año académico con el nombre '${nombre_ano}' para el nivel de enseñanza (ID: ${id_nivel}).`);
        }

        const newAno = await AnosAcademicosModel.create(anoAcademicoData);
        return await this.getAnoAcademicoById(newAno.id); // Retornar con detalles del nivel
    }

    async updateAnoAcademico(id_ano_academico, anoAcademicoData) {
        const { id_nivel, numero_ano, nombre_ano } = anoAcademicoData;

        const existingAno = await AnosAcademicosModel.findById(id_ano_academico);
        if (!existingAno) {
            throw new Error('Año académico no encontrado.');
        }

        // 1. Validar que el id_nivel exista si se intenta cambiar
        if (id_nivel && id_nivel !== existingAno.id_nivel) {
            const nivelExists = await NivelEnsenanzaModel.findById(id_nivel);
            if (!nivelExists) {
                throw new Error('El nuevo nivel de enseñanza especificado no existe.');
            }
        }

        // 2. Validar unicidad si se intenta cambiar numero_ano o nombre_ano junto con id_nivel
        const targetNivelId = id_nivel || existingAno.id_nivel;
        const targetNumeroAno = numero_ano || existingAno.numero_ano;
        const targetNombreAno = nombre_ano || existingAno.nombre_ano;


        if (numero_ano && numero_ano !== existingAno.numero_ano || (numero_ano && id_nivel && id_nivel !== existingAno.id_nivel)) {
            const anoWithSameNumero = await AnosAcademicosModel.findByNumeroAndNivel(targetNumeroAno, targetNivelId);
            if (anoWithSameNumero && anoWithSameNumero.id_ano_academico !== id_ano_academico) {
                throw new Error(`Ya existe el año ${targetNumeroAno} para el nivel de enseñanza (ID: ${targetNivelId}).`);
            }
        }

        if (nombre_ano && nombre_ano !== existingAno.nombre_ano || (nombre_ano && id_nivel && id_nivel !== existingAno.id_nivel)) {
             const anoWithSameName = await AnosAcademicosModel.findByNameAndNivel(targetNombreAno, targetNivelId);
             if (anoWithSameName && anoWithSameName.id_ano_academico !== id_ano_academico) {
                 throw new Error(`Ya existe un año académico con el nombre '${targetNombreAno}' para el nivel de enseñanza (ID: ${targetNivelId}).`);
             }
         }


        const updated = await AnosAcademicosModel.update(id_ano_academico, anoAcademicoData);
        if (!updated) {
            throw new Error('No se pudo actualizar el año académico.');
        }
        return await this.getAnoAcademicoById(id_ano_academico); // Retornar con detalles del nivel
    }

    async deleteAnoAcademico(id_ano_academico) {
        const anoAcademico = await AnosAcademicosModel.findById(id_ano_academico);
        if (!anoAcademico) {
            throw new Error('Año académico no encontrado.');
        }

        // **IMPORTANTE:** Consideraciones para la eliminación de AnosAcademicos.
        // Tu migración tiene FKs desde `GruposClases.id_ano_academico` y
        // `AsignacionesCursosAnos.id_ano_academico` con `ON DELETE RESTRICT` o `CASCADE`.
        // Si hay 'GruposClases' o 'AsignacionesCursosAnos' asociados, y la FK es RESTRICT, la eliminación fallará.
        const deleted = await AnosAcademicosModel.delete(id_ano_academico);
        if (!deleted) {
            throw new Error('No se pudo eliminar el año académico. Verifique si hay grupos o asignaciones de cursos asociados.');
        }
        return deleted;
    }
}

module.exports = new AnosAcademicosService();