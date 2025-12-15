/**
 * Session Utility
 * Handles session token extraction and user retrieval
 */
const db = require('../connectors/db');

/**
 * Extract session token from request
 * Checks Authorization header first (for API clients), then cookies (for browsers)
 * @param {Object} req - Express request object
 * @returns {string|null} Session token or null
 */
function getSessionToken(req) {
    // 1. Check Authorization header (Bearer token) - preferred for frontend apps
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.slice(7); // Remove 'Bearer ' prefix
        if (token) return token;
    }

    // 2. Check for token in request body (for some API calls)
    if (req.body && req.body.token) {
        return req.body.token;
    }

    // 3. Check for token in query params (not recommended but useful for testing)
    if (req.query && req.query.token) {
        return req.query.token;
    }

    // 4. Check cookies (for browser-based sessions)
    if (req.cookies && req.cookies.session_token) {
        return req.cookies.session_token;
    }

    // 5. Manual cookie parsing fallback
    if (req.headers.cookie) {
        const cookies = req.headers.cookie
            .split(';')
            .map(cookie => cookie.trim())
            .filter(cookie => cookie.startsWith('session_token='))
            .join('');

        if (cookies) {
            const sessionToken = cookies.slice('session_token='.length);
            return sessionToken || null;
        }
    }

    return null;
}

/**
 * Get user from session token
 * @param {Object} req - Express request object
 * @returns {Object|null} User object with role-specific data
 */
async function getUser(req) {
    const sessionToken = getSessionToken(req);
    
    if (!sessionToken) {
        console.log('No session token found');
        return null;
    }

    try {
        // Get user from session
        const user = await db
            .select('*')
            .from({ s: 'FoodTruck.Sessions' })
            .where('token', sessionToken)
            .innerJoin('FoodTruck.Users as u', 's.userId', 'u.userId')
            .first();

        if (!user) {
            console.log('User session not found');
            return null;
        }

        // If user is a truck owner, get their truck info
        if (user.role === 'truckOwner') {
            const trucks = await db
                .select('*')
                .from('FoodTruck.Trucks')
                .where('ownerId', user.userId);

            if (trucks.length > 0) {
                // Attach first truck to user (or all trucks)
                const truckOwnerUser = { 
                    ...user, 
                    truck: trucks[0],
                    trucks: trucks 
                };
                console.log('Truck owner user =>', truckOwnerUser.name);
                return truckOwnerUser;
            }
        }

        console.log('User =>', user.name);
        return user;
    } catch (error) {
        console.error('Error getting user:', error.message);
        return null;
    }
}

/**
 * Get user ID from session token (lightweight version)
 * @param {Object} req - Express request object
 * @returns {number|null} User ID or null
 */
async function getUserId(req) {
    const sessionToken = getSessionToken(req);
    
    if (!sessionToken) {
        return null;
    }

    try {
        const session = await db
            .select('userId')
            .from('FoodTruck.Sessions')
            .where('token', sessionToken)
            .first();

        return session ? session.userId : null;
    } catch (error) {
        console.error('Error getting user ID:', error.message);
        return null;
    }
}

module.exports = { getSessionToken, getUser, getUserId };



