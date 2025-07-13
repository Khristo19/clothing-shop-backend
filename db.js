const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    },
    host: 'db.xxzmnjkwlxpkfrrznnmp.supabase.co', // force IPv4
    port: 5432
});

module.exports = pool;
