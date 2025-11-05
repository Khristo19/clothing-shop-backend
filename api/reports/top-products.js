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

        const limit = parseInt(req.query.limit) || 10;

        const result = await pool.query(`
            SELECT
                item_data->>'name' as product_name,
                item_data->>'id' as product_id,
                SUM((item_data->>'qty')::integer) as total_sold,
                SUM((item_data->>'qty')::integer * (item_data->>'price')::numeric) as revenue
            FROM sales,
            jsonb_array_elements(items::jsonb) as item_data
            WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)
            GROUP BY item_data->>'name', item_data->>'id'
            ORDER BY total_sold DESC
            LIMIT $1
        `, [limit]);

        res.status(200).json(result.rows);
    } catch (error) {
        console.error('[TOP PRODUCTS ERROR]', error.message);
        const status = error.message?.startsWith('Unauthorized') ? 403 : 500;
        res.status(status).json({ message: error.message || 'Server error fetching top products' });
    }
};
