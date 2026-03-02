import { supabase } from '../config/supabase';

export interface User {
    id: string; // uuid
    type: string; // role/department (e.g. admin, hr, sales)
    name: string;
    username: string; // typically an email
    password?: string; // stored hashed passwords preferably
    address?: string;
    created_at?: string;
}

export const UserModel = {
    // Check the connection / get all users
    getAll: async (): Promise<User[]> => {
        const { data, error } = await supabase.from('users').select('*');
        if (error) throw new Error(error.message);
        return data || [];
    },

    // Get user by username (for login)
    getByUsername: async (username: string): Promise<User | undefined> => {
        const { data, error } = await supabase.from('users').select('*').eq('username', username).single();
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
