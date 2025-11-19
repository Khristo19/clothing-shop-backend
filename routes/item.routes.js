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
    const { name, description, price, quantity, image_url } = req.body;

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
            'INSERT INTO items (name, description, price, quantity, image_url) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [name, description || '', price, quantity || 0, finalImageUrl]
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
        res.json(result.rows);
    } catch (error) {
        console.error('Fetch items error:', error);
        res.status(500).json({ message: 'Failed to fetch items' });
    }
});

// 📝 PUT /api/items/:id (admin only)
router.put('/:id', authenticateToken, authorizeRoles('admin'), upload.single('image'), async (req, res) => {
    const { id } = req.params;
    const { name, description, price, quantity, image_url } = req.body;

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
