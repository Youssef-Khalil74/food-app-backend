/**
 * Order API Routes (Private)
 * Handles order management
 */
const express = require('express');
const router = express.Router();
const db = require('../../connectors/db');
const { getUser } = require('../../utils/session');

/**
 * GET /api/v1/order
 * Get user's orders (or truck orders for owner)
 */
router.get('/', async (req, res) => {
    try {
        const user = await getUser(req);
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized', message: 'Please login' });
        }

        let orders;

        if (user.role === 'truckOwner' && req.query.view === 'truck') {
            // Get orders for owner's trucks
            const trucks = await db('FoodTruck.Trucks').where('ownerId', user.userId).select('truckId');
            const truckIds = trucks.map(t => t.truckId);

            if (truckIds.length === 0) {
                return res.status(200).json([]);
            }

            orders = await db
                .select('o.*', 'u.name as customerName', 'u.email as customerEmail', 't.truckName')
                .from({ o: 'FoodTruck.Orders' })
                .innerJoin('FoodTruck.Users as u', 'o.userId', 'u.userId')
                .innerJoin('FoodTruck.Trucks as t', 'o.truckId', 't.truckId')
                .whereIn('o.truckId', truckIds)
                .orderBy('o.createdAt', 'desc');
        } else {
            // Get user's orders
            orders = await db
                .select('o.*', 't.truckName', 't.truckLogo')
                .from({ o: 'FoodTruck.Orders' })
                .innerJoin('FoodTruck.Trucks as t', 'o.truckId', 't.truckId')
                .where('o.userId', user.userId)
                .orderBy('o.createdAt', 'desc');
        }

        return res.status(200).json(orders);
    } catch (error) {
        console.error('Get orders error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: error.message });
    }
});

/**
 * GET /api/v1/order/:orderId
 * Get order details
 */
router.get('/:orderId', async (req, res) => {
    try {
        const user = await getUser(req);
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized', message: 'Please login' });
        }

        const { orderId } = req.params;

        const order = await db
            .select('o.*', 't.truckName', 't.truckLogo', 't.ownerId')
            .from({ o: 'FoodTruck.Orders' })
            .innerJoin('FoodTruck.Trucks as t', 'o.truckId', 't.truckId')
            .where('o.orderId', orderId)
            .first();

        if (!order) {
            return res.status(404).json({ error: 'Not Found', message: 'Order not found' });
        }

        // Check access: user owns order or owns the truck
        if (order.userId !== user.userId && order.ownerId !== user.userId) {
            return res.status(403).json({ error: 'Forbidden', message: 'Access denied' });
        }

        // Get order items
        const items = await db
            .select('oi.*', 'm.name', 'm.description', 'm.category')
            .from({ oi: 'FoodTruck.OrderItems' })
            .innerJoin('FoodTruck.MenuItems as m', 'oi.itemId', 'm.itemId')
            .where('oi.orderId', orderId);

        // Get pickup info if exists
        const pickup = await db('FoodTruck.Pickups').where('orderId', orderId).first();

        // Get customer info if truck owner is viewing
        let customer = null;
        if (order.ownerId === user.userId) {
            customer = await db('FoodTruck.Users')
                .where('userId', order.userId)
                .select('userId', 'name', 'email')
                .first();
        }

        return res.status(200).json({
            ...order,
            items,
            pickup,
            customer
        });
    } catch (error) {
        console.error('Get order error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: error.message });
    }
});

/**
 * POST /api/v1/order
 * Create order from cart
 */
router.post('/', async (req, res) => {
    try {
        const user = await getUser(req);
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized', message: 'Please login' });
        }

        const { truckId, scheduledPickupTime } = req.body;

        if (!truckId) {
            return res.status(400).json({ error: 'Validation Error', message: 'Truck ID is required' });
        }

        // Get cart items for this truck
        const cartItems = await db
            .select('c.*', 'm.truckId', 'm.name')
            .from({ c: 'FoodTruck.Carts' })
            .innerJoin('FoodTruck.MenuItems as m', 'c.itemId', 'm.itemId')
            .where('c.userId', user.userId)
            .where('m.truckId', truckId);

        if (cartItems.length === 0) {
            return res.status(400).json({ error: 'Empty Cart', message: 'No items from this truck in cart' });
        }

        // Calculate total
        const totalPrice = cartItems.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);

        // Create order
        const newOrder = {
            userId: user.userId,
            truckId: parseInt(truckId),
            orderStatus: 'pending',
            totalPrice,
            scheduledPickupTime: scheduledPickupTime || null,
            estimatedEarliestPickup: new Date(Date.now() + 20 * 60000) // 20 minutes from now
        };

        const order = await db('FoodTruck.Orders').insert(newOrder).returning('*');
        const orderId = order[0].orderId;

        // Create order items and update inventory
        for (const item of cartItems) {
            await db('FoodTruck.OrderItems').insert({
                orderId,
                itemId: item.itemId,
                quantity: item.quantity,
                price: item.price
            });

            // Update inventory
            await db('FoodTruck.Inventory')
                .where('itemId', item.itemId)
                .decrement('quantity', item.quantity);
        }

        // Clear cart items for this truck
        const itemIds = cartItems.map(item => item.itemId);
        await db('FoodTruck.Carts')
            .where('userId', user.userId)
            .whereIn('itemId', itemIds)
            .del();

        // Create notification for truck owner
        const truck = await db('FoodTruck.Trucks').where('truckId', truckId).first();
        await db('FoodTruck.Notifications').insert({
            userId: truck.ownerId,
            type: 'new_order',
            title: 'New Order Received',
            message: `Order #${orderId} from ${user.name} - Total: EGP ${totalPrice.toFixed(2)}`
        });

        // Get the created order with items
        const items = await db
            .select('oi.*', 'm.name', 'm.category')
            .from({ oi: 'FoodTruck.OrderItems' })
            .innerJoin('FoodTruck.MenuItems as m', 'oi.itemId', 'm.itemId')
            .where('oi.orderId', orderId);

        return res.status(201).json({ 
            message: 'Order created successfully', 
            order: {
                ...order[0],
                truckName: truck.truckName,
                items
            }
        });
    } catch (error) {
        console.error('Create order error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: error.message });
    }
});

/**
 * PUT /api/v1/order/:orderId
 * Update order status (truck owner only)
 */
router.put('/:orderId', async (req, res) => {
    try {
        const user = await getUser(req);
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized', message: 'Please login' });
        }

        const { orderId } = req.params;
        const { orderStatus } = req.body;

        const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'];
        if (!orderStatus || !validStatuses.includes(orderStatus)) {
            return res.status(400).json({ 
                error: 'Validation Error', 
                message: `Invalid order status. Valid values: ${validStatuses.join(', ')}` 
            });
        }

        const order = await db('FoodTruck.Orders').where('orderId', orderId).first();
        if (!order) {
            return res.status(404).json({ error: 'Not Found', message: 'Order not found' });
        }

        // Verify truck ownership
        const truck = await db('FoodTruck.Trucks').where('truckId', order.truckId).first();
        if (truck.ownerId !== user.userId) {
            return res.status(403).json({ error: 'Forbidden', message: 'Only truck owner can update order status' });
        }

        // If cancelling, restore inventory
        if (orderStatus === 'cancelled' && order.orderStatus !== 'cancelled') {
            const orderItems = await db('FoodTruck.OrderItems').where('orderId', orderId);
            for (const item of orderItems) {
                await db('FoodTruck.Inventory')
                    .where('itemId', item.itemId)
                    .increment('quantity', item.quantity);
            }
        }

        await db('FoodTruck.Orders').where('orderId', orderId).update({ orderStatus });

        // Notify customer
        await db('FoodTruck.Notifications').insert({
            userId: order.userId,
            type: 'order_update',
            title: 'Order Status Update',
            message: `Your order #${orderId} from ${truck.truckName} is now: ${orderStatus.toUpperCase()}`
        });

        return res.status(200).json({ message: 'Order status updated', orderStatus });
    } catch (error) {
        console.error('Update order status error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: error.message });
    }
});

/**
 * DELETE /api/v1/order/:orderId
 * Cancel order (only if pending)
 */
router.delete('/:orderId', async (req, res) => {
    try {
        const user = await getUser(req);
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized', message: 'Please login' });
        }

        const { orderId } = req.params;

        const order = await db('FoodTruck.Orders').where('orderId', orderId).first();
        if (!order) {
            return res.status(404).json({ error: 'Not Found', message: 'Order not found' });
        }

        if (order.userId !== user.userId) {
            return res.status(403).json({ error: 'Forbidden', message: 'You can only cancel your own orders' });
        }

        if (order.orderStatus !== 'pending') {
            return res.status(400).json({ error: 'Cannot Cancel', message: 'Only pending orders can be cancelled' });
        }

        // Restore inventory
        const orderItems = await db('FoodTruck.OrderItems').where('orderId', orderId);
        for (const item of orderItems) {
            await db('FoodTruck.Inventory')
                .where('itemId', item.itemId)
                .increment('quantity', item.quantity);
        }

        await db('FoodTruck.Orders').where('orderId', orderId).update({ orderStatus: 'cancelled' });

        return res.status(200).json({ message: 'Order cancelled successfully' });
    } catch (error) {
        console.error('Cancel order error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: error.message });
    }
});

/**
 * GET /api/v1/order/:orderId/items
 * Get order items
 */
router.get('/:orderId/items', async (req, res) => {
    try {
        const user = await getUser(req);
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized', message: 'Please login' });
        }

        const { orderId } = req.params;

        const order = await db('FoodTruck.Orders').where('orderId', orderId).first();
        if (!order) {
            return res.status(404).json({ error: 'Not Found', message: 'Order not found' });
        }

        // Check access
        const truck = await db('FoodTruck.Trucks').where('truckId', order.truckId).first();
        if (order.userId !== user.userId && truck.ownerId !== user.userId) {
            return res.status(403).json({ error: 'Forbidden', message: 'Access denied' });
        }

        const items = await db
            .select('oi.*', 'm.name', 'm.description', 'm.category')
            .from({ oi: 'FoodTruck.OrderItems' })
            .innerJoin('FoodTruck.MenuItems as m', 'oi.itemId', 'm.itemId')
            .where('oi.orderId', orderId);

        return res.status(200).json(items);
    } catch (error) {
        console.error('Get order items error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: error.message });
    }
});

module.exports = router;

