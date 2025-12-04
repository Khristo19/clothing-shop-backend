const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
const pool = require('../db');

/**
 * @swagger
 * /api/locations:
 *   get:
 *     summary: Get all locations
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of locations
 */

// 📍 GET /api/locations - Get all locations (admin + cashier)
router.get('/', authenticateToken, authorizeRoles('admin', 'cashier'), async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM locations ORDER BY name ASC');
        res.json(result.rows);
    } catch (error) {
        console.error('Fetch locations error:', error);
        res.status(500).json({ message: 'Failed to fetch locations' });
    }
});

/**
 * @swagger
 * /api/locations/{id}:
 *   get:
 *     summary: Get single location
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Location details
 */

// 📍 GET /api/locations/:id - Get single location
router.get('/:id', authenticateToken, authorizeRoles('admin', 'cashier'), async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query('SELECT * FROM locations WHERE id = $1', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Location not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Fetch location error:', error);
        res.status(500).json({ message: 'Failed to fetch location' });
    }
});

/**
 * @swagger
 * /api/locations:
 *   post:
 *     summary: Create new location (admin only)
 *     tags: [Locations]
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
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Location created
 */

// ➕ POST /api/locations - Create new location (admin only)
router.post('/', authenticateToken, authorizeRoles('admin'), async (req, res) => {
    const { name } = req.body;

    if (!name || name.trim() === '') {
        return res.status(400).json({ message: 'Location name is required' });
    }

    try {
        // Check if location with same name exists
        const existing = await pool.query('SELECT id FROM locations WHERE name = $1', [name]);
        if (existing.rows.length > 0) {
            return res.status(409).json({ message: 'Location with this name already exists' });
        }

        const result = await pool.query(
            'INSERT INTO locations (name) VALUES ($1) RETURNING *',
            [name]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Create location error:', error);
        res.status(500).json({ message: 'Failed to create location' });
    }
});

/**
 * @swagger
 * /api/locations/{id}:
 *   put:
 *     summary: Update location (admin only)
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Location updated
 */

// 📝 PUT /api/locations/:id - Update location (admin only)
router.put('/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || name.trim() === '') {
        return res.status(400).json({ message: 'Location name is required' });
    }

    try {
        // Check if another location has this name
        const existing = await pool.query('SELECT id FROM locations WHERE name = $1 AND id != $2', [name, id]);
        if (existing.rows.length > 0) {
            return res.status(409).json({ message: 'Another location with this name already exists' });
        }

        const result = await pool.query(
            'UPDATE locations SET name = $1 WHERE id = $2 RETURNING *',
            [name, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Location not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Update location error:', error);
        res.status(500).json({ message: 'Failed to update location' });
    }
});

/**
 * @swagger
 * /api/locations/{id}:
 *   delete:
 *     summary: Delete location (admin only)
 *     tags: [Locations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Location deleted
 *       409:
 *         description: Location is in use
 */

// 🗑️ DELETE /api/locations/:id - Delete location (admin only)
router.delete('/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
    const { id } = req.params;

    try {
        // Check if location is used in sales
        const salesCheck = await pool.query('SELECT COUNT(*) as count FROM sales WHERE location_id = $1', [id]);
        if (parseInt(salesCheck.rows[0].count) > 0) {
            return res.status(409).json({
                message: 'Cannot delete location. It is referenced in sales records.',
                sales_count: salesCheck.rows[0].count
            });
        }

        // Check if location is used in items
        const itemsCheck = await pool.query('SELECT COUNT(*) as count FROM items WHERE location_id = $1', [id]);
        if (parseInt(itemsCheck.rows[0].count) > 0) {
            return res.status(409).json({
                message: 'Cannot delete location. It is assigned to items.',
                items_count: itemsCheck.rows[0].count
            });
        }

        const result = await pool.query('DELETE FROM locations WHERE id = $1 RETURNING *', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Location not found' });
        }

        res.json({ message: 'Location deleted successfully', location: result.rows[0] });
    } catch (error) {
        console.error('Delete location error:', error);
        res.status(500).json({ message: 'Failed to delete location' });
    }
});

module.exports = router;
