const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
const pool = require('../db');

/**
 * @swagger
 * /api/settings:
 *   get:
 *     summary: Get application settings
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Settings object
 */

// 📋 GET /api/settings - Get settings
router.get('/', authenticateToken, authorizeRoles('admin'), async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM settings ORDER BY id DESC LIMIT 1');

        if (result.rows.length === 0) {
            // Return default settings if none exist
            return res.json({
                shop_name: 'Clothing Shop',
                tax_rate: 0,
                currency: 'GEL',
                receipt_header: 'Thank you for shopping with us!',
                receipt_footer: 'Please come again'
            });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Fetch settings error:', error);
        res.status(500).json({ message: 'Failed to fetch settings' });
    }
});

/**
 * @swagger
 * /api/settings:
 *   put:
 *     summary: Update application settings
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               shop_name:
 *                 type: string
 *               tax_rate:
 *                 type: number
 *               currency:
 *                 type: string
 *               receipt_header:
 *                 type: string
 *               receipt_footer:
 *                 type: string
 *     responses:
 *       200:
 *         description: Settings updated
 */

// 📝 PUT /api/settings - Update settings
router.put('/', authenticateToken, authorizeRoles('admin'), async (req, res) => {
    const { shop_name, tax_rate, currency, receipt_header, receipt_footer } = req.body;

    try {
        // Check if settings exist
        const existing = await pool.query('SELECT id FROM settings ORDER BY id DESC LIMIT 1');

        let result;

        if (existing.rows.length === 0) {
            // Insert new settings
            result = await pool.query(`
                INSERT INTO settings (shop_name, tax_rate, currency, receipt_header, receipt_footer)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING *
            `, [
                shop_name || 'Clothing Shop',
                tax_rate || 0,
                currency || 'GEL',
                receipt_header || 'Thank you for shopping with us!',
                receipt_footer || 'Please come again'
            ]);
        } else {
            // Update existing settings
            const updates = [];
            const values = [];
            let paramCount = 1;

            if (shop_name !== undefined) {
                updates.push(`shop_name = $${paramCount++}`);
                values.push(shop_name);
            }
            if (tax_rate !== undefined) {
                updates.push(`tax_rate = $${paramCount++}`);
                values.push(tax_rate);
            }
            if (currency !== undefined) {
                updates.push(`currency = $${paramCount++}`);
                values.push(currency);
            }
            if (receipt_header !== undefined) {
                updates.push(`receipt_header = $${paramCount++}`);
                values.push(receipt_header);
            }
            if (receipt_footer !== undefined) {
                updates.push(`receipt_footer = $${paramCount++}`);
                values.push(receipt_footer);
            }

            if (updates.length === 0) {
                return res.status(400).json({ message: 'No fields to update' });
            }

            updates.push(`updated_at = CURRENT_TIMESTAMP`);
            values.push(existing.rows[0].id);

            const query = `UPDATE settings SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
            result = await pool.query(query, values);
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({ message: 'Failed to update settings' });
    }
});

module.exports = router;
