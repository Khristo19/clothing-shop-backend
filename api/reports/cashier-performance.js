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
        checkRole(user, ['admin']);

        const { from, to } = req.query;

        if (!from || !to) {
            return res.status(400).json({ message: 'From and to dates are required' });
        }

        const result = await pool.query(`
            SELECT
                users.id,
                users.email,
                users.role,
                COUNT(sales.id) as total_transactions,
                COALESCE(SUM(sales.total), 0) as total_revenue,
                COALESCE(AVG(sales.total), 0) as avg_transaction_value,
                MIN(sales.created_at) as first_sale,
                MAX(sales.created_at) as last_sale
            FROM users
            LEFT JOIN sales ON users.id = sales.cashier_id
                AND sales.created_at >= $1
                AND sales.created_at <= $2
            WHERE users.role = 'cashier'
            GROUP BY users.id, users.email, users.role
            ORDER BY total_revenue DESC
        `, [from, to]);

        res.status(200).json(result.rows);
    } catch (error) {
        console.error('[CASHIER PERFORMANCE ERROR]', error.message);
        const status = error.message?.startsWith('Unauthorized') ? 403 : 500;
        res.status(status).json({ message: error.message || 'Server error fetching cashier performance' });
    }
};
