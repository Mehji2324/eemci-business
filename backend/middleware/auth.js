const jwt = require('jsonwebtoken');
require('dotenv').config();

const authMiddleware = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        console.warn('[authMiddleware] No token provided');
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        console.log(`[authMiddleware] Token verified for user: ${decoded.name} (Role: ${decoded.role})`);
        next();
    } catch (err) {
        console.error('[authMiddleware] Token verification failed:', err.message);
        res.status(401).json({ message: 'Token is not valid' });
    }
};

const roleMiddleware = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            console.error('[roleMiddleware] No user object in request');
            return res.status(500).json({ message: 'Server Error: User context missing' });
        }
        
        console.log(`[roleMiddleware] Checking permissions: Required=[${roles}], Actual="${req.user.role}"`);
        
        if (!roles.includes(req.user.role)) {
            console.warn(`[roleMiddleware] Access denied for ${req.user.name}. Role "${req.user.role}" is not in [${roles}]`);
            return res.status(403).json({ message: 'Access denied: insufficient permissions' });
        }
        next();
    };
};

module.exports = { authMiddleware, roleMiddleware };
