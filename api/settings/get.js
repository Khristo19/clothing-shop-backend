const pool = require('../../db');
const { verifyToken, checkRole } = require('../../utils/auth');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const user = verifyToken(req);
        checkRole(user, ['admin']);

        const result = await pool.query('SELECT * FROM settings ORDER BY id DESC LIMIT 1');

        if (result.rows.length === 0) {
            // Return default settings if none exist
            return res.status(200).json({
                shop_name: 'Clothing Shop',
                tax_rate: 0,
                currency: 'GEL',
                receipt_header: 'Thank you for shopping with us!',
                receipt_footer: 'Please come again'
            });
        }

        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('[FETCH SETTINGS ERROR]', error.message);
        const status = error.message?.startsWith('Unauthorized') ? 403 : 500;
        res.status(status).json({ message: error.message || 'Server error fetching settings' });
    }
};
