/**
 * Pickup API Routes (Private)
 * Handles pickup scheduling and management
 */
const express = require('express');
const router = express.Router();
const db = require('../../connectors/db');
const { getUser } = require('../../utils/session');

/**
 * GET /api/v1/pickup
 * Get pickups (customer sees their pickups, owner sees all for their trucks)
 */
router.get('/', async (req, res) => {
    try {
        const user = await getUser(req);
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized', message: 'Please login' });
        }

        let pickups;

        if (user.role === 'truckOwner') {
            // Get pickups for owner's trucks
            pickups = await db
                .select('p.*', 'o.totalPrice', 'o.orderStatus', 'o.userId', 'u.name as customerName', 'u.email as customerEmail', 't.truckName')
                .from({ p: 'FoodTruck.Pickups' })
                .innerJoin('FoodTruck.Orders as o', 'p.orderId', 'o.orderId')
                .innerJoin('FoodTruck.Users as u', 'o.userId', 'u.userId')
                .innerJoin('FoodTruck.Trucks as t', 'o.truckId', 't.truckId')
                .where('t.ownerId', user.userId)
                .orderBy('p.scheduledTime', 'asc');
        } else {
            // Get user's pickups
            pickups = await db
                .select('p.*', 'o.totalPrice', 'o.orderStatus', 't.truckName', 't.truckLogo')
                .from({ p: 'FoodTruck.Pickups' })
                .innerJoin('FoodTruck.Orders as o', 'p.orderId', 'o.orderId')
                .innerJoin('FoodTruck.Trucks as t', 'o.truckId', 't.truckId')
                .where('o.userId', user.userId)
                .orderBy('p.scheduledTime', 'asc');
        }

        return res.status(200).json(pickups);
    } catch (error) {
        console.error('Get pickups error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: error.message });
    }
});

/**
 * GET /api/v1/pickup/:pickupId
 * Get specific pickup details
 */
router.get('/:pickupId', async (req, res) => {
    try {
        const user = await getUser(req);
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized', message: 'Please login' });
        }

        const { pickupId } = req.params;

        const pickup = await db
            .select('p.*', 'o.*', 't.truckName', 't.truckLogo', 't.ownerId', 'u.name as customerName')
            .from({ p: 'FoodTruck.Pickups' })
            .innerJoin('FoodTruck.Orders as o', 'p.orderId', 'o.orderId')
            .innerJoin('FoodTruck.Trucks as t', 'o.truckId', 't.truckId')
            .innerJoin('FoodTruck.Users as u', 'o.userId', 'u.userId')
            .where('p.pickupId', pickupId)
            .first();

        if (!pickup) {
            return res.status(404).json({ error: 'Not Found', message: 'Pickup not found' });
        }

        // Check access
        if (pickup.userId !== user.userId && pickup.ownerId !== user.userId) {
            return res.status(403).json({ error: 'Forbidden', message: 'Access denied' });
        }

        return res.status(200).json(pickup);
    } catch (error) {
        console.error('Get pickup error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: error.message });
    }
});

/**
 * POST /api/v1/pickup
 * Schedule a pickup for an order
 */
router.post('/', async (req, res) => {
    try {
        const user = await getUser(req);
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized', message: 'Please login' });
        }

        const { orderId, scheduledTime, notes } = req.body;

        if (!orderId) {
            return res.status(400).json({ error: 'Validation Error', message: 'Order ID is required' });
        }

        const order = await db('FoodTruck.Orders').where('orderId', orderId).first();
        if (!order) {
            return res.status(404).json({ error: 'Not Found', message: 'Order not found' });
        }

        if (order.userId !== user.userId) {
            return res.status(403).json({ error: 'Forbidden', message: 'You can only schedule pickup for your own orders' });
        }

        if (order.orderStatus === 'cancelled' || order.orderStatus === 'completed') {
            return res.status(400).json({ error: 'Invalid Order', message: 'Cannot schedule pickup for cancelled or completed orders' });
        }

        // Check if pickup already exists
        const existingPickup = await db('FoodTruck.Pickups').where('orderId', orderId).first();
        if (existingPickup) {
            return res.status(409).json({ error: 'Conflict', message: 'Pickup already scheduled for this order' });
        }

        const newPickup = {
            orderId: parseInt(orderId),
            pickupStatus: 'scheduled',
            scheduledTime: scheduledTime || order.estimatedEarliestPickup || new Date(Date.now() + 30 * 60000),
            notes: notes || null
        };

        const pickup = await db('FoodTruck.Pickups').insert(newPickup).returning('*');

        // Notify truck owner
        const truck = await db('FoodTruck.Trucks').where('truckId', order.truckId).first();
        await db('FoodTruck.Notifications').insert({
            userId: truck.ownerId,
            type: 'pickup_scheduled',
            title: 'Pickup Scheduled',
            message: `Pickup scheduled for Order #${orderId} at ${new Date(newPickup.scheduledTime).toLocaleString()}`
        });

        return res.status(201).json({ message: 'Pickup scheduled', pickup: pickup[0] });
    } catch (error) {
        console.error('Schedule pickup error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: error.message });
    }
});

/**
 * PUT /api/v1/pickup/:pickupId
 * Update pickup (reschedule or update status)
 */
router.put('/:pickupId', async (req, res) => {
    try {
        const user = await getUser(req);
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized', message: 'Please login' });
        }

        const { pickupId } = req.params;
        const { pickupStatus, scheduledTime, notes } = req.body;

        const pickup = await db
            .select('p.*', 'o.userId', 't.ownerId')
            .from({ p: 'FoodTruck.Pickups' })
            .innerJoin('FoodTruck.Orders as o', 'p.orderId', 'o.orderId')
            .innerJoin('FoodTruck.Trucks as t', 'o.truckId', 't.truckId')
            .where('p.pickupId', pickupId)
            .first();

        if (!pickup) {
            return res.status(404).json({ error: 'Not Found', message: 'Pickup not found' });
        }

        // Check access
        if (pickup.userId !== user.userId && pickup.ownerId !== user.userId) {
            return res.status(403).json({ error: 'Forbidden', message: 'Access denied' });
        }

        const validStatuses = ['scheduled', 'ready', 'picked_up', 'cancelled'];
        const updateData = {};

        if (pickupStatus) {
            if (!validStatuses.includes(pickupStatus)) {
                return res.status(400).json({ 
                    error: 'Validation Error', 
                    message: `Invalid status. Valid values: ${validStatuses.join(', ')}` 
                });
            }
            updateData.pickupStatus = pickupStatus;
            if (pickupStatus === 'picked_up') {
                updateData.completedAt = new Date();
            }
        }
        if (scheduledTime) updateData.scheduledTime = scheduledTime;
        if (notes !== undefined) updateData.notes = notes;

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: 'Validation Error', message: 'No update data provided' });
        }

        await db('FoodTruck.Pickups').where('pickupId', pickupId).update(updateData);
        const updatedPickup = await db('FoodTruck.Pickups').where('pickupId', pickupId).first();

        // Notify relevant party
        const notifyUserId = pickup.userId === user.userId ? pickup.ownerId : pickup.userId;
        if (pickupStatus) {
            await db('FoodTruck.Notifications').insert({
                userId: notifyUserId,
                type: 'pickup_update',
                title: 'Pickup Status Update',
                message: `Pickup for Order #${pickup.orderId} is now: ${pickupStatus.toUpperCase()}`
            });
        }

        return res.status(200).json({ message: 'Pickup updated', pickup: updatedPickup });
    } catch (error) {
        console.error('Update pickup error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: error.message });
    }
});

/**
 * DELETE /api/v1/pickup/:pickupId
 * Cancel a scheduled pickup
 */
router.delete('/:pickupId', async (req, res) => {
    try {
        const user = await getUser(req);
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized', message: 'Please login' });
        }

        const { pickupId } = req.params;

        const pickup = await db
            .select('p.*', 'o.userId')
            .from({ p: 'FoodTruck.Pickups' })
            .innerJoin('FoodTruck.Orders as o', 'p.orderId', 'o.orderId')
            .where('p.pickupId', pickupId)
            .first();

        if (!pickup) {
            return res.status(404).json({ error: 'Not Found', message: 'Pickup not found' });
        }

        if (pickup.userId !== user.userId) {
            return res.status(403).json({ error: 'Forbidden', message: 'You can only cancel your own pickups' });
        }

        if (pickup.pickupStatus === 'picked_up') {
            return res.status(400).json({ error: 'Cannot Cancel', message: 'Pickup already completed' });
        }

        await db('FoodTruck.Pickups').where('pickupId', pickupId).update({ pickupStatus: 'cancelled' });

        return res.status(200).json({ message: 'Pickup cancelled' });
    } catch (error) {
        console.error('Cancel pickup error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: error.message });
    }
});

module.exports = router;



