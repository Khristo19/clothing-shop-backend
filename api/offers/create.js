const pool = require('../../db');
const { verifyToken, checkRole } = require('../../utils/auth');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { from_shop, items, requested_discount } = req.body || {};

    if (!from_shop || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: 'Missing or invalid fields' });
    }

    try {
        const user = verifyToken(req);
        checkRole(user, ['admin', 'cashier']);

        const result = await pool.query(
            `INSERT INTO offers (from_shop, items, requested_discount, status, created_at, updated_at)
             VALUES ($1, $2, $3, $4, NOW(), NOW())
             RETURNING *`,
            [from_shop, JSON.stringify(items), JSON.stringify(requested_discount ?? null), 'pending']
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('[CREATE OFFER ERROR]', error.message);
        const status = error.message?.startsWith('Unauthorized') ? 401 : 500;
        res.status(status).json({ message: error.message || 'Server error creating offer' });
    }
};
