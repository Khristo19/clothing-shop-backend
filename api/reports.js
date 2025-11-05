const pool = require('../db');
const { verifyToken, checkRole } = require('../utils/auth');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const action = req.query.action || 'dashboard';

    try {
        const user = verifyToken(req);
        checkRole(user, ['admin']);

        if (action === 'dashboard') {
            return await getDashboard(req, res);
        } else if (action === 'sales') {
            return await getSalesReport(req, res);
        } else if (action === 'top-products') {
            return await getTopProducts(req, res);
        } else if (action === 'cashier-performance') {
            return await getCashierPerformance(req, res);
        } else if (action === 'export-csv') {
            return await exportCSV(req, res);
        } else {
            return res.status(404).json({ message: 'Reports endpoint not found' });
        }
    } catch (error) {
        console.error('[REPORTS ERROR]', error.message);
        const status = error.message?.startsWith('Unauthorized') ? 403 : 500;
        res.status(status).json({ message: error.message || 'Server error' });
    }
};

// DASHBOARD
async function getDashboard(req, res) {
    try {
        const todaySales = await pool.query(`
            SELECT COUNT(*) as transaction_count, COALESCE(SUM(total), 0) as total_revenue
            FROM sales WHERE DATE(created_at) = CURRENT_DATE
        `);

        const weekSales = await pool.query(`
            SELECT COUNT(*) as transaction_count, COALESCE(SUM(total), 0) as total_revenue
            FROM sales WHERE created_at >= DATE_TRUNC('week', CURRENT_DATE)
        `);

        const monthSales = await pool.query(`
            SELECT COUNT(*) as transaction_count, COALESCE(SUM(total), 0) as total_revenue
            FROM sales WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)
        `);

        const lowStock = await pool.query(`
            SELECT id, name, quantity, price FROM items
            WHERE quantity < 10 AND quantity > 0 ORDER BY quantity ASC LIMIT 10
        `);

        const outOfStock = await pool.query(`
            SELECT id, name, quantity, price FROM items WHERE quantity = 0 ORDER BY name ASC
        `);

        const inventoryValue = await pool.query(`
            SELECT COALESCE(SUM(quantity * price), 0) as total_value FROM items
        `);

        const paymentMethods = await pool.query(`
            SELECT payment_method, payment_bank, COUNT(*) as count, COALESCE(SUM(total), 0) as total
            FROM sales WHERE DATE(created_at) = CURRENT_DATE GROUP BY payment_method, payment_bank
        `);

        const topProducts = await pool.query(`
            SELECT item_data->>'name' as product_name, item_data->>'id' as product_id,
                   SUM((item_data->>'qty')::integer) as total_sold,
                   SUM((item_data->>'qty')::integer * (item_data->>'price')::numeric) as revenue
            FROM sales, jsonb_array_elements(items::jsonb) as item_data
            WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)
            GROUP BY item_data->>'name', item_data->>'id' ORDER BY total_sold DESC LIMIT 5
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
        res.status(500).json({ message: 'Server error fetching dashboard stats' });
    }
}

// SALES REPORT
async function getSalesReport(req, res) {
    const { from, to } = req.query;

    if (!from || !to) {
        return res.status(400).json({ message: 'From and to dates are required' });
    }

    try {
        const dailySales = await pool.query(`
            SELECT DATE(created_at) as date, COUNT(*) as transaction_count, COALESCE(SUM(total), 0) as revenue
            FROM sales WHERE created_at >= $1 AND created_at <= $2
            GROUP BY DATE(created_at) ORDER BY date ASC
        `, [from, to]);

        const paymentBreakdown = await pool.query(`
            SELECT payment_method, payment_bank, COUNT(*) as count, COALESCE(SUM(total), 0) as total
            FROM sales WHERE created_at >= $1 AND created_at <= $2
            GROUP BY payment_method, payment_bank
        `, [from, to]);

        const summary = await pool.query(`
            SELECT COUNT(*) as total_transactions, COALESCE(SUM(total), 0) as total_revenue,
                   COALESCE(AVG(total), 0) as avg_order_value
            FROM sales WHERE created_at >= $1 AND created_at <= $2
        `, [from, to]);

        res.status(200).json({
            summary: summary.rows[0],
            dailySales: dailySales.rows,
            paymentBreakdown: paymentBreakdown.rows
        });
    } catch (error) {
        console.error('[SALES REPORT ERROR]', error.message);
        res.status(500).json({ message: 'Server error generating sales report' });
    }
}

// TOP PRODUCTS
async function getTopProducts(req, res) {
    const limit = parseInt(req.query.limit) || 10;

    try {
        const result = await pool.query(`
            SELECT item_data->>'name' as product_name, item_data->>'id' as product_id,
                   SUM((item_data->>'qty')::integer) as total_sold,
                   SUM((item_data->>'qty')::integer * (item_data->>'price')::numeric) as revenue
            FROM sales, jsonb_array_elements(items::jsonb) as item_data
            WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)
            GROUP BY item_data->>'name', item_data->>'id' ORDER BY total_sold DESC LIMIT $1
        `, [limit]);

        res.status(200).json(result.rows);
    } catch (error) {
        console.error('[TOP PRODUCTS ERROR]', error.message);
        res.status(500).json({ message: 'Server error fetching top products' });
    }
}

// CASHIER PERFORMANCE
async function getCashierPerformance(req, res) {
    const { from, to } = req.query;

    if (!from || !to) {
        return res.status(400).json({ message: 'From and to dates are required' });
    }

    try {
        const result = await pool.query(`
            SELECT users.id, users.email, users.role, COUNT(sales.id) as total_transactions,
                   COALESCE(SUM(sales.total), 0) as total_revenue,
                   COALESCE(AVG(sales.total), 0) as avg_transaction_value,
                   MIN(sales.created_at) as first_sale, MAX(sales.created_at) as last_sale
            FROM users
            LEFT JOIN sales ON users.id = sales.cashier_id
                AND sales.created_at >= $1 AND sales.created_at <= $2
            WHERE users.role = 'cashier'
            GROUP BY users.id, users.email, users.role ORDER BY total_revenue DESC
        `, [from, to]);

        res.status(200).json(result.rows);
    } catch (error) {
        console.error('[CASHIER PERFORMANCE ERROR]', error.message);
        res.status(500).json({ message: 'Server error fetching cashier performance' });
    }
}

// EXPORT CSV
async function exportCSV(req, res) {
    const { from, to } = req.query;

    if (!from || !to) {
        return res.status(400).json({ message: 'From and to dates are required' });
    }

    try {
        const result = await pool.query(`
            SELECT sales.id, sales.created_at, users.email as cashier_email,
                   sales.payment_method, sales.payment_bank, sales.total, sales.items
            FROM sales
            JOIN users ON sales.cashier_id = users.id
            WHERE sales.created_at >= $1 AND sales.created_at <= $2
            ORDER BY sales.created_at DESC
        `, [from, to]);

        const headers = ['ID', 'Date', 'Cashier', 'Payment Method', 'Bank', 'Total', 'Items'];
        const csvRows = [headers.join(',')];

        result.rows.forEach(row => {
            const items = JSON.parse(row.items);
            const itemsStr = items.map(i => `${i.name} (${i.qty})`).join('; ');

            csvRows.push([
                row.id,
                new Date(row.created_at).toISOString(),
                row.cashier_email,
                row.payment_method,
                row.payment_bank || 'N/A',
                row.total,
                `"${itemsStr}"`
            ].join(','));
        });

        const csv = csvRows.join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=sales_${from}_to_${to}.csv`);
        res.status(200).send(csv);
    } catch (error) {
        console.error('[CSV EXPORT ERROR]', error.message);
        res.status(500).json({ message: 'Server error exporting CSV' });
    }
}
