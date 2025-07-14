const pool = require('../../db');
const { verifyToken, checkRole } = require('../../utils/auth');

module.exports = async (req, res) => {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const user = verifyToken(req);
        checkRole(user, ['admin', 'cashier']);

        const result = await pool.query('SELECT * FROM offers ORDER BY created_at DESC');

        res.status(200).json(result.rows);
    } catch (error) {
        console.error('[OFFERS LIST ERROR]', error.message);
        res.status(403).json({ message: error.message });
    }
};
