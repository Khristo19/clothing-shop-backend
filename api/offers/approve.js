const pool = require('../../db');

module.exports = async (req, res) => {
    if (req.method !== 'PUT') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { offer_id } = req.body;

    if (!offer_id) {
        return res.status(400).json({ message: 'Missing offer_id' });
    }

    try {
        const result = await pool.query(
            `UPDATE offers
       SET status = 'approved', updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
            [offer_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Offer not found' });
        }

        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('[APPROVE OFFER ERROR]', error.message);
        res.status(500).json({ message: 'Server error approving offer' });
    }
};
