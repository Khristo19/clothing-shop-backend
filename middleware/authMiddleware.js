const jwt = require('jsonwebtoken');

// ✅ Verify JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ message: 'Access token missing' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Attach decoded user to req
        next();
    } catch (err) {
        console.error('JWT Error:', err);
        return res.status(403).json({ message: 'Invalid or expired token' });
    }
};

// ✅ Role check (admin, cashier, etc.)
const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Forbidden: insufficient permissions' });
        }
        next();
    };
};

module.exports = {
    authenticateToken,
    authorizeRoles
};
