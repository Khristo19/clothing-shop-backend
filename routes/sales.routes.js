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
    const { items, total, payment_method, payment_bank } = req.body;
    const cashier_id = req.user.id;

    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: 'Items are required' });
    }
    if (!total || !payment_method) {
        return res.status(400).json({ message: 'Total and payment method are required' });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Validate and decrement stock for each item
        for (const item of items) {
            const { id, qty } = item;

            if (!id || !qty || qty <= 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ message: 'Invalid item quantity' });
            }

            // Check current stock
            const stockCheck = await client.query('SELECT quantity FROM items WHERE id = $1', [id]);

            if (stockCheck.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ message: `Item with id ${id} not found` });
            }

            const currentStock = stockCheck.rows[0].quantity;

            if (currentStock < qty) {
                await client.query('ROLLBACK');
                return res.status(400).json({ message: `Insufficient stock for item ${id}. Available: ${currentStock}, Requested: ${qty}` });
            }

            // Decrement stock
            await client.query(
                'UPDATE items SET quantity = quantity - $1 WHERE id = $2',
                [qty, id]
            );
        }

        // Save sale
        const result = await client.query(
            `INSERT INTO sales (cashier_id, items, total, payment_method, payment_bank)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [cashier_id, JSON.stringify(items), total, payment_method, payment_bank || null]
        );

        await client.query('COMMIT');
        res.status(201).json(result.rows[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Sale save error:', err);
        res.status(500).json({ message: 'Failed to save sale' });
    } finally {
        client.release();
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
router.get('/', authenticateToken, authorizeRoles('admin', 'cashier'), async (req, res) => {
    const { payment_method, cashier_id, from, to } = req.query;

    let query = `
    SELECT sales.*, users.email AS cashier_email
    FROM sales
    JOIN users ON sales.cashier_id = users.id
    WHERE 1=1
  `;
    const values = [];

    if (payment_method) {
        values.push(payment_method);
        query += ` AND sales.payment_method = $${values.length}`;
    }

    if (cashier_id) {
        values.push(cashier_id);
        query += ` AND sales.cashier_id = $${values.length}`;
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
        res.json(result.rows);
    } catch (err) {
        console.error('Sales fetch error:', err);
        res.status(500).json({ message: 'Failed to fetch sales' });
    }
});

// 📄 GET /api/sales/:id - Get single sale details
router.get('/:id', authenticateToken, authorizeRoles('admin', 'cashier'), async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            `SELECT sales.*, users.email AS cashier_email
             FROM sales
             JOIN users ON sales.cashier_id = users.id
             WHERE sales.id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Sale not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Sale fetch error:', err);
        res.status(500).json({ message: 'Failed to fetch sale' });
    }
});

module.exports = router;
