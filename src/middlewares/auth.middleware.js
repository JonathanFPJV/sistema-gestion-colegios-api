const { verifyToken } = require('../utils/jwt.util');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ message: 'Acceso denegado. No se proporcionó token.' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
        return res.status(403).json({ message: 'Token inválido o expirado.' });
    }

    req.user = decoded; // Adjunta el payload del token al objeto request
    next();
};

module.exports = {
    authenticateToken
};