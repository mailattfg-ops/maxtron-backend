import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { UserModel } from '../models/userModel';
import { supabase } from '../config/supabase';

// Authenticate user and get token
export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;

        // Query Supabase for the user
        const user = await UserModel.getByUsername(email);

        if (!user || !user.password) {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
            return;
        }

        // Compare hashed password (assuming hashes are stored in the DB)
        // For development, if the hash starts with $2a$ or $2b$, we use bcrypt.
        // Otherwise we can fallback to simple comparison.
        let isMatch = false;
        if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
            isMatch = await bcrypt.compare(password, user.password);
        } else {
            isMatch = password === user.password; // fallback for unhashed test users
        }

        if (isMatch) {
            // Fetch User Role Name
            const { data: roleData } = await supabase
                .from('user_types')
                .select('name')
                .eq('id', user.type)
                .single();

            // Fetch User Permissions
            const { data: permissions } = await supabase
                .from('role_permissions')
                .select('permission_key, can_view, can_create, can_edit, can_delete')
                .eq('role_id', user.type);

            const token = jwt.sign(
                {
                    id: user.id,
                    role: user.type,
                    role_name: roleData?.name || '',
                    email: user.username,
                    permissions: permissions || []
                },
                process.env.JWT_SECRET || 'super_secret_dev_key_12345',
                { expiresIn: '30d' }
            );

            res.status(200).json({
                success: true,
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.username,
                    type: user.type,
                    role_name: roleData?.name || '',
                    permissions: permissions || []
                }
            });
        } else {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ success: false, message: 'Server error during login' });
    }
};
