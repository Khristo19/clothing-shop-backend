const pool = require('../../db');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

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
        res.status(500).json({ message: 'Server error during item creation' });
    }
};
