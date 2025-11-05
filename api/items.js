const pool = require('../db');
const { verifyToken, checkRole } = require('../utils/auth');

module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');

    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const action = req.query.action || 'list';

    try {
        const user = verifyToken(req);

        // Route based on action and method
        if (action === 'list' && req.method === 'GET') {
            checkRole(user, ['admin', 'cashier']);
            return await listItems(req, res);
        } else if (action === 'add' && req.method === 'POST') {
            checkRole(user, ['admin']);
            return await addItem(req, res);
        } else if (action === 'update' && req.method === 'PUT') {
            checkRole(user, ['admin']);
            return await updateItem(req, res);
        } else if (action === 'delete' && req.method === 'DELETE') {
            checkRole(user, ['admin']);
            return await deleteItem(req, res);
        } else {
            return res.status(404).json({ message: 'Items endpoint not found' });
        }
    } catch (error) {
        console.error('[ITEMS ERROR]', error.message);
        const status = error.message?.startsWith('Unauthorized') ? 403 : 500;
        res.status(status).json({ message: error.message || 'Server error' });
    }
};

// LIST ITEMS
async function listItems(req, res) {
    try {
        const result = await pool.query('SELECT * FROM items ORDER BY created_at DESC');
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('[ITEMS LIST ERROR]', error.message);
        res.status(500).json({ message: 'Server error while fetching items' });
    }
}

// ADD ITEM
async function addItem(req, res) {
    const { name, description, price, quantity, image_url } = req.body;

    if (!name || !price || !quantity) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    try {
        const result = await pool.query(
            'INSERT INTO items (name, description, price, quantity, image_url) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [name, description, price, quantity, image_url]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('[ADD ITEM ERROR]', error.message);
        res.status(500).json({ message: 'Failed to add item' });
    }
}

// UPDATE ITEM
async function updateItem(req, res) {
    const { id } = req.query;
    const { name, description, price, quantity, image_url } = req.body;

    if (!id) {
        return res.status(400).json({ message: 'Item ID is required' });
    }

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
    if (image_url !== undefined) {
        updates.push(`image_url = $${paramCount++}`);
        values.push(image_url);
    }

    if (updates.length === 0) {
        return res.status(400).json({ message: 'No fields to update' });
    }

    values.push(id);
    const query = `UPDATE items SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;

    try {
        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Item not found' });
        }

        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('[UPDATE ITEM ERROR]', error.message);
        res.status(500).json({ message: 'Failed to update item' });
    }
}

// DELETE ITEM
async function deleteItem(req, res) {
    const { id } = req.query;

    if (!id) {
        return res.status(400).json({ message: 'Item ID is required' });
    }

    try {
        const result = await pool.query('DELETE FROM items WHERE id = $1 RETURNING *', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Item not found' });
        }

        res.status(200).json({ message: 'Item deleted successfully', item: result.rows[0] });
    } catch (error) {
        console.error('[DELETE ITEM ERROR]', error.message);
        res.status(500).json({ message: 'Failed to delete item' });
    }
}
