const ColegioModel = require('../models/Colegio.model');

class ColegioService {
    async getAllColegios() {
        return await ColegioModel.findAll();
    }

    async getColegioById(id_colegio) {
        const colegio = await ColegioModel.findById(id_colegio);
        if (!colegio) {
            throw new Error('Colegio no encontrado.');
        }
        return colegio;
    }

    async createColegio(colegioData) {
        const { nombre_colegio, codigo_modular, ruc, email_principal } = colegioData;

        // Validaciones de unicidad
        const existingByName = await ColegioModel.findByName(nombre_colegio);
        if (existingByName) {
            throw new Error('Ya existe un colegio con este nombre.');
        }
        const existingByCodigo = await ColegioModel.findByCodigoModular(codigo_modular);
        if (existingByCodigo) {
            throw new Error('Ya existe un colegio con este código modular.');
        }
        const existingByRuc = await ColegioModel.findByRuc(ruc);
        if (existingByRuc) {
            throw new Error('Ya existe un colegio con este RUC.');
        }
        if (email_principal) { // Validar unicidad si el email es proporcionado
            const existingByEmail = await ColegioModel.findByField('email_principal', email_principal);
            if (existingByEmail) {
                throw new Error('Ya existe un colegio con este correo electrónico principal.');
            }
        }

        return await ColegioModel.create(colegioData);
    }

    async updateColegio(id_colegio, colegioData) {
        const existingColegio = await ColegioModel.findById(id_colegio);
        if (!existingColegio) {
            throw new Error('Colegio no encontrado.');
        }

        // Validaciones de unicidad en la actualización
        if (colegioData.nombre_colegio && colegioData.nombre_colegio !== existingColegio.nombre_colegio) {
            const byName = await ColegioModel.findByName(colegioData.nombre_colegio);
            if (byName && byName.id_colegio !== id_colegio) {
                throw new Error('El nombre de colegio ya está en uso.');
            }
        }
        if (colegioData.codigo_modular && colegioData.codigo_modular !== existingColegio.codigo_modular) {
            const byCodigo = await ColegioModel.findByCodigoModular(colegioData.codigo_modular);
            if (byCodigo && byCodigo.id_colegio !== id_colegio) {
                throw new Error('El código modular ya está en uso.');
            }
        }
        if (colegioData.ruc && colegioData.ruc !== existingColegio.ruc) {
            const byRuc = await ColegioModel.findByRuc(colegioData.ruc);
            if (byRuc && byRuc.id_colegio !== id_colegio) {
                throw new Error('El RUC ya está en uso.');
            }
        }
        if (colegioData.email_principal && colegioData.email_principal !== existingColegio.email_principal) {
            const byEmail = await ColegioModel.findByField('email_principal', colegioData.email_principal);
            if (byEmail && byEmail.id_colegio !== id_colegio) {
                throw new Error('El correo electrónico principal ya está en uso.');
            }
        }

        const updated = await ColegioModel.update(id_colegio, colegioData);
        if (!updated) {
            throw new Error('No se pudo actualizar el colegio.');
        }
        return updated;
    }

    async deleteColegio(id_colegio) {
        const colegio = await ColegioModel.findById(id_colegio);
        if (!colegio) {
            throw new Error('Colegio no encontrado.');
        }

        // **IMPORTANTE:** Consideraciones para la eliminación de Colegios.
        // Tu migración tiene FKs desde `Sedes.id_colegio`, `Cursos.id_colegio` con `ON DELETE CASCADE`.
        // Esto significa que al eliminar un colegio, sus sedes y cursos asociados también se eliminarán automáticamente.
        // Si hay otras dependencias (ej. alumnos o docentes asociados directamente a un colegio en alguna tabla no FK),
        // asegúrate de que ON DELETE sea adecuado o maneja la desvinculación aquí.

        const deleted = await ColegioModel.delete(id_colegio);
        if (!deleted) {
            throw new Error('No se pudo eliminar el colegio.');
        }
        return deleted;
    }
}

module.exports = new ColegioService();