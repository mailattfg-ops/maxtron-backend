import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

export interface AuthRequest extends Request {
    user?: any;
}

export const protect = (req: AuthRequest, res: Response, next: NextFunction) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_dev_key_12345');
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
    }
};

export const adminOnly = (req: AuthRequest, res: Response, next: NextFunction) => {
    const roleName = (req.user?.role_name || '').toLowerCase();
    const email = (req.user?.email || '').toLowerCase();
    const isAdmin = roleName === 'admin' || email === 'admin@maxtron.com' || email === 'admin@keil.com' || email === 'admin';
    if (req.user && isAdmin) {
        next();
    } else {
        return res.status(403).json({ success: false, message: 'Forbidden: Admin access only' });
    }
};
