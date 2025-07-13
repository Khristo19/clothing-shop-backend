const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: 'postgres',
    password: 'Xristo1080.',
    host: 'db.xxzmnjkwlxpkfrrznnmp.supabase.co', // IPv4 host
    port: 5432,
    database: 'postgres',
    ssl: {
        rejectUnauthorized: false
    }
});

module.exports = pool;
