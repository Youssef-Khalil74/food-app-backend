/**
 * Restaurant (Truck) API Routes (Private)
 * Handles truck management for owners
 */
const express = require('express');
const router = express.Router();
const db = require('../../connectors/db');
const { getUser } = require('../../utils/session');
const upload = require('../../Middleware/upload');
const fs = require('fs');

/**
 * GET /api/v1/restaurant
 * Get all restaurants/trucks
 */
router.get('/', async (req, res) => {
    try {
        const trucks = await db('FoodTruck.Trucks')
            .select('truckId', 'truckName', 'truckLogo', 'truckStatus', 'orderStatus', 'createdAt')
            .orderBy('truckName', 'asc');

        return res.status(200).json(trucks);
    } catch (error) {
        console.error('Get trucks error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: error.message });
    }
});

/**
 * GET /api/v1/restaurant/my-trucks
 * Get trucks owned by current user
 */
router.get('/my-trucks', async (req, res) => {
    try {
        const user = await getUser(req);
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized', message: 'Please login' });
        }

        if (user.role !== 'truckOwner') {
            return res.status(403).json({ error: 'Forbidden', message: 'Only truck owners have trucks' });
        }

        const trucks = await db('FoodTruck.Trucks').where('ownerId', user.userId);

        return res.status(200).json(trucks);
    } catch (error) {
        console.error('Get my trucks error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: error.message });
    }
});

/**
 * PUT /api/v1/restaurant/status
 * Update truck order status (owner only)
 */
router.put('/status', async (req, res) => {
    try {
        const user = await getUser(req);
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized', message: 'Please login' });
        }

        if (user.role !== 'truckOwner') {
            return res.status(403).json({ error: 'Forbidden', message: 'Only truck owners can update status' });
        }

        const { orderStatus } = req.body;

        if (!orderStatus || !['available', 'unavailable', 'busy'].includes(orderStatus)) {
            return res.status(400).json({ error: 'Validation Error', message: 'Valid orderStatus is required (available/unavailable/busy)' });
        }

        // Get owner's truck
        const truck = await db('FoodTruck.Trucks').where('ownerId', user.userId).first();

        if (!truck) {
            return res.status(404).json({ error: 'Not Found', message: 'No truck found for this owner' });
        }

        // Update status
        await db('FoodTruck.Trucks').where('truckId', truck.truckId).update({ orderStatus });

        return res.status(200).json({ message: 'Status updated', orderStatus });
    } catch (error) {
        console.error('Update status error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: error.message });
    }
});

/**
 * GET /api/v1/restaurant/:truckId
 * Get single restaurant/truck details
 */
router.get('/:truckId', async (req, res) => {
    try {
        const { truckId } = req.params;

        const truck = await db('FoodTruck.Trucks').where('truckId', truckId).first();

        if (!truck) {
            return res.status(404).json({ error: 'Not Found', message: 'Truck not found' });
        }

        // Get menu items
        const menuItems = await db('FoodTruck.MenuItems')
            .where('truckId', truckId)
            .orderBy('category', 'asc')
            .orderBy('name', 'asc');

        return res.status(200).json({
            ...truck,
            menu: menuItems
        });
    } catch (error) {
        console.error('Get truck error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: error.message });
    }
});

/**
 * POST /api/v1/restaurant
 * Create a new restaurant/truck (ADMIN ONLY - truck owners cannot create trucks)
 */
router.post('/', upload.single('logo'), async (req, res) => {
    try {
        const user = await getUser(req);
        if (!user) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(401).json({ error: 'Unauthorized', message: 'Please login' });
        }

        // Only admin can create trucks
        if (user.role !== 'admin') {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(403).json({ 
                error: 'Forbidden', 
                message: 'Only administrators can create food trucks. Please contact the admin.' 
            });
        }

        const { truckName, ownerId } = req.body;

        if (!truckName || !truckName.trim()) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(400).json({ error: 'Validation Error', message: 'Truck name is required' });
        }

        // Check if truck name exists
        const existing = await db('FoodTruck.Trucks')
            .whereRaw('LOWER("truckName") = ?', [truckName.toLowerCase()])
            .first();
            
        if (existing) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(409).json({ error: 'Conflict', message: 'Truck name already exists' });
        }

        const newTruck = {
            truckName: truckName.trim(),
            truckLogo: req.file ? `/uploads/${req.file.filename}` : null,
            ownerId: ownerId || user.userId,
            truckStatus: 'available',
            orderStatus: 'available'
        };

        const truck = await db('FoodTruck.Trucks').insert(newTruck).returning('*');

        return res.status(201).json({ message: 'Truck created', truck: truck[0] });
    } catch (error) {
        if (req.file) fs.unlinkSync(req.file.path);
        console.error('Create truck error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: error.message });
    }
});

/**
 * PUT /api/v1/restaurant/:truckId
 * Update restaurant/truck details (owner only)
 */
router.put('/:truckId', upload.single('logo'), async (req, res) => {
    try {
        const user = await getUser(req);
        if (!user) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(401).json({ error: 'Unauthorized', message: 'Please login' });
        }

        const { truckId } = req.params;
        const truck = await db('FoodTruck.Trucks').where('truckId', truckId).first();

        if (!truck) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(404).json({ error: 'Not Found', message: 'Truck not found' });
        }

        if (truck.ownerId !== user.userId) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(403).json({ error: 'Forbidden', message: 'You can only update your own trucks' });
        }

        const { truckName, truckStatus, orderStatus } = req.body;
        const updateData = {};

        if (truckName) updateData.truckName = truckName.trim();
        if (truckStatus) updateData.truckStatus = truckStatus;
        if (orderStatus) updateData.orderStatus = orderStatus;
        if (req.file) updateData.truckLogo = `/uploads/${req.file.filename}`;

        if (Object.keys(updateData).length === 0) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(400).json({ error: 'Validation Error', message: 'No update data provided' });
        }

        await db('FoodTruck.Trucks').where('truckId', truckId).update(updateData);
        const updatedTruck = await db('FoodTruck.Trucks').where('truckId', truckId).first();

        return res.status(200).json({ message: 'Truck updated', truck: updatedTruck });
    } catch (error) {
        if (req.file) fs.unlinkSync(req.file.path);
        console.error('Update truck error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: error.message });
    }
});

/**
 * DELETE /api/v1/restaurant/:truckId
 * Delete a restaurant/truck (ADMIN ONLY)
 */
router.delete('/:truckId', async (req, res) => {
    try {
        const user = await getUser(req);
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized', message: 'Please login' });
        }

        // Only admin can delete trucks
        if (user.role !== 'admin') {
            return res.status(403).json({ 
                error: 'Forbidden', 
                message: 'Only administrators can delete food trucks.' 
            });
        }

        const { truckId } = req.params;
        const truck = await db('FoodTruck.Trucks').where('truckId', truckId).first();

        if (!truck) {
            return res.status(404).json({ error: 'Not Found', message: 'Truck not found' });
        }

        await db('FoodTruck.Trucks').where('truckId', truckId).del();

        return res.status(200).json({ message: 'Truck deleted successfully' });
    } catch (error) {
        console.error('Delete truck error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: error.message });
    }
});

/**
 * GET /api/v1/restaurant/:truckId/orders
 * Get orders for a specific truck (owner only)
 */
router.get('/:truckId/orders', async (req, res) => {
    try {
        const user = await getUser(req);
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized', message: 'Please login' });
        }

        const { truckId } = req.params;
        const truck = await db('FoodTruck.Trucks').where('truckId', truckId).first();

        if (!truck) {
            return res.status(404).json({ error: 'Not Found', message: 'Truck not found' });
        }

        if (truck.ownerId !== user.userId) {
            return res.status(403).json({ error: 'Forbidden', message: 'Access denied' });
        }

        const orders = await db
            .select('o.*', 'u.name as customerName', 'u.email as customerEmail')
            .from({ o: 'FoodTruck.Orders' })
            .innerJoin('FoodTruck.Users as u', 'o.userId', 'u.userId')
            .where('o.truckId', truckId)
            .orderBy('o.createdAt', 'desc');

        return res.status(200).json(orders);
    } catch (error) {
        console.error('Get truck orders error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: error.message });
    }
});

module.exports = router;
