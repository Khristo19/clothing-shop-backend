const pool = require('../../db');
const { verifyToken, checkRole } = require('../../utils/auth');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const decoded = verifyToken(req);
        checkRole(decoded, ['admin']); // Only admin can add items

        const { name, description, price, quantity, image_url } = req.body;

        if (!name || !price || !quantity) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const result = await pool.query(
            'INSERT INTO items (name, description, price, quantity, image_url) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [name, description, price, quantity, image_url]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('[ADD ITEM ERROR]', error.message);
        res.status(403).json({ message: error.message || 'Unauthorized' });
    }
};
