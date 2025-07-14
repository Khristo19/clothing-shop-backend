const pool = require('../../db');

module.exports = async (req, res) => {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const result = await pool.query('SELECT * FROM items ORDER BY created_at DESC');
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('[ITEMS LIST ERROR]', error.message);
        res.status(500).json({ message: 'Server error while fetching items' });
    }
};
