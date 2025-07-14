const pool = require('../../db');
const { verifyToken, checkRole } = require('../../utils/auth');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { items, total, payment_method } = req.body;

    if (!items || !Array.isArray(items) || !total || !payment_method) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    try {
        const user = verifyToken(req);
        checkRole(user, ['admin', 'cashier']);

        const result = await pool.query(
            `INSERT INTO sales (cashier_id, items, total, payment_method, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
            [user.id, JSON.stringify(items), total, payment_method]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('[CART ERROR]', error.message);
        res.status(500).json({ message: 'Server error submitting cart' });
    }
};
