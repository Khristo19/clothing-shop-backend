const pool = require('../../db');
const { verifyToken, checkRole } = require('../../utils/auth');

module.exports = async (req, res) => {
    if (req.method !== 'GET') return res.status(405).json({ message: 'Method Not Allowed' });

    try {
        const user = verifyToken(req);
        checkRole(user, ['admin']);

        const result = await pool.query(`
      SELECT s.id, s.total, s.payment_method, s.created_at, s.items, u.email AS cashier_email
      FROM sales s
      LEFT JOIN users u ON s.cashier_id = u.id
      ORDER BY s.created_at DESC
    `);

        res.status(200).json(result.rows);
    } catch (err) {
        console.error('[SALES HISTORY ERROR]', err.message);
        res.status(403).json({ message: err.message });
    }
};
