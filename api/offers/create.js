const pool = require('../../db');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { from_shop, items, requested_discount } = req.body;

    if (!from_shop || !items || !Array.isArray(items)) {
        return res.status(400).json({ message: 'Missing or invalid fields' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO offers (from_shop, items, requested_discount, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING *`,
            [from_shop, JSON.stringify(items), JSON.stringify(requested_discount), 'pending']
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('[CREATE OFFER ERROR]', error.message);
        res.status(500).json({ message: 'Server error creating offer' });
    }
};
