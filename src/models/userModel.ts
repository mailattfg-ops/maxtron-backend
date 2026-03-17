import { supabase } from '../config/supabase';

export interface User {
    id: string; // uuid
    type: string; // UUID from user_types
    employee_code: string;
    name: string;
    username: string; // email used for login
    password?: string; // stored hashed passwords preferably
    address?: string | null;
    date_of_birth?: string | null;
    guarantor_name?: string | null;
    is_married?: boolean;
    phone?: string | null;
    aadhaar?: string | null;
    category_id?: string | null;
    company_id?: string | null;
    is_deleted?: boolean;
    created_at?: string;
}

export const UserModel = {
    // Check the connection / get all users
    getAll: async (): Promise<User[]> => {
        const { data, error } = await supabase.from('users').select('*').eq('is_deleted', false);
        if (error) throw new Error(error.message);
        return data || [];
    },

    // Get user by username (for login)
    getByUsername: async (username: string): Promise<User | undefined> => {
        const { data, error } = await supabase.from('users').select('*').eq('username', username).eq('is_deleted', false).single();
        if (error && error.code !== 'PGRST116') throw new Error(error.message); // PGRST116 means 0 rows returned
        return data || undefined;
    },

    // Create a new user
    create: async (user: Omit<User, 'id' | 'created_at'>): Promise<User> => {
        const { data, error } = await supabase.from('users').insert([user]).select().single();
        if (error) throw new Error(error.message);
        return data;
    }
};
