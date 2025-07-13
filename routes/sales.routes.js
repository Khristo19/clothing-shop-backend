const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
const pool = require('../db');

/**
 * @swagger
 * /api/sales:
 *   post:
 *     summary: Create a new sale
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - items
 *               - payment_method
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [id, qty]
 *                   properties:
 *                     id:
 *                       type: integer
 *                     qty:
 *                       type: integer
 *               payment_method:
 *                 type: string
 *                 enum: [cash, BOG, TBC]
 *     responses:
 *       201:
 *         description: Sale created
 *       400:
 *         description: Invalid data
 */


// 💾 POST /api/sales
router.post('/', authenticateToken, authorizeRoles('cashier', 'admin'), async (req, res) => {
    const { items, total, payment_method } = req.body;
    const cashier_id = req.user.id;

    if (!items || !total || !payment_method) {
        return res.status(400).json({ message: 'Missing sale data' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO sales (cashier_id, items, total, payment_method)
             VALUES ($1, $2, $3, $4)
                 RETURNING *`,
            [cashier_id, JSON.stringify(items), total, payment_method]
        );

        res.status(201).json({ sale: result.rows[0] });
    } catch (err) {
        console.error('Sale save error:', err);
        res.status(500).json({ message: 'Failed to save sale' });
    }
});

/**
 * @swagger
 * /api/sales:
 *   get:
 *     summary: Get sales (filterable by date, method, cashier)
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: Start date (YYYY-MM-DD)
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: End date (YYYY-MM-DD)
 *       - in: query
 *         name: payment_method
 *         schema:
 *           type: string
 *           enum: [cash, BOG, TBC]
 *         required: false
 *       - in: query
 *         name: cashier_id
 *         schema:
 *           type: integer
 *         required: false
 *     responses:
 *       200:
 *         description: List of sales
 *       401:
 *         description: Unauthorized
 */


// 📊 GET /api/sales with filters
router.get('/', authenticateToken, authorizeRoles('admin'), async (req, res) => {
    const { method, cashier, from, to } = req.query;

    let query = `
    SELECT sales.*, users.email AS cashier_email
    FROM sales
    JOIN users ON sales.cashier_id = users.id
    WHERE 1=1
  `;
    const values = [];

    if (method) {
        values.push(method);
        query += ` AND sales.payment_method = $${values.length}`;
    }

    if (cashier) {
        values.push(cashier);
        query += ` AND users.email = $${values.length}`;
    }

    if (from) {
        values.push(from);
        query += ` AND sales.created_at >= $${values.length}`;
    }

    if (to) {
        values.push(to);
        query += ` AND sales.created_at <= $${values.length}`;
    }

    query += ` ORDER BY sales.created_at DESC`;

    try {
        const result = await pool.query(query, values);
        res.json({ sales: result.rows });
    } catch (err) {
        console.error('Sales fetch error:', err);
        res.status(500).json({ message: 'Failed to fetch sales' });
    }
});

module.exports = router;
