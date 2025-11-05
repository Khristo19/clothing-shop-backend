const pool = require('../db');
const { verifyToken, checkRole } = require('../utils/auth');

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const action = req.query.action || 'history';

    try {
        const user = verifyToken(req);
        checkRole(user, ['admin', 'cashier']);

        if (action === 'cart' && req.method === 'POST') {
            return await createSale(req, res, user);
        } else if (action === 'history' && req.method === 'GET') {
            return await getSalesHistory(req, res);
        } else if (action === 'details' && req.method === 'GET') {
            return await getSaleDetails(req, res);
        } else {
            return res.status(404).json({ message: 'Sales endpoint not found' });
        }
    } catch (error) {
        console.error('[SALES ERROR]', error.message);
        const status = error.message?.startsWith('Unauthorized') ? 403 : 500;
        res.status(status).json({ message: error.message || 'Server error' });
    }
};

// CREATE SALE (CART)
async function createSale(req, res, user) {
    const { items, total, payment_method, payment_bank } = req.body || {};

    if (!items || !Array.isArray(items) || typeof total !== 'number' || !payment_method) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    const normalizedMethod = payment_method === 'card' ? 'card' : 'cash';
    const bank = normalizedMethod === 'card' && payment_bank ? String(payment_bank).toUpperCase() : null;

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
}

// GET SALES HISTORY
async function getSalesHistory(req, res) {
    try {
        const result = await pool.query(`
            SELECT s.id, s.total, s.payment_method, s.created_at, s.items, u.email AS cashier_email
            FROM sales s
            LEFT JOIN users u ON s.cashier_id = u.id
            ORDER BY s.created_at DESC
        `);

        res.status(200).json(result.rows);
    } catch (err) {
        console.error('[SALES HISTORY ERROR]', err.message);
        res.status(500).json({ message: 'Failed to fetch sales' });
    }
}

// GET SALE DETAILS
async function getSaleDetails(req, res) {
    const { id } = req.query;

    if (!id) {
        return res.status(400).json({ message: 'Sale ID is required' });
    }

    try {
        const result = await pool.query(
            `SELECT sales.*, users.email AS cashier_email
             FROM sales
             JOIN users ON sales.cashier_id = users.id
             WHERE sales.id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Sale not found' });
        }

        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error('[SALE DETAILS ERROR]', error.message);
        res.status(500).json({ message: 'Server error fetching sale' });
    }
}
