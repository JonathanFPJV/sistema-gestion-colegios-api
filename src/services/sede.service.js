const SedeModel = require('../models/Sede.model');
const ColegioModel = require('../models/Colegio.model'); // Para validar la FK

class SedeService {
    async getAllSedes() {
        return await SedeModel.getAllWithColegioDetails();
    }

    async getSedeById(id_sede) {
        const sede = await SedeModel.getByIdWithColegioDetails(id_sede);
        if (!sede) {
            throw new Error('Sede no encontrada.');
        }
        return sede;
    }

    async createSede(sedeData) {
        const { id_colegio, nombre_sede } = sedeData;

        // 1. Validar que el id_colegio exista
        const colegioExists = await ColegioModel.findById(id_colegio);
        if (!colegioExists) {
            throw new Error('El colegio especificado no existe.');
        }

        // 2. Validar unicidad: no puede haber el mismo nombre de sede para el mismo colegio
        const existingSede = await SedeModel.findByNameAndColegio(nombre_sede, id_colegio);
        if (existingSede) {
            throw new Error(`Ya existe una sede con el nombre '${nombre_sede}' para el colegio (ID: ${id_colegio}).`);
        }

        const newSede = await SedeModel.create(sedeData);
        return await this.getSedeById(newSede.id); // Retornar con detalles del colegio
    }

    async updateSede(id_sede, sedeData) {
        const { id_colegio, nombre_sede } = sedeData;

        const existingSede = await SedeModel.findById(id_sede);
        if (!existingSede) {
            throw new Error('Sede no encontrada.');
        }

        // 1. Validar que el id_colegio exista si se intenta cambiar (o si se reasigna)
        if (id_colegio && id_colegio !== existingSede.id_colegio) {
            const colegioExists = await ColegioModel.findById(id_colegio);
            if (!colegioExists) {
                throw new Error('El nuevo colegio especificado para la sede no existe.');
            }
        }

        // 2. Validar unicidad si se intenta cambiar nombre_sede o id_colegio
        const targetColegioId = id_colegio || existingSede.id_colegio;
        const targetNombreSede = nombre_sede || existingSede.nombre_sede;

        if (nombre_sede && nombre_sede !== existingSede.nombre_sede || (id_colegio && id_colegio !== existingSede.id_colegio)) {
            const sedeWithSameName = await SedeModel.findByNameAndColegio(targetNombreSede, targetColegioId);
            if (sedeWithSameName && sedeWithSameName.id_sede !== id_sede) {
                throw new Error(`Ya existe una sede con el nombre '${targetNombreSede}' para el colegio (ID: ${targetColegioId}).`);
            }
        }

        const updated = await SedeModel.update(id_sede, sedeData);
        if (!updated) {
            throw new Error('No se pudo actualizar la sede.');
        }
        return await this.getSedeById(id_sede); // Retornar con detalles del colegio
    }

    async deleteSede(id_sede) {
        const sede = await SedeModel.findById(id_sede);
        if (!sede) {
            throw new Error('Sede no encontrada.');
        }

        // **IMPORTANTE:** Consideraciones para la eliminación de Sedes.
        // Tu migración tiene FKs desde `Aulas.id_sede` y `GruposClases.id_sede` con `ON DELETE CASCADE`.
        // Esto significa que al eliminar una sede, sus aulas y grupos de clases asociados también se eliminarán automáticamente.
        const deleted = await SedeModel.delete(id_sede);
        if (!deleted) {
            throw new Error('No se pudo eliminar la sede.');
        }
        return deleted;
    }
}

module.exports = new SedeService();