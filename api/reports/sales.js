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

        // Daily breakdown
        const dailySales = await pool.query(`
            SELECT
                DATE(created_at) as date,
                COUNT(*) as transaction_count,
                COALESCE(SUM(total), 0) as revenue
            FROM sales
            WHERE created_at >= $1 AND created_at <= $2
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        `, [from, to]);

        // Payment method breakdown
        const paymentBreakdown = await pool.query(`
            SELECT
                payment_method,
                payment_bank,
                COUNT(*) as count,
                COALESCE(SUM(total), 0) as total
            FROM sales
            WHERE created_at >= $1 AND created_at <= $2
            GROUP BY payment_method, payment_bank
        `, [from, to]);

        // Total summary
        const summary = await pool.query(`
            SELECT
                COUNT(*) as total_transactions,
                COALESCE(SUM(total), 0) as total_revenue,
                COALESCE(AVG(total), 0) as avg_order_value
            FROM sales
            WHERE created_at >= $1 AND created_at <= $2
        `, [from, to]);

        res.status(200).json({
            summary: summary.rows[0],
            dailySales: dailySales.rows,
            paymentBreakdown: paymentBreakdown.rows
        });
    } catch (error) {
        console.error('[SALES REPORT ERROR]', error.message);
        const status = error.message?.startsWith('Unauthorized') ? 403 : 500;
        res.status(status).json({ message: error.message || 'Server error generating sales report' });
    }
};
