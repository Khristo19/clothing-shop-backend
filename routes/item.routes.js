const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
const pool = require('../db');

/**
 * @swagger
 * /api/items:
 *   post:
 *     summary: Add a new item (admin only)
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - price
 *               - description
 *               - image_url
 *             properties:
 *               name:
 *                 type: string
 *               price:
 *                 type: number
 *               description:
 *                 type: string
 *               image_url:
 *                 type: string
 *     responses:
 *       201:
 *         description: Item added
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */


// 🔐 POST /api/items/add (admin only)
router.post('/add', authenticateToken, authorizeRoles('admin'), async (req, res) => {
    const { name, description, price, image_url } = req.body;

    if (!name || !price) {
        return res.status(400).json({ message: 'Name and price are required' });
    }

    try {
        const result = await pool.query(
            'INSERT INTO items (name, description, price, image_url) VALUES ($1, $2, $3, $4) RETURNING *',
            [name, description || '', price, image_url || null]
        );
        res.status(201).json({ item: result.rows[0] });
    } catch (error) {
        console.error('Add item error:', error);
        res.status(500).json({ message: 'Failed to add item' });
    }
});

/**
 * @swagger
 * /api/items:
 *   get:
 *     summary: Get all items
 *     tags: [Items]
 *     responses:
 *       200:
 *         description: List of all items
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */


// 📦 GET /api/items (admin + cashier)
router.get('/', authenticateToken, authorizeRoles('admin', 'cashier'), async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM items ORDER BY created_at DESC');
        res.json({ items: result.rows });
    } catch (error) {
        console.error('Fetch items error:', error);
        res.status(500).json({ message: 'Failed to fetch items' });
    }
});

module.exports = router;
