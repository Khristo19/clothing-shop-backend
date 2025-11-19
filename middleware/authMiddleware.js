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
// Admin users can access all routes (including cashier routes)
const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(403).json({ message: 'Forbidden: insufficient permissions' });
        }

        // Admin can access everything
        if (req.user.role === 'admin') {
            return next();
        }

        // Otherwise, check if user's role is in allowed roles
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Forbidden: insufficient permissions' });
        }

        next();
    };
};

module.exports = {
    authenticateToken,
    authorizeRoles
};
