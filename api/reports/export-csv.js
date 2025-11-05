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

        const { from, to } = req.query;

        if (!from || !to) {
            return res.status(400).json({ message: 'From and to dates are required' });
        }

        const result = await pool.query(`
            SELECT
                sales.id,
                sales.created_at,
                users.email as cashier_email,
                sales.payment_method,
                sales.payment_bank,
                sales.total,
                sales.items
            FROM sales
            JOIN users ON sales.cashier_id = users.id
            WHERE sales.created_at >= $1 AND sales.created_at <= $2
            ORDER BY sales.created_at DESC
        `, [from, to]);

        // Convert to CSV
        const headers = ['ID', 'Date', 'Cashier', 'Payment Method', 'Bank', 'Total', 'Items'];
        const csvRows = [headers.join(',')];

        result.rows.forEach(row => {
            const items = JSON.parse(row.items);
            const itemsStr = items.map(i => `${i.name} (${i.qty})`).join('; ');

            csvRows.push([
                row.id,
                new Date(row.created_at).toISOString(),
                row.cashier_email,
                row.payment_method,
                row.payment_bank || 'N/A',
                row.total,
                `"${itemsStr}"`
            ].join(','));
        });

        const csv = csvRows.join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=sales_${from}_to_${to}.csv`);
        res.status(200).send(csv);
    } catch (error) {
        console.error('[CSV EXPORT ERROR]', error.message);
        const status = error.message?.startsWith('Unauthorized') ? 403 : 500;
        res.status(status).json({ message: error.message || 'Server error exporting CSV' });
    }
};
