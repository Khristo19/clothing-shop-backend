const pool = require('../../db');
const {verifyToken, checkRole} = require("../../utils/auth");

module.exports = async (req, res) => {
    if (req.method !== 'PUT') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { offer_id, status } = req.body;

    if (!offer_id || !['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ message: 'Missing offer_id or invalid status' });
    }

    try {
        const user = verifyToken(req);
        checkRole(user, ['admin']);

        const result = await pool.query(
            `UPDATE offers
             SET status = $1, updated_at = NOW()
             WHERE id = $2
                 RETURNING *`,
            [status, offer_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Offer not found' });
        }

        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('[UPDATE OFFER STATUS ERROR]', error.message);
        res.status(500).json({ message: 'Server error updating offer' });
    }
};
