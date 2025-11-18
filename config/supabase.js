const { createClient } = require('@supabase/supabase-js');

// Lazy initialization - only create client when actually needed
let supabaseClient = null;
let initError = null;

const getSupabaseClient = () => {
    // Return cached client if already initialized
    if (supabaseClient) {
        return supabaseClient;
    }

    // If we already tried and failed, throw the same error
    if (initError) {
        throw initError;
    }

    try {
        // Extract Supabase URL from DATABASE_URL if not provided separately
        let supabaseUrl = process.env.SUPABASE_URL;

        if (!supabaseUrl) {
            // Try to extract from DATABASE_URL: db.xxxx.supabase.co -> https://xxxx.supabase.co
            const dbUrl = process.env.DATABASE_URL;
            if (dbUrl) {
                const match = dbUrl.match(/db\.([^.]+)\.supabase\.co/);
                if (match) {
                    supabaseUrl = `https://${match[1]}.supabase.co`;
                }
            }
        }

        if (!supabaseUrl) {
            throw new Error(
                'SUPABASE_URL not configured. Please add SUPABASE_URL to your environment variables on Vercel. ' +
                'You can find this in your Supabase dashboard under Project Settings > API > Project URL'
            );
        }

        const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
        if (!supabaseAnonKey) {
            throw new Error(
                'SUPABASE_ANON_KEY not configured. Please add SUPABASE_ANON_KEY to your environment variables on Vercel. ' +
                'You can find this in your Supabase dashboard under Project Settings > API > anon/public key'
            );
        }

        // Create and cache the client
        supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
        return supabaseClient;
    } catch (error) {
        // Cache the error so we don't retry every time
        initError = error;
        throw error;
    }
};

module.exports = getSupabaseClient;
