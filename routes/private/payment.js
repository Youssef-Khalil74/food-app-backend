/**
 * Payment API Routes (Private)
 * Handles payment processing for orders
 */
const express = require('express');
const router = express.Router();
const db = require('../../connectors/db');
const { getUser } = require('../../utils/session');

/**
 * POST /api/v1/payment
 * Process payment for an order
 */
router.post('/', async (req, res) => {
    try {
        const user = await getUser(req);
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized', message: 'Please login' });
        }

        const { orderId, paymentMethod, cardNumber, cardHolderName, expiryDate, cvv } = req.body;

        if (!orderId) {
            return res.status(400).json({ error: 'Validation Error', message: 'Order ID is required' });
        }

        if (!paymentMethod) {
            return res.status(400).json({ error: 'Validation Error', message: 'Payment method is required' });
        }

        // Get order
        const order = await db('FoodTruck.Orders').where('orderId', orderId).first();

        if (!order) {
            return res.status(404).json({ error: 'Not Found', message: 'Order not found' });
        }

        if (order.userId !== user.userId) {
            return res.status(403).json({ error: 'Forbidden', message: 'You can only pay for your own orders' });
        }

        if (order.orderStatus === 'cancelled') {
            return res.status(400).json({ error: 'Invalid Order', message: 'Cannot pay for cancelled orders' });
        }

        // Validate card details for card payments
        if (paymentMethod === 'card') {
            if (!cardNumber || !cardHolderName || !expiryDate || !cvv) {
                return res.status(400).json({ error: 'Validation Error', message: 'Card details are required' });
            }

            // Basic card validation (simplified)
            if (cardNumber.length < 13 || cardNumber.length > 19) {
                return res.status(400).json({ error: 'Validation Error', message: 'Invalid card number' });
            }

            if (cvv.length < 3 || cvv.length > 4) {
                return res.status(400).json({ error: 'Validation Error', message: 'Invalid CVV' });
            }
        }

        // Simulate payment processing
        // In production, integrate with actual payment gateway (Stripe, PayPal, etc.)
        const paymentSuccess = true; // Simulated success

        if (!paymentSuccess) {
            return res.status(402).json({ error: 'Payment Failed', message: 'Payment could not be processed' });
        }

        // Update order status to confirmed
        await db('FoodTruck.Orders').where('orderId', orderId).update({ orderStatus: 'confirmed' });

        // Create notification for user
        await db('FoodTruck.Notifications').insert({
            userId: user.userId,
            type: 'payment_success',
            title: 'Payment Successful',
            message: `Payment of EGP ${order.totalPrice.toFixed(2)} for Order #${orderId} was successful`
        });

        // Notify truck owner
        const truck = await db('FoodTruck.Trucks').where('truckId', order.truckId).first();
        await db('FoodTruck.Notifications').insert({
            userId: truck.ownerId,
            type: 'payment_received',
            title: 'Payment Received',
            message: `Payment received for Order #${orderId} - EGP ${order.totalPrice.toFixed(2)}`
        });

        return res.status(200).json({
            message: 'Payment successful',
            payment: {
                orderId: order.orderId,
                amount: order.totalPrice,
                method: paymentMethod,
                status: 'completed',
                processedAt: new Date()
            }
        });
    } catch (error) {
        console.error('Payment error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: error.message });
    }
});

/**
 * GET /api/v1/payment/:orderId
 * Get payment status for an order
 */
router.get('/:orderId', async (req, res) => {
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

        // Determine payment status based on order status
        let paymentStatus = 'pending';
        if (order.orderStatus === 'cancelled') {
            paymentStatus = 'refunded';
        } else if (order.orderStatus !== 'pending') {
            paymentStatus = 'completed';
        }

        return res.status(200).json({
            orderId: order.orderId,
            amount: order.totalPrice,
            status: paymentStatus,
            orderStatus: order.orderStatus
        });
    } catch (error) {
        console.error('Get payment status error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: error.message });
    }
});

/**
 * POST /api/v1/payment/:orderId/refund
 * Request refund for an order (owner only)
 */
router.post('/:orderId/refund', async (req, res) => {
    try {
        const user = await getUser(req);
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized', message: 'Please login' });
        }

        const { orderId } = req.params;
        const { reason } = req.body;

        const order = await db('FoodTruck.Orders').where('orderId', orderId).first();

        if (!order) {
            return res.status(404).json({ error: 'Not Found', message: 'Order not found' });
        }

        // Only truck owner can issue refunds
        const truck = await db('FoodTruck.Trucks').where('truckId', order.truckId).first();
        if (truck.ownerId !== user.userId) {
            return res.status(403).json({ error: 'Forbidden', message: 'Only truck owner can issue refunds' });
        }

        if (order.orderStatus === 'completed') {
            return res.status(400).json({ error: 'Cannot Refund', message: 'Cannot refund completed orders' });
        }

        // Update order status
        await db('FoodTruck.Orders').where('orderId', orderId).update({ orderStatus: 'cancelled' });

        // Restore inventory
        const orderItems = await db('FoodTruck.OrderItems').where('orderId', orderId);
        for (const item of orderItems) {
            await db('FoodTruck.Inventory')
                .where('itemId', item.itemId)
                .increment('quantity', item.quantity);
        }

        // Notify customer
        await db('FoodTruck.Notifications').insert({
            userId: order.userId,
            type: 'refund_processed',
            title: 'Refund Processed',
            message: `Refund of EGP ${order.totalPrice.toFixed(2)} for Order #${orderId} has been processed. ${reason ? `Reason: ${reason}` : ''}`
        });

        return res.status(200).json({
            message: 'Refund processed',
            refund: {
                orderId: order.orderId,
                amount: order.totalPrice,
                reason: reason || 'No reason provided',
                processedAt: new Date()
            }
        });
    } catch (error) {
        console.error('Refund error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: error.message });
    }
});

module.exports = router;

