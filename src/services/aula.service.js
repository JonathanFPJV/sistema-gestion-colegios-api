const AulaModel = require('../models/Aula.model');
const SedeModel = require('../models/Sede.model'); // Para validar la FK

class AulaService {
    async getAllAulas() {
        return await AulaModel.getAllWithDetails();
    }

    async getAulaById(id_aula) {
        const aula = await AulaModel.getByIdWithDetails(id_aula);
        if (!aula) {
            throw new Error('Aula no encontrada.');
        }
        return aula;
    }

    async createAula(aulaData) {
        const { id_sede, nombre_aula } = aulaData;

        // 1. Validar que el id_sede exista
        const sedeExists = await SedeModel.findById(id_sede);
        if (!sedeExists) {
            throw new Error('La sede especificada no existe.');
        }

        // 2. Validar unicidad: no puede haber el mismo nombre de aula para la misma sede
        const existingAula = await AulaModel.findByNameAndSede(nombre_aula, id_sede);
        if (existingAula) {
            throw new Error(`Ya existe un aula con el nombre '${nombre_aula}' para la sede (ID: ${id_sede}).`);
        }

        const newAula = await AulaModel.create(aulaData);
        return await this.getAulaById(newAula.id); // Retornar con detalles de sede y colegio
    }

    async updateAula(id_aula, aulaData) {
        const { id_sede, nombre_aula } = aulaData;

        const existingAula = await AulaModel.findById(id_aula);
        if (!existingAula) {
            throw new Error('Aula no encontrada.');
        }

        // 1. Validar que el id_sede exista si se intenta cambiar (o si se reasigna)
        if (id_sede && id_sede !== existingAula.id_sede) {
            const sedeExists = await SedeModel.findById(id_sede);
            if (!sedeExists) {
                throw new Error('La nueva sede especificada para el aula no existe.');
            }
        }

        // 2. Validar unicidad si se intenta cambiar nombre_aula o id_sede
        const targetSedeId = id_sede || existingAula.id_sede;
        const targetNombreAula = nombre_aula || existingAula.nombre_aula;

        if (nombre_aula && nombre_aula !== existingAula.nombre_aula || (id_sede && id_sede !== existingAula.id_sede)) {
            const aulaWithSameName = await AulaModel.findByNameAndSede(targetNombreAula, targetSedeId);
            if (aulaWithSameName && aulaWithSameName.id_aula !== id_aula) {
                throw new Error(`Ya existe un aula con el nombre '${targetNombreAula}' para la sede (ID: ${targetSedeId}).`);
            }
        }

        const updated = await AulaModel.update(id_aula, aulaData);
        if (!updated) {
            throw new Error('No se pudo actualizar el aula.');
        }
        return await this.getAulaById(id_aula); // Retornar con detalles de sede y colegio
    }

    async deleteAula(id_aula) {
        const aula = await AulaModel.findById(id_aula);
        if (!aula) {
            throw new Error('Aula no encontrada.');
        }

        // **IMPORTANTE:** Consideraciones para la eliminación de Aulas.
        // Tu migración tiene FKs desde `GruposClases.id_aula` con `ON DELETE RESTRICT`.
        // Esto significa que no podrás eliminar un aula si hay `GruposClases` asociados a ella.
        const deleted = await AulaModel.delete(id_aula);
        if (!deleted) {
            throw new Error('No se pudo eliminar el aula. Verifique si hay grupos de clases asociados a esta aula.');
        }
        return deleted;
    }
}

module.exports = new AulaService();