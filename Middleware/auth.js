/**
 * Authentication Middleware
 * Validates session tokens for protected routes
 */
const db = require('../connectors/db');
const { getSessionToken } = require('../utils/session');

/**
 * Authentication middleware for private routes
 * Checks if user has valid session token
 */
async function authMiddleware(req, res, next) {
    const sessionToken = getSessionToken(req);
    
    if (!sessionToken) {
        console.log('Session token is null');
        return res.status(401).json({ 
            error: 'Unauthorized', 
            message: 'No session token provided. Please login.' 
        });
    }

    try {
        // Get session from database
        const userSession = await db
            .select('*')
            .from('FoodTruck.Sessions')
            .where('token', sessionToken)
            .first();

        if (!userSession) {
            console.log('User session token not found - need to login');
            return res.status(401).json({ 
                error: 'Unauthorized', 
                message: 'Invalid session token. Please login.' 
            });
        }

        // Check if session has expired
        if (new Date() > new Date(userSession.expiresAt)) {
            console.log('Session expired - need to login again');
            // Delete expired session
            await db('FoodTruck.Sessions').where('token', sessionToken).del();
            return res.status(401).json({ 
                error: 'Session Expired', 
                message: 'Your session has expired. Please login again.' 
            });
        }

        // Attach userId to request for use in route handlers
        req.userId = userSession.userId;
        req.sessionToken = sessionToken;

        // All checks passed - user is authenticated
        next();
    } catch (error) {
        console.error('Auth middleware error:', error.message);
        return res.status(500).json({ 
            error: 'Authentication Error', 
            message: 'An error occurred during authentication.' 
        });
    }
}

/**
 * Role-based authorization middleware
 * @param {...string} allowedRoles - Roles that are allowed access
 */
function requireRole(...allowedRoles) {
    return async (req, res, next) => {
        try {
            const user = await db
                .select('role')
                .from('FoodTruck.Users')
                .where('userId', req.userId)
                .first();

            if (!user) {
                return res.status(404).json({ 
                    error: 'User Not Found', 
                    message: 'User account not found.' 
                });
            }

            if (!allowedRoles.includes(user.role)) {
                return res.status(403).json({ 
                    error: 'Forbidden', 
                    message: `Access denied. Required role: ${allowedRoles.join(' or ')}` 
                });
            }

            req.userRole = user.role;
            next();
        } catch (error) {
            console.error('Role check error:', error.message);
            return res.status(500).json({ 
                error: 'Authorization Error', 
                message: 'An error occurred during authorization.' 
            });
        }
    };
}

module.exports = { authMiddleware, requireRole };


