const jwt = require('jsonwebtoken');

function verifyToken(req) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new Error('Unauthorized: No token');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    return decoded; // e.g. { id, role }
}

function checkRole(decoded, allowedRoles) {
    if (!allowedRoles.includes(decoded.role)) {
        throw new Error('Unauthorized: Insufficient role');
    }
}

module.exports = {
    verifyToken,
    checkRole
};
