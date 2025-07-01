const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !req.user.role) { // req.user viene del auth.middleware.js
            return res.status(403).json({ message: 'No tiene los permisos necesarios para realizar esta acción.' });
        }

        const userRole = req.user.role; // Asumiendo que el payload JWT contiene 'role'
        
        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({ message: 'No tiene los permisos necesarios para realizar esta acción.' });
        }
        next();
    };
};

// Middleware para verificar si el usuario pertenece al colegio (para operaciones sensibles)
const authorizeColegio = (req, res, next) => {
    const { id_colegio_param } = req.params; // Asume que el ID del colegio viene en los parámetros de la ruta
    const userColegioId = req.user.colegioId; // Asume que el payload JWT contiene 'colegioId'

    if (req.user.role === 'Administrador Global') {
        next(); // El admin global puede ver/modificar todo
    } else if (userColegioId && id_colegio_param && parseInt(id_colegio_param) === userColegioId) {
        next(); // El admin de colegio puede ver/modificar su propio colegio
    } else {
        return res.status(403).json({ message: 'No tiene permisos para acceder a este colegio.' });
    }
};


module.exports = {
    authorizeRoles,
    authorizeColegio
};