const pool = require('../../db');
const { verifyToken, checkRole } = require('../../utils/auth');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { items, total, payment_method, payment_bank } = req.body || {};

    if (!items || !Array.isArray(items) || typeof total !== 'number' || !payment_method) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    const normalizedMethod = payment_method === 'card' ? 'card' : 'cash';
    const bank = normalizedMethod === 'card' && payment_bank ? String(payment_bank).toUpperCase() : null;

    try {
        const user = verifyToken(req);
        checkRole(user, ['admin', 'cashier']);

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            for (const item of items) {
                const qty = Number(item.qty);
                const id = Number(item.id);
                if (!Number.isInteger(qty) || qty <= 0 || !Number.isInteger(id)) {
                    throw new Error('Invalid item payload');
                }

                const update = await client.query(
                    `UPDATE items
                     SET quantity = quantity - $1
                     WHERE id = $2 AND quantity >= $1
                     RETURNING id`,
                    [qty, id]
                );

                if (update.rowCount === 0) {
                    throw new Error(`Insufficient stock for item ${id}`);
                }
            }

            const result = await client.query(
                `INSERT INTO sales (cashier_id, items, total, payment_method, created_at)
                 VALUES ($1, $2, $3, $4, NOW())
                 RETURNING *`,
                [user.id, JSON.stringify(items), total, normalizedMethod]
            );

            await client.query('COMMIT');
            res.status(201).json({ ...result.rows[0], payment_bank: bank });
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('[CART ERROR]', error.message);
            const status = error.message.startsWith('Insufficient stock') || error.message === 'Invalid item payload' ? 400 : 500;
            res.status(status).json({ message: error.message });
        } finally {
            client.release();
        }
    } catch (error) {
        if (error.message?.startsWith('Unauthorized')) {
            return res.status(401).json({ message: error.message });
        }
        console.error('[CART ERROR]', error.message);
        res.status(500).json({ message: 'Server error submitting cart' });
    }
};
