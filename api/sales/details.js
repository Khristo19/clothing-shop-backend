const pool = require('../../db');
const { verifyToken, checkRole } = require('../../utils/auth');

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

    try {
        const user = verifyToken(req);
        checkRole(user, ['admin', 'cashier']);

        const { id } = req.query;

        if (!id) {
            return res.status(400).json({ message: 'Sale ID is required' });
        }

        const result = await pool.query(
            `SELECT sales.*, users.email AS cashier_email
             FROM sales
             JOIN users ON sales.cashier_id = users.id
             WHERE sales.id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Sale not found' });
        }

        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('[SALE DETAILS ERROR]', error.message);
        const status = error.message?.startsWith('Unauthorized') ? 403 : 500;
        res.status(status).json({ message: error.message || 'Server error fetching sale' });
    }
};
