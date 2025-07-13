const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    },
    host: 'db.xxzmnjkwlxpkfrrznnmp.supabase.co', // force IPv4 hostname
    port: 5432,
    keepAlive: true
});

module.exports = pool;
