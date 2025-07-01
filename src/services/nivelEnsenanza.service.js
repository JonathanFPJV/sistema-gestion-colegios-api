const NivelEnsenanzaModel = require('../models/NivelEnsenanza.model');

class NivelEnsenanzaService {
    async getAllNiveles() {
        return await NivelEnsenanzaModel.findAll();
    }

    async getNivelById(id_nivel) {
        const nivel = await NivelEnsenanzaModel.findById(id_nivel);
        if (!nivel) {
            throw new Error('Nivel de enseñanza no encontrado.');
        }
        return nivel;
    }

    async createNivel(nivelData) {
        const { nombre_nivel } = nivelData;

        // Validar unicidad del nombre del nivel
        const existingNivel = await NivelEnsenanzaModel.findByName(nombre_nivel);
        if (existingNivel) {
            throw new Error('Ya existe un nivel de enseñanza con este nombre.');
        }

        return await NivelEnsenanzaModel.create(nivelData);
    }

    async updateNivel(id_nivel, nivelData) {
        const { nombre_nivel } = nivelData;

        const existingNivel = await NivelEnsenanzaModel.findById(id_nivel);
        if (!existingNivel) {
            throw new Error('Nivel de enseñanza no encontrado.');
        }

        // Validar unicidad del nombre si se intenta cambiar
        if (nombre_nivel && nombre_nivel !== existingNivel.nombre_nivel) {
            const nivelWithSameName = await NivelEnsenanzaModel.findByName(nombre_nivel);
            if (nivelWithSameName && nivelWithSameName.id_nivel !== id_nivel) {
                throw new Error('El nombre de nivel de enseñanza ya está en uso.');
            }
        }

        const updated = await NivelEnsenanzaModel.update(id_nivel, nivelData);
        if (!updated) {
            throw new Error('No se pudo actualizar el nivel de enseñanza.');
        }
        return updated;
    }

    async deleteNivel(id_nivel) {
        const nivel = await NivelEnsenanzaModel.findById(id_nivel);
        if (!nivel) {
            throw new Error('Nivel de enseñanza no encontrado.');
        }

        // **IMPORTANTE:** Consideraciones para la eliminación de Nivel_ensenanza.
        // Tu migración tiene FKs desde `AnosAcademicos.id_nivel` con `ON DELETE RESTRICT`.
        // Esto significa que no podrás eliminar un Nivel_ensenanza si hay `AnosAcademicos` asociados a él.
        // El servicio debe reflejar esto, o la base de datos lo impedirá con un error.
        const deleted = await NivelEnsenanzaModel.delete(id_nivel);
        if (!deleted) {
            throw new Error('No se pudo eliminar el nivel de enseñanza. Verifique si hay años académicos asociados.');
        }
        return deleted;
    }
}

module.exports = new NivelEnsenanzaService();