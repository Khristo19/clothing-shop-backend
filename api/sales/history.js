const pool = require('../../db');

module.exports = async (req, res) => {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const result = await pool.query(`
      SELECT s.id, s.total, s.payment_method, s.created_at, s.items, u.email AS cashier_email
      FROM sales s
      LEFT JOIN users u ON s.cashier_id = u.id
      ORDER BY s.created_at DESC
    `);

        res.status(200).json(result.rows);
    } catch (error) {
        console.error('[SALES HISTORY ERROR]', error.message);
        res.status(500).json({ message: 'Server error fetching sales history' });
    }
};
