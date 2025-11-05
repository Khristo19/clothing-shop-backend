const pool = require('../db');
const bcrypt = require('bcrypt');
const { verifyToken, checkRole } = require('../utils/auth');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const action = req.query.action || 'list';

    try {
        const user = verifyToken(req);
        checkRole(user, ['admin']);

        if (action === 'list' && req.method === 'GET') {
            return await listUsers(req, res);
        } else if (action === 'create' && req.method === 'POST') {
            return await createUser(req, res);
        } else if (action === 'update' && req.method === 'PUT') {
            return await updateUser(req, res);
        } else if (action === 'delete' && req.method === 'DELETE') {
            return await deleteUser(req, res);
        } else {
            return res.status(404).json({ message: 'Users endpoint not found' });
        }
    } catch (error) {
        console.error('[USERS ERROR]', error.message);
        const status = error.message?.startsWith('Unauthorized') ? 403 : 500;
        res.status(status).json({ message: error.message || 'Server error' });
    }
};

// LIST USERS
async function listUsers(req, res) {
    try {
        const result = await pool.query(
            'SELECT id, email, role, created_at FROM users ORDER BY created_at DESC'
        );
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('[FETCH USERS ERROR]', error.message);
        res.status(500).json({ message: 'Server error fetching users' });
    }
}

// CREATE USER
async function createUser(req, res) {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
        return res.status(400).json({ message: 'Email, password, and role are required' });
    }

    if (!['admin', 'cashier'].includes(role)) {
        return res.status(400).json({ message: 'Invalid role' });
    }

    try {
        const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existing.rows.length > 0) {
            return res.status(409).json({ message: 'User with this email already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await pool.query(
            'INSERT INTO users (email, password, role) VALUES ($1, $2, $3) RETURNING id, email, role, created_at',
            [email, hashedPassword, role]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('[CREATE USER ERROR]', error.message);
        res.status(500).json({ message: 'Server error creating user' });
    }
}

// UPDATE USER
async function updateUser(req, res) {
    const { id } = req.query;
    const { email, role } = req.body;

    if (!id) {
        return res.status(400).json({ message: 'User ID is required' });
    }

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (email !== undefined) {
        updates.push(`email = $${paramCount++}`);
        values.push(email);
    }
    if (role !== undefined) {
        if (!['admin', 'cashier'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role' });
        }
        updates.push(`role = $${paramCount++}`);
        values.push(role);
    }

    if (updates.length === 0) {
        return res.status(400).json({ message: 'No fields to update' });
    }

    values.push(id);
    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING id, email, role, created_at`;

    try {
        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('[UPDATE USER ERROR]', error.message);
        res.status(500).json({ message: 'Server error updating user' });
    }
}

// DELETE USER
async function deleteUser(req, res) {
    const { id } = req.query;

    if (!id) {
        return res.status(400).json({ message: 'User ID is required' });
    }

    try {
        const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id, email', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ message: 'User deleted successfully', user: result.rows[0] });
    } catch (error) {
        console.error('[DELETE USER ERROR]', error.message);
        res.status(500).json({ message: 'Server error deleting user' });
    }
}
