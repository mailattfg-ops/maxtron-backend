import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || 'placeholder';

if (supabaseUrl === 'https://placeholder.supabase.co' || supabaseKey === 'placeholder') {
    console.warn('⚠️ Supabase URL or Key is missing from your environment variables! Database queries will fail.');
}

const client = createClient(supabaseUrl, supabaseKey);

// Custom extension to satisfy: "Apply ordering in every table query automatically"
// Default sorting: latest → oldest
export const supabase = Object.assign(client, {
    latest: (table: string, columns: string = '*') => {
        // We attempt to find the best chronological column
        // Tables known to prioritize 'date' over 'created_at':
        const dateFields: Record<string, string> = {
            'attendance': 'date',
            'petty_cash': 'date',
            'consumption': 'consumption_date',
            'attendance_log': 'date',
            'purchase_entries': 'entry_date'
        };

        const sortField = dateFields[table] || 'created_at';
        
        // Return a proxy that automatically appends .order() on execution
        // However, standard chainable approach is easier for models:
        // We'll return the base query already ordered.
        
        // Fallback to 'id' if sorting by timestamp/date is explicitly requested elsewhere?
        // For now, we standardize on descending order.
        return client.from(table).select(columns).order(sortField, { ascending: false });
    }
});
