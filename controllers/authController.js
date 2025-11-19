const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');

const registerUser = async (req, res) => {
    const { email, password, role, name, surname } = req.body;

    console.log('📥 Incoming registration:', { email, role, name, surname });

    if (!email || !password || !role) {
        console.warn('⚠️ Missing input fields:', { email, password, role });
        return res.status(400).json({ message: 'Email, password, and role are required' });
    }

    try {
        console.log('🔍 Checking if user already exists...');
        const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

        if (userExists.rows.length > 0) {
            console.log('🚫 User already exists:', email);
            return res.status(409).json({ message: 'User already exists' });
        }

        console.log('🔐 Hashing password...');
        const hashedPassword = await bcrypt.hash(password, 10);

        console.log('📦 Inserting user into DB...');
        const newUser = await pool.query(
            'INSERT INTO users (email, password, role, name, surname) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, role, name, surname',
            [email, hashedPassword, role, name || null, surname || null]
        );

        console.log('✅ User successfully registered:', newUser.rows[0]);
        res.status(201).json({ user: newUser.rows[0] });
    } catch (error) {
        console.error('❌ Register error:', error.message, '\nStack:', error.stack);
        res.status(500).json({ message: 'Server error during registration' });
    }
};

const loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        console.log('🔑 Login attempt for:', email);

        const userRes = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userRes.rows.length === 0) {
            console.warn('⚠️ No user found:', email);
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const user = userRes.rows[0];
        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            console.warn('⚠️ Incorrect password for:', email);
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '12h' }
        );

        console.log('✅ Login successful for:', email);
        res.json({ token, user: { id: user.id, email: user.email, role: user.role, name: user.name, surname: user.surname } });
    } catch (error) {
        console.error('❌ Login error:', error.message, '\nStack:', error.stack);
        res.status(500).json({ message: 'Server error during login' });
    }
};

module.exports = {
    registerUser,
    loginUser
};
