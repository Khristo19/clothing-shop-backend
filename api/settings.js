const pool = require('../db');
const { verifyToken, checkRole } = require('../utils/auth');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const user = verifyToken(req);
        checkRole(user, ['admin']);

        if (req.method === 'GET') {
            return await getSettings(req, res);
        } else if (req.method === 'PUT') {
            return await updateSettings(req, res);
        } else {
            return res.status(405).json({ message: 'Method not allowed' });
        }
    } catch (error) {
        console.error('[SETTINGS ERROR]', error.message);
        const status = error.message?.startsWith('Unauthorized') ? 403 : 500;
        res.status(status).json({ message: error.message || 'Server error' });
    }
};

// GET SETTINGS
async function getSettings(req, res) {
    try {
        const result = await pool.query('SELECT * FROM settings ORDER BY id DESC LIMIT 1');

        if (result.rows.length === 0) {
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
        res.status(500).json({ message: 'Server error fetching settings' });
    }
}

// UPDATE SETTINGS
async function updateSettings(req, res) {
    const { shop_name, tax_rate, currency, receipt_header, receipt_footer } = req.body;

    try {
        const existing = await pool.query('SELECT id FROM settings ORDER BY id DESC LIMIT 1');

        let result;

        if (existing.rows.length === 0) {
            result = await pool.query(`
                INSERT INTO settings (shop_name, tax_rate, currency, receipt_header, receipt_footer)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING *
            `, [
                shop_name || 'Clothing Shop',
                tax_rate || 0,
                currency || 'GEL',
                receipt_header || 'Thank you for shopping with us!',
                receipt_footer || 'Please come again'
            ]);
        } else {
            const updates = [];
            const values = [];
            let paramCount = 1;

            if (shop_name !== undefined) {
                updates.push(`shop_name = $${paramCount++}`);
                values.push(shop_name);
            }
            if (tax_rate !== undefined) {
                updates.push(`tax_rate = $${paramCount++}`);
                values.push(tax_rate);
            }
            if (currency !== undefined) {
                updates.push(`currency = $${paramCount++}`);
                values.push(currency);
            }
            if (receipt_header !== undefined) {
                updates.push(`receipt_header = $${paramCount++}`);
                values.push(receipt_header);
            }
            if (receipt_footer !== undefined) {
                updates.push(`receipt_footer = $${paramCount++}`);
                values.push(receipt_footer);
            }

            if (updates.length === 0) {
                return res.status(400).json({ message: 'No fields to update' });
            }

            updates.push(`updated_at = CURRENT_TIMESTAMP`);
            values.push(existing.rows[0].id);

            const query = `UPDATE settings SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`;
            result = await pool.query(query, values);
        }

        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('[UPDATE SETTINGS ERROR]', error.message);
        res.status(500).json({ message: 'Server error updating settings' });
    }
}
