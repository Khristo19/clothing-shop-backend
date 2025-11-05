const pool = require('../db');
const { verifyToken, checkRole } = require('../utils/auth');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const action = req.query.action || 'list';

    try {
        const user = verifyToken(req);

        if (action === 'create' && req.method === 'POST') {
            checkRole(user, ['admin', 'cashier']);
            return await createOffer(req, res, user);
        } else if (action === 'list' && req.method === 'GET') {
            checkRole(user, ['admin']);
            return await listOffers(req, res);
        } else if (action === 'approve' && req.method === 'PUT') {
            checkRole(user, ['admin']);
            return await approveOffer(req, res);
        } else {
            return res.status(404).json({ message: 'Offers endpoint not found' });
        }
    } catch (error) {
        console.error('[OFFERS ERROR]', error.message);
        const status = error.message?.startsWith('Unauthorized') ? 403 : 500;
        res.status(status).json({ message: error.message || 'Server error' });
    }
};

// CREATE OFFER
async function createOffer(req, res, user) {
    const { from_shop, items, requested_discount } = req.body || {};

    if (!from_shop || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: 'Missing or invalid fields' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO offers (from_shop, items, requested_discount, status, created_at, updated_at)
             VALUES ($1, $2, $3, $4, NOW(), NOW())
             RETURNING *`,
            [from_shop, JSON.stringify(items), JSON.stringify(requested_discount ?? null), 'pending']
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('[CREATE OFFER ERROR]', error.message);
        res.status(500).json({ message: 'Server error creating offer' });
    }
}

// LIST OFFERS
async function listOffers(req, res) {
    try {
        const result = await pool.query('SELECT * FROM offers ORDER BY created_at DESC');
        res.status(200).json(result.rows);
    } catch (error) {
        console.error('[OFFERS LIST ERROR]', error.message);
        res.status(500).json({ message: 'Failed to fetch offers' });
    }
}

// APPROVE/REJECT OFFER
async function approveOffer(req, res) {
    const { offer_id, status } = req.body;

    if (!offer_id || !['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ message: 'Missing offer_id or invalid status' });
    }

    try {
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
}
