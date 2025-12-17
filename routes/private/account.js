/**
 * Account API Routes (Private)
 * Handles user profile and account management
 */
const express = require('express');
const router = express.Router();
const db = require('../../connectors/db');
const { getUser, getSessionToken } = require('../../utils/session');

/**
 * GET /api/v1/account
 * Get current user's profile
 */
router.get('/', async (req, res) => {
    try {
        const user = await getUser(req);
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized', message: 'Please login' });
        }

        // Get user profile without password
        const profile = await db('FoodTruck.Users')
            .select('userId', 'name', 'email', 'role', 'birthDate', 'createdAt')
            .where('userId', user.userId)
            .first();

        if (!profile) {
            return res.status(404).json({ error: 'Not Found', message: 'User not found' });
        }

        // If truck owner, include truck info and truck stats
        let trucks = [];
        let stats = {};
        
        if (profile.role === 'truckOwner') {
            trucks = await db('FoodTruck.Trucks')
                .where('ownerId', user.userId)
                .select('truckId', 'truckName', 'truckLogo', 'truckStatus', 'orderStatus');
            
            // Get truck owner stats (orders received, money earned)
            if (trucks.length > 0) {
                const truckIds = trucks.map(t => t.truckId);
                const truckStats = await db('FoodTruck.Orders')
                    .whereIn('truckId', truckIds)
                    .where('orderStatus', '!=', 'cancelled')
                    .count('orderId as totalOrders')
                    .sum('totalPrice as totalEarned')
                    .first();
                
                stats = {
                    totalOrders: parseInt(truckStats.totalOrders) || 0,
                    totalEarned: parseFloat(truckStats.totalEarned) || 0,
                    statsType: 'truckOwner'
                };
            } else {
                stats = { totalOrders: 0, totalEarned: 0, statsType: 'truckOwner' };
            }
        } else {
            // Customer stats (orders placed, money spent)
            const orderStats = await db('FoodTruck.Orders')
                .where('userId', user.userId)
                .where('orderStatus', '!=', 'cancelled')
                .count('orderId as totalOrders')
                .sum('totalPrice as totalSpent')
                .first();
            
            stats = {
                totalOrders: parseInt(orderStats.totalOrders) || 0,
                totalSpent: parseFloat(orderStats.totalSpent) || 0,
                statsType: 'customer'
            };
        }

        return res.status(200).json({
            ...profile,
            trucks: trucks.length > 0 ? trucks : undefined,
            stats
        });
    } catch (error) {
        console.error('Get profile error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: error.message });
    }
});

/**
 * PUT /api/v1/account
 * Update current user's profile (name, email, birthDate, password)
 */
router.put('/', async (req, res) => {
    try {
        const user = await getUser(req);
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized', message: 'Please login' });
        }

        const { name, email, birthDate, password } = req.body;
        const updateData = {};

        if (name) updateData.name = name.trim();
        if (birthDate) updateData.birthDate = birthDate;
        
        // Handle email change
        if (email) {
            const emailLower = email.toLowerCase().trim();
            // Check if email already exists (for another user)
            const emailExists = await db('FoodTruck.Users')
                .where('email', emailLower)
                .whereNot('userId', user.userId)
                .first();
            
            if (emailExists) {
                return res.status(409).json({ error: 'Conflict', message: 'Email already in use' });
            }
            updateData.email = emailLower;
        }
        
        // Handle password change
        if (password) {
            if (password.length < 6) {
                return res.status(400).json({ error: 'Validation Error', message: 'Password must be at least 6 characters' });
            }
            updateData.password = password;
        }

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: 'Validation Error', message: 'No update data provided' });
        }

        await db('FoodTruck.Users').where('userId', user.userId).update(updateData);

        const updatedUser = await db('FoodTruck.Users')
            .select('userId', 'name', 'email', 'role', 'birthDate', 'createdAt')
            .where('userId', user.userId)
            .first();

        return res.status(200).json({ message: 'Profile updated', user: updatedUser });
    } catch (error) {
        console.error('Update profile error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: error.message });
    }
});

/**
 * PUT /api/v1/account/email
 * Update user's email
 */
router.put('/email', async (req, res) => {
    try {
        const user = await getUser(req);
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized', message: 'Please login' });
        }

        const { email, password } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Validation Error', message: 'New email is required' });
        }

        if (!password) {
            return res.status(400).json({ error: 'Validation Error', message: 'Password is required to change email' });
        }

        // Verify password
        const currentUser = await db('FoodTruck.Users').where('userId', user.userId).first();
        if (currentUser.password !== password) {
            return res.status(401).json({ error: 'Authentication Failed', message: 'Incorrect password' });
        }

        // Check if email already exists
        const emailExists = await db('FoodTruck.Users')
            .where('email', email.toLowerCase().trim())
            .whereNot('userId', user.userId)
            .first();

        if (emailExists) {
            return res.status(409).json({ error: 'Conflict', message: 'Email already in use' });
        }

        await db('FoodTruck.Users')
            .where('userId', user.userId)
            .update({ email: email.toLowerCase().trim() });

        return res.status(200).json({ message: 'Email updated successfully', email: email.toLowerCase().trim() });
    } catch (error) {
        console.error('Update email error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: error.message });
    }
});

/**
 * PUT /api/v1/account/password
 * Change user's password
 */
router.put('/password', async (req, res) => {
    try {
        const user = await getUser(req);
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized', message: 'Please login' });
        }

        const { currentPassword, newPassword, confirmPassword } = req.body;

        if (!currentPassword) {
            return res.status(400).json({ error: 'Validation Error', message: 'Current password is required' });
        }

        if (!newPassword) {
            return res.status(400).json({ error: 'Validation Error', message: 'New password is required' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'Validation Error', message: 'Password must be at least 6 characters' });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({ error: 'Validation Error', message: 'Passwords do not match' });
        }

        // Verify current password
        const currentUser = await db('FoodTruck.Users').where('userId', user.userId).first();
        if (currentUser.password !== currentPassword) {
            return res.status(401).json({ error: 'Authentication Failed', message: 'Incorrect current password' });
        }

        // Update password (in production, hash the password!)
        await db('FoodTruck.Users')
            .where('userId', user.userId)
            .update({ password: newPassword });

        return res.status(200).json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('Change password error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: error.message });
    }
});

/**
 * PUT /api/v1/account/name
 * Update user's name
 */
router.put('/name', async (req, res) => {
    try {
        const user = await getUser(req);
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized', message: 'Please login' });
        }

        const { name } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Validation Error', message: 'Name is required' });
        }

        await db('FoodTruck.Users')
            .where('userId', user.userId)
            .update({ name: name.trim() });

        return res.status(200).json({ message: 'Name updated successfully', name: name.trim() });
    } catch (error) {
        console.error('Update name error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: error.message });
    }
});

/**
 * POST /api/v1/account/logout
 * Logout user (invalidate session)
 */
router.post('/logout', async (req, res) => {
    try {
        const sessionToken = getSessionToken(req);

        if (!sessionToken) {
            return res.status(200).json({ message: 'Already logged out' });
        }

        // Delete session from database
        await db('FoodTruck.Sessions').where('token', sessionToken).del();

        // Clear cookie
        return res
            .clearCookie('session_token')
            .status(200)
            .json({ message: 'Logged out successfully' });
    } catch (error) {
        console.error('Logout error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: error.message });
    }
});

/**
 * DELETE /api/v1/account
 * Delete user account
 */
router.delete('/', async (req, res) => {
    try {
        const user = await getUser(req);
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized', message: 'Please login' });
        }

        const { password, confirmDelete } = req.body;

        if (!password) {
            return res.status(400).json({ error: 'Validation Error', message: 'Password is required to delete account' });
        }

        if (confirmDelete !== 'DELETE') {
            return res.status(400).json({ 
                error: 'Validation Error', 
                message: 'Please confirm deletion by setting confirmDelete to "DELETE"' 
            });
        }

        // Verify password
        const currentUser = await db('FoodTruck.Users').where('userId', user.userId).first();
        if (currentUser.password !== password) {
            return res.status(401).json({ error: 'Authentication Failed', message: 'Incorrect password' });
        }

        // If truck owner, check for active orders
        if (currentUser.role === 'truckOwner') {
            const trucks = await db('FoodTruck.Trucks').where('ownerId', user.userId);
            const truckIds = trucks.map(t => t.truckId);

            if (truckIds.length > 0) {
                const activeOrders = await db('FoodTruck.Orders')
                    .whereIn('truckId', truckIds)
                    .whereIn('orderStatus', ['pending', 'confirmed', 'preparing', 'ready'])
                    .count('orderId as count')
                    .first();

                if (parseInt(activeOrders.count) > 0) {
                    return res.status(400).json({ 
                        error: 'Cannot Delete', 
                        message: 'You have active orders. Please complete or cancel them first.' 
                    });
                }
            }
        }

        // Delete all user sessions
        await db('FoodTruck.Sessions').where('userId', user.userId).del();

        // Delete user (CASCADE will handle related records)
        await db('FoodTruck.Users').where('userId', user.userId).del();

        return res
            .clearCookie('session_token')
            .status(200)
            .json({ message: 'Account deleted successfully' });
    } catch (error) {
        console.error('Delete account error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: error.message });
    }
});

module.exports = router;

