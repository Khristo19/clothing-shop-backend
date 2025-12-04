const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');
const pool = require('../db');
const upload = require('../middleware/uploadMiddleware');
const supabase = require('../config/supabase');

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
router.post('/add', authenticateToken, authorizeRoles('admin'), upload.single('image'), async (req, res) => {
    const { name, description, price, quantity, size, image_url, location_id } = req.body;

    if (!name || !price) {
        return res.status(400).json({ message: 'Name and price are required' });
    }

    try {
        let finalImageUrl = image_url || null;

        // If a file was uploaded, upload it to Supabase Storage
        if (req.file) {
            const fileExt = req.file.originalname.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `items/${fileName}`;

            // Upload to Supabase Storage
            const { data, error } = await supabase.storage
                .from('product-images')
                .upload(filePath, req.file.buffer, {
                    contentType: req.file.mimetype,
                    cacheControl: '3600'
                });

            if (error) {
                console.error('Supabase upload error:', error);
                return res.status(500).json({ message: 'Failed to upload image', error: error.message });
            }

            // Get public URL
            const { data: urlData } = supabase.storage
                .from('product-images')
                .getPublicUrl(filePath);

            finalImageUrl = urlData.publicUrl;
        }

        const result = await pool.query(
            'INSERT INTO items (name, description, price, quantity, size, image_url, location_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [name, description || '', price, quantity || 0, size || null, finalImageUrl, location_id || null]
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
 *     parameters:
 *       - in: query
 *         name: lowStock
 *         schema:
 *           type: boolean
 *         description: Filter items with low stock (based on settings threshold)
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
        const { lowStock } = req.query;

        if (lowStock === 'true') {
            // Get low stock threshold from settings
            const settingsResult = await pool.query('SELECT low_stock_threshold FROM settings ORDER BY id DESC LIMIT 1');
            const threshold = settingsResult.rows.length > 0 ? settingsResult.rows[0].low_stock_threshold : 5;

            // Return only low stock items with location info
            const result = await pool.query(
                `SELECT items.*, locations.name AS location_name
                 FROM items
                 LEFT JOIN locations ON items.location_id = locations.id
                 WHERE quantity < $1 AND quantity > 0
                 ORDER BY quantity ASC`,
                [threshold]
            );
            return res.json(result.rows);
        }

        // Return all items with location info
        const result = await pool.query(
            `SELECT items.*, locations.name AS location_name
             FROM items
             LEFT JOIN locations ON items.location_id = locations.id
             ORDER BY created_at DESC`
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Fetch items error:', error);
        res.status(500).json({ message: 'Failed to fetch items' });
    }
});

// 📝 PUT /api/items/:id (admin only)
router.put('/:id', authenticateToken, authorizeRoles('admin'), upload.single('image'), async (req, res) => {
    const { id } = req.params;
    const { name, description, price, quantity, size, image_url, location_id } = req.body;

    try {
        const updates = [];
        const values = [];
        let paramCount = 1;

        if (name !== undefined) {
            updates.push(`name = $${paramCount++}`);
            values.push(name);
        }
        if (description !== undefined) {
            updates.push(`description = $${paramCount++}`);
            values.push(description);
        }
        if (price !== undefined) {
            updates.push(`price = $${paramCount++}`);
            values.push(price);
        }
        if (quantity !== undefined) {
            updates.push(`quantity = $${paramCount++}`);
            values.push(quantity);
        }
        if (size !== undefined) {
            updates.push(`size = $${paramCount++}`);
            values.push(size);
        }
        if (location_id !== undefined) {
            updates.push(`location_id = $${paramCount++}`);
            values.push(location_id);
        }

        // Handle file upload if present
        if (req.file) {
            const fileExt = req.file.originalname.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `items/${fileName}`;

            // Upload to Supabase Storage
            const { data, error } = await supabase.storage
                .from('product-images')
                .upload(filePath, req.file.buffer, {
                    contentType: req.file.mimetype,
                    cacheControl: '3600'
                });

            if (error) {
                console.error('Supabase upload error:', error);
                return res.status(500).json({ message: 'Failed to upload image', error: error.message });
            }

            // Get public URL
            const { data: urlData } = supabase.storage
                .from('product-images')
                .getPublicUrl(filePath);

            updates.push(`image_url = $${paramCount++}`);
            values.push(urlData.publicUrl);
        } else if (image_url !== undefined) {
            updates.push(`image_url = $${paramCount++}`);
            values.push(image_url);
        }

        if (updates.length === 0) {
            return res.status(400).json({ message: 'No fields to update' });
        }

        values.push(id);
        const query = `UPDATE items SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;

        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Item not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Update item error:', error);
        res.status(500).json({ message: 'Failed to update item' });
    }
});

// 🗑️ DELETE /api/items/:id (admin only)
router.delete('/:id', authenticateToken, authorizeRoles('admin'), async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query('DELETE FROM items WHERE id = $1 RETURNING *', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Item not found' });
        }

        res.json({ message: 'Item deleted successfully', item: result.rows[0] });
    } catch (error) {
        console.error('Delete item error:', error);
        res.status(500).json({ message: 'Failed to delete item' });
    }
});

module.exports = router;
