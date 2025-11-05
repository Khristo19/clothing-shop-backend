const pool = require('../db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');

    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Get the action from query parameter or path
    const action = req.query.action || req.url.split('/').pop().split('?')[0];

    try {
        // Route to appropriate handler
        if (action === 'login' && req.method === 'POST') {
            return await handleLogin(req, res);
        } else if (action === 'register' && req.method === 'POST') {
            return await handleRegister(req, res);
        } else if (action === 'me' && req.method === 'GET') {
            return await handleMe(req, res);
        } else {
            return res.status(404).json({ message: 'Auth endpoint not found' });
        }
    } catch (error) {
        console.error('[AUTH ERROR]', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

// LOGIN
async function handleLogin(req, res) {
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

        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '12h' }
        );

        res.status(200).json({ token, user: { id: user.id, email: user.email, role: user.role } });
    } catch (error) {
        console.error('[LOGIN ERROR]', error);
        res.status(500).json({ message: 'Server error during login' });
    }
}

// REGISTER
async function handleRegister(req, res) {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await pool.query(
            'INSERT INTO users (email, password, role) VALUES ($1, $2, $3) RETURNING id, email, role',
            [email, hashedPassword, role]
        );

        res.status(201).json(newUser.rows[0]);
    } catch (error) {
        console.error('[REGISTER ERROR]', error.message);
        res.status(500).json({ message: 'Server error during registration' });
    }
}

// GET ME
async function handleMe(req, res) {
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
}
