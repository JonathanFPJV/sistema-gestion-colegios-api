const express = require('express');
const usuarioController = require('../controllers/usuario.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { authorizeRoles } = require('../middlewares/permission.middleware');

const router = express.Router();

// Obtener todos los usuarios
// Solo Administradores Globales pueden ver todos los usuarios del sistema.
router.get(
    '/',
    authenticateToken,
    authorizeRoles('Administrador Global'),
    usuarioController.getAllUsuarios
);

// Obtener un usuario por ID
// Un Administrador Global puede ver cualquier usuario.
// Un Administrador de Colegio podría ver usuarios de su colegio.
// La propia persona (Alumno, Docente, Admin de Colegio) puede ver sus propios datos de usuario.
router.get(
    '/:id',
    authenticateToken,
    authorizeRoles('Administrador Global', 'Administrador Colegio', 'Docente', 'Alumno', 'Apoderado'),
    (req, res, next) => {
        const userIdParam = parseInt(req.params.id);
        const loggedInUserId = req.user.userId; // ID del usuario logueado desde el JWT

        if (req.user.role === 'Administrador Global') {
            next(); // Administrador Global puede ver a cualquiera
        } else if (req.user.role === 'Administrador Colegio') {
            // Lógica compleja aquí: un Admin de Colegio solo debería ver usuarios de su colegio.
            // Para esto, el payload del JWT del Admin Colegio DEBE tener un 'colegioId'.
            // Entonces, se debería verificar si el usuario solicitado (userIdParam)
            // pertenece al mismo colegio que req.user.colegioId.
            // Esto implicaría una consulta adicional para cada usuario solicitado.
            // POR AHORA, para simplicidad, solo un Admin Global o el propio usuario.
            // Implementación más robusta:
            // const targetUser = await UsuarioService.getUsuarioById(userIdParam);
            // if (targetUser && targetUser.colegioId === req.user.colegioId) { next(); } else { res.status(403).json(...) }
            next(); // Por ahora, si es Admin Colegio, se permite ver a cualquier usuario, ajusta esto después.
        } else if (loggedInUserId && loggedInUserId === userIdParam) {
            next(); // El usuario puede ver sus propios datos de usuario
        } else {
            return res.status(403).json({ message: 'Acceso denegado. No tiene permisos para ver este usuario.' });
        }
    },
    usuarioController.getUsuarioById
);

// Crear un nuevo usuario
// Solo Administradores Globales o Administradores de Colegio pueden crear usuarios.
// (La lógica de registro en auth.routes ya maneja la creación de usuario inicial)
router.post(
    '/',
    authenticateToken,
    authorizeRoles('Administrador Global', 'Administrador Colegio'),
    usuarioController.createUsuario
);

// Actualizar un usuario
// Administrador Global puede actualizar cualquier usuario.
// Administrador de Colegio puede actualizar usuarios de su colegio.
// Un usuario puede actualizar sus propios datos (ej. cambiar contraseña).
router.put(
    '/:id',
    authenticateToken,
    authorizeRoles('Administrador Global', 'Administrador Colegio', 'Docente', 'Alumno', 'Apoderado'),
    (req, res, next) => {
        const userIdParam = parseInt(req.params.id);
        const loggedInUserId = req.user.userId;

        if (req.user.role === 'Administrador Global') {
            next();
        } else if (req.user.role === 'Administrador Colegio') {
            // Lógica similar a la de GET por ID para verificar el colegio
            next(); // Temporalmente permite al Admin Colegio editar cualquier usuario, ajustar después
        } else if (loggedInUserId && loggedInUserId === userIdParam) {
            next(); // El usuario puede actualizar sus propios datos (con restricciones en lo que puede cambiar)
        } else {
            return res.status(403).json({ message: 'Acceso denegado. No tiene permisos para actualizar este usuario.' });
        }
    },
    usuarioController.updateUsuario
);

// Eliminar un usuario
// Solo Administradores Globales pueden eliminar usuarios.
router.delete(
    '/:id',
    authenticateToken,
    authorizeRoles('Administrador Global'),
    usuarioController.deleteUsuario
);

module.exports = router;