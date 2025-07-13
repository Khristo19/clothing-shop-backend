const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    },
    host: 'db.xxzmnjkwlxpkfrrznnmp.supabase.co' // <- this forces IPv4 lookup
});

module.exports = pool;
