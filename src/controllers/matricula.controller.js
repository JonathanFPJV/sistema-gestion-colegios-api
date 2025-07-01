const MatriculaService = require('../services/matricula.service');
const PersonaModel = require('../models/Persona.model'); // Para verificar el rol y colegio de la persona
const GrupoClaseModel = require('../models/GrupoClase.model'); // Para verificar la pertenencia a un colegio
const { uploadFileToCloudinary } = require('../utils/fileUpload.util'); // Para la subida de archivos

// Función auxiliar para procesar archivos específicos de la matrícula
const processMatriculaFiles = async (files) => {
    let urls = {};
    if (files) {
        if (files.url_contrato_matricula && files.url_contrato_matricula[0]) {
            urls.url_contrato_matricula = await uploadFileToCloudinary(files.url_contrato_matricula[0].buffer, 'matriculas/contratos');
        }
        if (files.url_historial_medico && files.url_historial_medico[0]) {
            urls.url_historial_medico = await uploadFileToCloudinary(files.url_historial_medico[0].buffer, 'matriculas/historial_medico');
        }
        if (files.url_ficha_socioeconomica && files.url_ficha_socioeconomica[0]) {
            urls.url_ficha_socioeconomica = await uploadFileToCloudinary(files.url_ficha_socioeconomica[0].buffer, 'matriculas/ficha_socioeconomica');
        }
        if (files.url_partida_nacimiento && files.url_partida_nacimiento[0]) {
            urls.url_partida_nacimiento = await uploadFileToCloudinary(files.url_partida_nacimiento[0].buffer, 'matriculas/partidas_nacimiento');
        }
        if (files.url_documento_notas_previas && files.url_documento_notas_previas[0]) {
            urls.url_documento_notas_previas = await uploadFileToCloudinary(files.url_documento_notas_previas[0].buffer, 'matriculas/notas_previas');
        }
    }
    return urls;
};

const getAllMatriculas = async (req, res) => {
    try {
        let matriculas;
        // La lógica para filtrar por colegio se manejará en el middleware de ruta.
        if (req.user.role === 'Administrador Colegio' && req.user.colegioId) {
            matriculas = await MatriculaService.matriculaModel.getMatriculasByColegioId(req.user.colegioId);
        } else if (req.user.role === 'Alumno' && req.user.personaId) {
            // Un alumno solo puede ver sus propias matrículas
            matriculas = await MatriculaService.matriculaModel.getMatriculasByPersonaId(req.user.personaId);
        } else {
            matriculas = await MatriculaService.getAllMatriculas(); // Solo Admin Global ve todos
        }
        res.status(200).json(matriculas);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getMatriculaById = async (req, res) => {
    try {
        const { id } = req.params;
        const matricula = await MatriculaService.getMatriculaById(id);
        res.status(200).json(matricula);
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
};

const createMatricula = async (req, res) => {
    try {
        const { body, files } = req;
        const { id_persona, id_grupo_clase } = body;

        // Validaciones de autorización y consistencia de colegio para Admin Colegio
        if (req.user.role === 'Administrador Colegio' && req.user.colegioId) {
            // Validar que el alumno pertenece al colegio del administrador (si ya tiene matrícula o cuenta de usuario asociada a un colegio)
            // O, más simple para la creación: validar que el grupo pertenece al colegio del administrador.
            const grupo = await GrupoClaseModel.getByIdWithDetails(id_grupo_clase);
            if (!grupo || grupo.id_colegio !== req.user.colegioId) {
                return res.status(403).json({ message: 'El grupo/clase no pertenece a su colegio.' });
            }
        }
        // Admin Global no tiene estas restricciones de colegio.

        const fileUrls = await processMatriculaFiles(files);
        const matriculaData = { ...body, ...fileUrls };

        const newMatricula = await MatriculaService.createMatricula(matriculaData);
        res.status(201).json(newMatricula);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const updateMatricula = async (req, res) => {
    try {
        const { id } = req.params;
        const { body, files } = req;

        // Validaciones de autorización y consistencia de colegio para Admin Colegio
        if (req.user.role === 'Administrador Colegio' && req.user.colegioId) {
            const matriculaToUpdate = await MatriculaService.getMatriculaById(id);
            if (!matriculaToUpdate || matriculaToUpdate.colegio_id !== req.user.colegioId) {
                return res.status(403).json({ message: 'No tiene permisos para actualizar matrículas de este colegio.' });
            }
            // Si se cambia id_grupo_clase, verificar que el nuevo grupo sea de su colegio
            if (body.id_grupo_clase && body.id_grupo_clase !== matriculaToUpdate.id_grupo_clase) {
                const newGrupo = await GrupoClaseModel.getByIdWithDetails(body.id_grupo_clase);
                if (!newGrupo || newGrupo.id_colegio !== req.user.colegioId) {
                    return res.status(403).json({ message: 'El nuevo grupo/clase no pertenece a su colegio.' });
                }
            }
        }

        const fileUrls = await processMatriculaFiles(files);
        const matriculaData = { ...body, ...fileUrls };

        const updated = await MatriculaService.updateMatricula(id, matriculaData);
        res.status(200).json({ message: 'Matrícula actualizada exitosamente.', data: updated });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const deleteMatricula = async (req, res) => {
    try {
        const { id } = req.params;

        // Validaciones de autorización y consistencia de colegio para Admin Colegio
        if (req.user.role === 'Administrador Colegio' && req.user.colegioId) {
            const matriculaToDelete = await MatriculaService.getMatriculaById(id);
            if (!matriculaToDelete || matriculaToDelete.colegio_id !== req.user.colegioId) {
                return res.status(403).json({ message: 'No tiene permisos para eliminar matrículas de este colegio.' });
            }
        }

        const deleted = await MatriculaService.deleteMatricula(id);
        res.status(200).json({ message: 'Matrícula eliminada exitosamente.', deleted: deleted });
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
};

module.exports = {
    getAllMatriculas,
    getMatriculaById,
    createMatricula,
    updateMatricula,
    deleteMatricula
};