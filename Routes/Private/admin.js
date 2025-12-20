/**
 * Admin API Routes (Private - Admin Only)
 * Handles admin-specific operations like managing trucks and users
 */
const express = require('express');
const router = express.Router();
const db = require('../../connectors/db');
const { getUser } = require('../../utils/session');

/**
 * Middleware to check if user is admin
 */
async function requireAdmin(req, res, next) {
    const user = await getUser(req);
    if (!user) {
        return res.status(401).json({ error: 'Unauthorized', message: 'Please login' });
    }
    if (user.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden', message: 'Admin access required' });
    }
    req.user = user;
    next();
}

// Apply admin check to all routes
router.use(requireAdmin);

/**
 * GET /api/v1/admin/stats
 * Get admin dashboard statistics
 */
router.get('/stats', async (req, res) => {
    try {
        const usersCount = await db('FoodTruck.Users').count('userId as count').first();
        const trucksCount = await db('FoodTruck.Trucks').count('truckId as count').first();
        const ordersCount = await db('FoodTruck.Orders').count('orderId as count').first();
        
        return res.status(200).json({
            totalUsers: parseInt(usersCount.count) || 0,
            totalTrucks: parseInt(trucksCount.count) || 0,
            totalOrders: parseInt(ordersCount.count) || 0
        });
    } catch (error) {
        console.error('Get admin stats error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: error.message });
    }
});

/**
 * GET /api/v1/admin/users
 * Get all users
 */
router.get('/users', async (req, res) => {
    try {
        const users = await db('FoodTruck.Users')
            .select('userId', 'name', 'email', 'role', 'birthDate', 'createdAt')
            .orderBy('createdAt', 'desc');
        
        return res.status(200).json(users);
    } catch (error) {
        console.error('Get users error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: error.message });
    }
});

/**
 * PUT /api/v1/admin/users/:userId/role
 * Update user role
 */
router.put('/users/:userId/role', async (req, res) => {
    try {
        const { userId } = req.params;
        const { role } = req.body;
        
        const validRoles = ['customer', 'truckOwner', 'admin'];
        if (!role || !validRoles.includes(role)) {
            return res.status(400).json({ 
                error: 'Validation Error', 
                message: `Invalid role. Valid roles: ${validRoles.join(', ')}` 
            });
        }
        
        const user = await db('FoodTruck.Users').where('userId', userId).first();
        if (!user) {
            return res.status(404).json({ error: 'Not Found', message: 'User not found' });
        }
        
        await db('FoodTruck.Users').where('userId', userId).update({ role });
        
        return res.status(200).json({ message: 'User role updated', userId, role });
    } catch (error) {
        console.error('Update user role error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: error.message });
    }
});

/**
 * GET /api/v1/admin/trucks
 * Get all trucks with owner info
 */
router.get('/trucks', async (req, res) => {
    try {
        const trucks = await db
            .select('t.*', 'u.name as ownerName', 'u.email as ownerEmail')
            .from({ t: 'FoodTruck.Trucks' })
            .leftJoin('FoodTruck.Users as u', 't.ownerId', 'u.userId')
            .orderBy('t.createdAt', 'desc');
        
        return res.status(200).json(trucks);
    } catch (error) {
        console.error('Get trucks error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: error.message });
    }
});

/**
 * POST /api/v1/admin/trucks
 * Create a new truck (admin only)
 */
router.post('/trucks', async (req, res) => {
    try {
        const { truckName, ownerId } = req.body;
        
        if (!truckName || !truckName.trim()) {
            return res.status(400).json({ error: 'Validation Error', message: 'Truck name is required' });
        }
        
        if (!ownerId) {
            return res.status(400).json({ error: 'Validation Error', message: 'Owner ID is required' });
        }
        
        // Verify owner exists and is a truck owner
        const owner = await db('FoodTruck.Users').where('userId', ownerId).first();
        if (!owner) {
            return res.status(404).json({ error: 'Not Found', message: 'Owner not found' });
        }
        if (owner.role !== 'truckOwner') {
            return res.status(400).json({ error: 'Validation Error', message: 'Selected user is not a truck owner' });
        }
        
        // Check if truck name already exists
        const existing = await db('FoodTruck.Trucks')
            .whereRaw('LOWER("truckName") = ?', [truckName.toLowerCase().trim()])
            .first();
        
        if (existing) {
            return res.status(409).json({ error: 'Conflict', message: 'Truck name already exists' });
        }
        
        // Create truck
        const newTruck = {
            truckName: truckName.trim(),
            ownerId: parseInt(ownerId),
            truckStatus: 'available',
            orderStatus: 'available'
        };
        
        const truck = await db('FoodTruck.Trucks').insert(newTruck).returning('*');
        
        return res.status(201).json({ message: 'Truck created successfully', truck: truck[0] });
    } catch (error) {
        console.error('Create truck error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: error.message });
    }
});

/**
 * PUT /api/v1/admin/trucks/:truckId
 * Update a truck
 */
router.put('/trucks/:truckId', async (req, res) => {
    try {
        const { truckId } = req.params;
        const { truckName, ownerId, truckStatus, orderStatus } = req.body;
        
        const truck = await db('FoodTruck.Trucks').where('truckId', truckId).first();
        if (!truck) {
            return res.status(404).json({ error: 'Not Found', message: 'Truck not found' });
        }
        
        const updateData = {};
        if (truckName) updateData.truckName = truckName.trim();
        if (ownerId) updateData.ownerId = parseInt(ownerId);
        if (truckStatus) updateData.truckStatus = truckStatus;
        if (orderStatus) updateData.orderStatus = orderStatus;
        
        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: 'Validation Error', message: 'No update data provided' });
        }
        
        await db('FoodTruck.Trucks').where('truckId', truckId).update(updateData);
        const updatedTruck = await db('FoodTruck.Trucks').where('truckId', truckId).first();
        
        return res.status(200).json({ message: 'Truck updated', truck: updatedTruck });
    } catch (error) {
        console.error('Update truck error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: error.message });
    }
});

/**
 * DELETE /api/v1/admin/trucks/:truckId
 * Delete a truck
 */
router.delete('/trucks/:truckId', async (req, res) => {
    try {
        const { truckId } = req.params;
        
        const truck = await db('FoodTruck.Trucks').where('truckId', truckId).first();
        if (!truck) {
            return res.status(404).json({ error: 'Not Found', message: 'Truck not found' });
        }
        
        // Delete truck (CASCADE will handle related records)
        await db('FoodTruck.Trucks').where('truckId', truckId).del();
        
        return res.status(200).json({ message: 'Truck deleted successfully' });
    } catch (error) {
        console.error('Delete truck error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: error.message });
    }
});

/**
 * POST /api/v1/admin/menu-items
 * Add menu item to any truck (admin only)
 */
router.post('/menu-items', async (req, res) => {
    try {
        const { truckId, name, description, price, category } = req.body;
        
        if (!truckId || !name || !price || !category) {
            return res.status(400).json({ 
                error: 'Validation Error', 
                message: 'Truck ID, name, price, and category are required' 
            });
        }
        
        // Verify truck exists
        const truck = await db('FoodTruck.Trucks').where('truckId', truckId).first();
        if (!truck) {
            return res.status(404).json({ error: 'Not Found', message: 'Truck not found' });
        }
        
        // Create menu item
        const newItem = {
            truckId: parseInt(truckId),
            name: name.trim(),
            description: description || null,
            price: parseFloat(price),
            category: category.trim(),
            status: 'available'
        };
        
        const item = await db('FoodTruck.MenuItems').insert(newItem).returning('*');
        
        // Create inventory entry
        await db('FoodTruck.Inventory').insert({
            itemId: item[0].itemId,
            quantity: 100, // Default stock
            lowStockThreshold: 10
        });
        
        return res.status(201).json({ message: 'Menu item added', item: item[0] });
    } catch (error) {
        console.error('Add menu item error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: error.message });
    }
});

/**
 * DELETE /api/v1/admin/menu-items/:itemId
 * Delete a menu item
 */
router.delete('/menu-items/:itemId', async (req, res) => {
    try {
        const { itemId } = req.params;
        
        const item = await db('FoodTruck.MenuItems').where('itemId', itemId).first();
        if (!item) {
            return res.status(404).json({ error: 'Not Found', message: 'Menu item not found' });
        }
        
        await db('FoodTruck.MenuItems').where('itemId', itemId).del();
        
        return res.status(200).json({ message: 'Menu item deleted' });
    } catch (error) {
        console.error('Delete menu item error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: error.message });
    }
});

module.exports = router;







