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
 *               - location_id
 *               - served_by_cashier_id
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
 *               location_id:
 *                 type: integer
 *                 description: Store location ID
 *               served_by_cashier_id:
 *                 type: integer
 *                 description: Cashier who served this sale
 *               partner_cashier_id:
 *                 type: integer
 *                 description: Optional partner cashier
 *     responses:
 *       201:
 *         description: Sale created
 *       400:
 *         description: Invalid data
 */


// 💾 POST /api/sales
router.post('/', authenticateToken, authorizeRoles('cashier', 'admin'), async (req, res) => {
    const { items, total, payment_method, payment_bank, location_id, served_by_cashier_id, partner_cashier_id } = req.body;
    const cashier_id = req.user.id;

    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: 'Items are required' });
    }
    if (!total || !payment_method) {
        return res.status(400).json({ message: 'Total and payment method are required' });
    }
    if (!location_id || !served_by_cashier_id) {
        return res.status(400).json({ message: 'Location and served by cashier are required' });
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
            `INSERT INTO sales (cashier_id, items, total, payment_method, payment_bank, location_id, served_by_cashier_id, partner_cashier_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [cashier_id, JSON.stringify(items), total, payment_method, payment_bank || null, location_id, served_by_cashier_id, partner_cashier_id || null]
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
 *     summary: Get sales (filterable by date, method, cashier, location)
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
 *       - in: query
 *         name: location_id
 *         schema:
 *           type: integer
 *         required: false
 *       - in: query
 *         name: served_by_cashier_id
 *         schema:
 *           type: integer
 *         required: false
 *       - in: query
 *         name: partner_cashier_id
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
    const { payment_method, cashier_id, from, to, location_id, served_by_cashier_id, partner_cashier_id } = req.query;

    let query = `
    SELECT
        sales.*,
        u1.email AS cashier_email,
        u1.name AS cashier_name,
        u1.surname AS cashier_surname,
        u2.email AS served_by_email,
        u2.name AS served_by_name,
        u2.surname AS served_by_surname,
        u3.email AS partner_email,
        u3.name AS partner_name,
        u3.surname AS partner_surname,
        locations.name AS location_name
    FROM sales
    JOIN users u1 ON sales.cashier_id = u1.id
    JOIN users u2 ON sales.served_by_cashier_id = u2.id
    LEFT JOIN users u3 ON sales.partner_cashier_id = u3.id
    JOIN locations ON sales.location_id = locations.id
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

    if (location_id) {
        values.push(location_id);
        query += ` AND sales.location_id = $${values.length}`;
    }

    if (served_by_cashier_id) {
        values.push(served_by_cashier_id);
        query += ` AND sales.served_by_cashier_id = $${values.length}`;
    }

    if (partner_cashier_id) {
        values.push(partner_cashier_id);
        query += ` AND sales.partner_cashier_id = $${values.length}`;
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
            `SELECT
                sales.*,
                u1.email AS cashier_email,
                u1.name AS cashier_name,
                u1.surname AS cashier_surname,
                u2.email AS served_by_email,
                u2.name AS served_by_name,
                u2.surname AS served_by_surname,
                u3.email AS partner_email,
                u3.name AS partner_name,
                u3.surname AS partner_surname,
                locations.name AS location_name
             FROM sales
             JOIN users u1 ON sales.cashier_id = u1.id
             JOIN users u2 ON sales.served_by_cashier_id = u2.id
             LEFT JOIN users u3 ON sales.partner_cashier_id = u3.id
             JOIN locations ON sales.location_id = locations.id
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
