const jwt = require('jsonwebtoken');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Access token missing' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const { id, role } = decoded;
        return res.status(200).json({ id, role });
    } catch (err) {
        return res.status(403).json({ message: 'Invalid or expired token' });
    }
};



