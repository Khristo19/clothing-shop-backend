const { createClient } = require('@supabase/supabase-js');

// Extract Supabase URL from DATABASE_URL if not provided separately
const getSupabaseUrl = () => {
    if (process.env.SUPABASE_URL) {
        return process.env.SUPABASE_URL;
    }

    // Extract from DATABASE_URL: db.xxxx.supabase.co -> https://xxxx.supabase.co
    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl) {
        const match = dbUrl.match(/db\.([^.]+)\.supabase\.co/);
        if (match) {
            return `https://${match[1]}.supabase.co`;
        }
    }

    throw new Error('SUPABASE_URL or DATABASE_URL not configured');
};

const supabaseUrl = getSupabaseUrl();
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseAnonKey) {
    throw new Error('SUPABASE_ANON_KEY is required in environment variables');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

module.exports = supabase;
