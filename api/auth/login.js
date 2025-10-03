const pool = require('../../db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');

    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { email, password } = req.body;

    try {
        const userRes = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

        if (userRes.rows.length === 0) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const user = userRes.rows[0];
        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const token = jwt.sign(\r\n            { id: user.id, role: user.role },\r\n            process.env.JWT_SECRET\r\n        );

        res.status(200).json({ token, user: { id: user.id, email: user.email, role: user.role } });
    } catch (error) {
        console.error('[LOGIN ERROR]', error); // Add this line to get full error details
        res.status(500).json({ message: 'Server error during login' });
    }
};


