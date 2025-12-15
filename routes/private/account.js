/**
 * Account API Routes (Private)
 * Handles user profile management
 */
const express = require('express');
const router = express.Router();
const db = require('../../connectors/db');
const { getUser, getUserId } = require('../../utils/session');

/**
 * GET /api/v1/account
 * Get current user profile
 */
router.get('/', async (req, res) => {
    try {
        const user = await getUser(req);
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized', message: 'Please login' });
        }

        const { password, token, expiresAt, ...userData } = user;
        return res.status(200).json(userData);
    } catch (error) {
        console.error('Get profile error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: error.message });
    }
});

/**
 * PUT /api/v1/account
 * Update current user profile
 */
router.put('/', async (req, res) => {
    try {
        const user = await getUser(req);
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized', message: 'Please login' });
        }

        const { name, email, birthDate } = req.body;
        const updateData = {};

        if (name) updateData.name = name.trim();
        if (email) updateData.email = email.toLowerCase().trim();
        if (birthDate) updateData.birthDate = birthDate;

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: 'Validation Error', message: 'No data provided' });
        }

        await db('FoodTruck.Users').where('userId', user.userId).update(updateData);

        const updatedUser = await db('FoodTruck.Users')
            .where('userId', user.userId)
            .select('userId', 'name', 'email', 'role', 'birthDate')
            .first();

        return res.status(200).json({ message: 'Profile updated', user: updatedUser });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({ error: 'Conflict', message: 'Email already in use' });
        }
        console.error('Update profile error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: error.message });
    }
});

/**
 * PUT /api/v1/account/email
 * Update email
 */
router.put('/email', async (req, res) => {
    try {
        const user = await getUser(req);
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized', message: 'Please login' });
        }

        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Validation Error', message: 'Email is required' });
        }

        await db('FoodTruck.Users').where('userId', user.userId).update({ email: email.toLowerCase().trim() });

        return res.status(200).json({ message: 'Email updated successfully' });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({ error: 'Conflict', message: 'Email already in use' });
        }
        console.error('Update email error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: error.message });
    }
});

/**
 * PUT /api/v1/account/password
 * Update password
 */
router.put('/password', async (req, res) => {
    try {
        const user = await getUser(req);
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized', message: 'Please login' });
        }

        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Validation Error', message: 'Current and new password required' });
        }

        if (user.password !== currentPassword) {
            return res.status(401).json({ error: 'Authentication Failed', message: 'Current password is incorrect' });
        }

        await db('FoodTruck.Users').where('userId', user.userId).update({ password: newPassword });

        return res.status(200).json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Update password error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: error.message });
    }
});

/**
 * PUT /api/v1/account/name
 * Update name
 */
router.put('/name', async (req, res) => {
    try {
        const user = await getUser(req);
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized', message: 'Please login' });
        }

        const { name } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Validation Error', message: 'Name is required' });
        }

        await db('FoodTruck.Users').where('userId', user.userId).update({ name: name.trim() });

        return res.status(200).json({ message: 'Name updated successfully' });
    } catch (error) {
        console.error('Update name error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: error.message });
    }
});

/**
 * POST /api/v1/account/logout
 * Logout - delete session
 */
router.post('/logout', async (req, res) => {
    try {
        const userId = await getUserId(req);
        if (userId) {
            await db('FoodTruck.Sessions').where('userId', userId).del();
        }

        return res.clearCookie('session_token').status(200).json({ message: 'Logout successful' });
    } catch (error) {
        console.error('Logout error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: error.message });
    }
});

/**
 * DELETE /api/v1/account
 * Delete account
 */
router.delete('/', async (req, res) => {
    try {
        const user = await getUser(req);
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized', message: 'Please login' });
        }

        await db('FoodTruck.Sessions').where('userId', user.userId).del();
        await db('FoodTruck.Users').where('userId', user.userId).del();

        return res.clearCookie('session_token').status(200).json({ message: 'Account deleted successfully' });
    } catch (error) {
        console.error('Delete account error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: error.message });
    }
});

module.exports = router;



