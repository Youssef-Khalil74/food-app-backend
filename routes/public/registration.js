/**
 * Registration API Routes (Public)
 * Handles user registration and login
 */
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../../connectors/db');

/**
 * GET /api/v1/registration
 * Get all users (admin/debug only - remove in production)
 */
router.get('/', async function(req, res) {
    try {
        const users = await db
            .select('userId', 'name', 'email', 'role', 'birthDate')
            .from('FoodTruck.Users')
            .orderBy('userId', 'asc');

        return res.status(200).json(users);
    } catch (error) {
        console.error('Get users error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: error.message });
    }
});

/**
 * GET /api/v1/registration/:userId
 * Get single user (admin/debug only)
 */
router.get('/:userId', async function(req, res) {
    try {
        const { userId } = req.params;

        const user = await db
            .select('userId', 'name', 'email', 'role', 'birthDate')
            .from('FoodTruck.Users')
            .where('userId', userId)
            .first();

        if (!user) {
            return res.status(404).json({ error: 'Not Found', message: 'User not found' });
        }

        return res.status(200).json(user);
    } catch (error) {
        console.error('Get user error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: error.message });
    }
});

/**
 * POST /api/v1/registration
 * Register a new user
 */
router.post('/', async function(req, res) {
    try {
        const { name, email, password, role, birthDate } = req.body;

        // Validation
        if (!name || !email || !password) {
            return res.status(400).json({ 
                error: 'Validation Error',
                message: 'Name, email, and password are required' 
            });
        }

        // Check if user already exists
        const userExists = await db
            .select('*')
            .from('FoodTruck.Users')
            .where('email', email.toLowerCase().trim());

        if (userExists.length > 0) {
            return res.status(409).json({ 
                error: 'User Exists',
                message: 'An account with this email already exists' 
            });
        }

        // Validate role
        const validRoles = ['customer', 'truckOwner'];
        const userRole = role && validRoles.includes(role) ? role : 'customer';

        // Create new user
        const newUser = {
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password: password, // In production, hash this password!
            role: userRole,
            birthDate: birthDate || null
        };

        const user = await db('FoodTruck.Users')
            .insert(newUser)
            .returning('*');

        // Remove password from response
        const { password: _, ...userWithoutPassword } = user[0];

        return res.status(201).json({
            message: 'Registration successful',
            user: userWithoutPassword
        });

    } catch (error) {
        console.error('Registration error:', error.message);
        return res.status(500).json({ 
            error: 'Registration Failed',
            message: 'Could not register user' 
        });
    }
});

/**
 * POST /api/v1/registration/login
 * Login and create session
 */
router.post('/login', async function(req, res) {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email) {
            return res.status(400).json({ 
                error: 'Validation Error',
                message: 'Email is required' 
            });
        }
        if (!password) {
            return res.status(400).json({ 
                error: 'Validation Error',
                message: 'Password is required' 
            });
        }

        // Find user
        const users = await db
            .select('*')
            .from('FoodTruck.Users')
            .where('email', email.toLowerCase().trim());

        if (users.length === 0) {
            return res.status(401).json({ 
                error: 'Authentication Failed',
                message: 'Invalid email or password' 
            });
        }

        const user = users[0];

        // Check password (in production, use bcrypt.compare)
        if (user.password !== password) {
            return res.status(401).json({ 
                error: 'Authentication Failed',
                message: 'Invalid email or password' 
            });
        }

        // Create session token
        const token = uuidv4();
        const currentDateTime = new Date();
        const expiresAt = new Date(currentDateTime.getTime() + 5 * 60 * 60 * 1000); // 5 hours

        // Save session to database
        const session = {
            userId: user.userId,
            token,
            expiresAt
        };

        await db('FoodTruck.Sessions').insert(session);

        // Set cookie options based on environment
        const isProduction = process.env.NODE_ENV === 'production';
        const cookieOptions = {
            expires: expiresAt,
            httpOnly: true,
            sameSite: isProduction ? 'none' : 'lax',
            secure: isProduction, // Only use secure in production (HTTPS)
            path: '/'
        };

        // Set cookie and return response
        return res
            .cookie('session_token', token, cookieOptions)
            .status(200)
            .json({
                message: 'Login successful',
                user: {
                    userId: user.userId,
                    name: user.name,
                    email: user.email,
                    role: user.role
                },
                token: token, // Return token for frontend to use in Authorization header
                expiresAt: expiresAt.toISOString() // Tell frontend when token expires
            });

    } catch (error) {
        console.error('Login error:', error.message);
        return res.status(500).json({ 
            error: 'Login Failed',
            message: 'Could not process login' 
        });
    }
});

/**
 * PUT /api/v1/registration/:userId
 * Update user (admin)
 */
router.put('/:userId', async function(req, res) {
    try {
        const { userId } = req.params;
        const { name, email, role, birthDate } = req.body;

        const user = await db('FoodTruck.Users').where('userId', userId).first();
        if (!user) {
            return res.status(404).json({ error: 'Not Found', message: 'User not found' });
        }

        const updateData = {};
        if (name) updateData.name = name.trim();
        if (email) updateData.email = email.toLowerCase().trim();
        if (role) updateData.role = role;
        if (birthDate) updateData.birthDate = birthDate;

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: 'Validation Error', message: 'No data provided' });
        }

        await db('FoodTruck.Users').where('userId', userId).update(updateData);
        const updatedUser = await db('FoodTruck.Users')
            .select('userId', 'name', 'email', 'role', 'birthDate')
            .where('userId', userId)
            .first();

        return res.status(200).json({ message: 'User updated', user: updatedUser });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({ error: 'Conflict', message: 'Email already in use' });
        }
        console.error('Update user error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: error.message });
    }
});

/**
 * DELETE /api/v1/registration/:userId
 * Delete user (admin)
 */
router.delete('/:userId', async function(req, res) {
    try {
        const { userId } = req.params;

        const user = await db('FoodTruck.Users').where('userId', userId).first();
        if (!user) {
            return res.status(404).json({ error: 'Not Found', message: 'User not found' });
        }

        await db('FoodTruck.Sessions').where('userId', userId).del();
        await db('FoodTruck.Users').where('userId', userId).del();

        return res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Delete user error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: error.message });
    }
});

module.exports = router;



