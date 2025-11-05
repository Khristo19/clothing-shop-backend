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

        // Today's sales
        const todaySales = await pool.query(`
            SELECT
                COUNT(*) as transaction_count,
                COALESCE(SUM(total), 0) as total_revenue
            FROM sales
            WHERE DATE(created_at) = CURRENT_DATE
        `);

        // This week's sales
        const weekSales = await pool.query(`
            SELECT
                COUNT(*) as transaction_count,
                COALESCE(SUM(total), 0) as total_revenue
            FROM sales
            WHERE created_at >= DATE_TRUNC('week', CURRENT_DATE)
        `);

        // This month's sales
        const monthSales = await pool.query(`
            SELECT
                COUNT(*) as transaction_count,
                COALESCE(SUM(total), 0) as total_revenue
            FROM sales
            WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)
        `);

        // Low stock items (quantity < 10)
        const lowStock = await pool.query(`
            SELECT id, name, quantity, price
            FROM items
            WHERE quantity < 10 AND quantity > 0
            ORDER BY quantity ASC
            LIMIT 10
        `);

        // Out of stock items
        const outOfStock = await pool.query(`
            SELECT id, name, quantity, price
            FROM items
            WHERE quantity = 0
            ORDER BY name ASC
        `);

        // Total inventory value
        const inventoryValue = await pool.query(`
            SELECT COALESCE(SUM(quantity * price), 0) as total_value
            FROM items
        `);

        // Payment method breakdown (today)
        const paymentMethods = await pool.query(`
            SELECT
                payment_method,
                payment_bank,
                COUNT(*) as count,
                COALESCE(SUM(total), 0) as total
            FROM sales
            WHERE DATE(created_at) = CURRENT_DATE
            GROUP BY payment_method, payment_bank
        `);

        // Top selling items (this month)
        const topProducts = await pool.query(`
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
            LIMIT 5
        `);

        res.status(200).json({
            today: {
                transactions: parseInt(todaySales.rows[0].transaction_count),
                revenue: parseFloat(todaySales.rows[0].total_revenue)
            },
            week: {
                transactions: parseInt(weekSales.rows[0].transaction_count),
                revenue: parseFloat(weekSales.rows[0].total_revenue)
            },
            month: {
                transactions: parseInt(monthSales.rows[0].transaction_count),
                revenue: parseFloat(monthSales.rows[0].total_revenue)
            },
            inventory: {
                totalValue: parseFloat(inventoryValue.rows[0].total_value),
                lowStock: lowStock.rows,
                outOfStock: outOfStock.rows
            },
            paymentMethods: paymentMethods.rows,
            topProducts: topProducts.rows
        });
    } catch (error) {
        console.error('[DASHBOARD STATS ERROR]', error.message);
        const status = error.message?.startsWith('Unauthorized') ? 403 : 500;
        res.status(status).json({ message: error.message || 'Server error fetching dashboard stats' });
    }
};
