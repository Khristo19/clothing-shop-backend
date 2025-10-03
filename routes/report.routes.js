const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
const pool = require('../db');

/**
 * @swagger
 * /api/reports/dashboard:
 *   get:
 *     summary: Get dashboard statistics
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard stats
 */

// 📊 GET /api/reports/dashboard - Dashboard statistics
router.get('/dashboard', authenticateToken, authorizeRoles('admin'), async (req, res) => {
    try {
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

        res.json({
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
        console.error('Dashboard stats error:', error);
        res.status(500).json({ message: 'Failed to fetch dashboard stats' });
    }
});

/**
 * @swagger
 * /api/reports/sales:
 *   get:
 *     summary: Get sales report for date range
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *         required: true
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Sales report
 */

// 📈 GET /api/reports/sales - Sales report with date range
router.get('/sales', authenticateToken, authorizeRoles('admin'), async (req, res) => {
    const { from, to } = req.query;

    if (!from || !to) {
        return res.status(400).json({ message: 'From and to dates are required' });
    }

    try {
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

        res.json({
            summary: summary.rows[0],
            dailySales: dailySales.rows,
            paymentBreakdown: paymentBreakdown.rows
        });
    } catch (error) {
        console.error('Sales report error:', error);
        res.status(500).json({ message: 'Failed to generate sales report' });
    }
});

/**
 * @swagger
 * /api/reports/top-products:
 *   get:
 *     summary: Get top selling products
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         required: false
 *     responses:
 *       200:
 *         description: Top products
 */

// 🏆 GET /api/reports/top-products - Top selling products
router.get('/top-products', authenticateToken, authorizeRoles('admin'), async (req, res) => {
    const limit = parseInt(req.query.limit) || 10;

    try {
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

        res.json(result.rows);
    } catch (error) {
        console.error('Top products error:', error);
        res.status(500).json({ message: 'Failed to fetch top products' });
    }
});

/**
 * @swagger
 * /api/reports/cashier-performance:
 *   get:
 *     summary: Get cashier performance metrics
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *         required: true
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: Cashier performance data
 */

// 👤 GET /api/reports/cashier-performance - Cashier performance
router.get('/cashier-performance', authenticateToken, authorizeRoles('admin'), async (req, res) => {
    const { from, to } = req.query;

    if (!from || !to) {
        return res.status(400).json({ message: 'From and to dates are required' });
    }

    try {
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

        res.json(result.rows);
    } catch (error) {
        console.error('Cashier performance error:', error);
        res.status(500).json({ message: 'Failed to fetch cashier performance' });
    }
});

/**
 * @swagger
 * /api/reports/export-csv:
 *   get:
 *     summary: Export sales data as CSV
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *         required: true
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: CSV file
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 */

// 📥 GET /api/reports/export-csv - Export sales as CSV
router.get('/export-csv', authenticateToken, authorizeRoles('admin'), async (req, res) => {
    const { from, to } = req.query;

    if (!from || !to) {
        return res.status(400).json({ message: 'From and to dates are required' });
    }

    try {
        const result = await pool.query(`
            SELECT
                sales.id,
                sales.created_at,
                users.email as cashier_email,
                sales.payment_method,
                sales.payment_bank,
                sales.total,
                sales.items
            FROM sales
            JOIN users ON sales.cashier_id = users.id
            WHERE sales.created_at >= $1 AND sales.created_at <= $2
            ORDER BY sales.created_at DESC
        `, [from, to]);

        // Convert to CSV
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
        res.send(csv);
    } catch (error) {
        console.error('CSV export error:', error);
        res.status(500).json({ message: 'Failed to export CSV' });
    }
});

module.exports = router;
