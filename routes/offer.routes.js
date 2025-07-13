const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
const pool = require('../db');

/**
 * @swagger
 * /api/offers:
 *   post:
 *     summary: Create a new offer
 *     tags: [Offers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               from_shop:
 *                 type: string
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     name:
 *                       type: string
 *                     price:
 *                       type: number
 *                     qty:
 *                       type: integer
 *               requested_discount:
 *                 type: object
 *                 properties:
 *                   type:
 *                     type: string
 *                     enum: [percentage, manual]
 *                   value:
 *                     type: number
 *     responses:
 *       201:
 *         description: Offer successfully created
 */


// 📤 Create an offer
router.post('/', authenticateToken, authorizeRoles('cashier', 'admin'), async (req, res) => {
    const { from_shop, items, requested_discount } = req.body;

    if (!from_shop || !items) {
        return res.status(400).json({ message: 'Missing offer data' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO offers (from_shop, items, requested_discount)
             VALUES ($1, $2, $3)
                 RETURNING *`,
            [
                from_shop,
                JSON.stringify(items),
                requested_discount ? JSON.stringify(requested_discount) : null
            ]
        );

        res.status(201).json({ offer: result.rows[0] });
    } catch (err) {
        console.error('Offer creation error:', err);
        res.status(500).json({ message: 'Failed to create offer' });
    }
});

/**
 * @swagger
 * /api/offers:
 *   get:
 *     summary: Get all submitted offers (admin only)
 *     tags: [Offers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of offers
 *       401:
 *         description: Unauthorized
 */


// 📥 Get all offers
router.get('/', authenticateToken, authorizeRoles('admin'), async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM offers ORDER BY created_at DESC`
        );
        res.json({ offers: result.rows });
    } catch (err) {
        console.error('Fetch offers error:', err);
        res.status(500).json({ message: 'Failed to fetch offers' });
    }
});

/**
 * @swagger
 * /api/offers/{id}:
 *   put:
 *     summary: Approve or reject an offer
 *     tags: [Offers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the offer to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [approved, rejected]
 *     responses:
 *       200:
 *         description: Offer updated
 *       400:
 *         description: Invalid status
 *       404:
 *         description: Offer not found
 */


// ✅ Approve or reject an offer
router.put('/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
    }

    try {
        const result = await pool.query(
            `UPDATE offers
             SET status = $1,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $2
                 RETURNING *`,
            [status, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Offer not found' });
        }

        res.json({ offer: result.rows[0] });
    } catch (err) {
        console.error('Update offer error:', err);
        res.status(500).json({ message: 'Failed to update offer' });
    }
});

module.exports = router;
