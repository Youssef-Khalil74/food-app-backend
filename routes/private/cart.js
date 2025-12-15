/**
 * Cart API Routes (Private)
 * Handles shopping cart operations
 */
const express = require('express');
const router = express.Router();
const db = require('../../connectors/db');
const { getUser } = require('../../utils/session');

/**
 * GET /api/v1/cart
 * Get user's cart
 */
router.get('/', async (req, res) => {
    try {
        const user = await getUser(req);
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized', message: 'Please login' });
        }

        const cartItems = await db
            .select('c.*', 'm.name', 'm.description', 'm.category', 't.truckName', 't.truckId')
            .from({ c: 'FoodTruck.Carts' })
            .innerJoin('FoodTruck.MenuItems as m', 'c.itemId', 'm.itemId')
            .innerJoin('FoodTruck.Trucks as t', 'm.truckId', 't.truckId')
            .where('c.userId', user.userId);

        const total = cartItems.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);

        // Group by truck
        const groupedByTruck = cartItems.reduce((acc, item) => {
            const truckId = item.truckId;
            if (!acc[truckId]) {
                acc[truckId] = {
                    truckId,
                    truckName: item.truckName,
                    items: [],
                    subtotal: 0
                };
            }
            acc[truckId].items.push(item);
            acc[truckId].subtotal += parseFloat(item.price) * item.quantity;
            return acc;
        }, {});

        return res.status(200).json({
            items: cartItems,
            groupedByTruck: Object.values(groupedByTruck),
            totalItems: cartItems.length,
            totalQuantity: cartItems.reduce((sum, item) => sum + item.quantity, 0),
            totalPrice: total
        });
    } catch (error) {
        console.error('Get cart error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: error.message });
    }
});

/**
 * POST /api/v1/cart
 * Add item to cart
 */
router.post('/', async (req, res) => {
    try {
        const user = await getUser(req);
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized', message: 'Please login' });
        }

        const { itemId, quantity } = req.body;

        if (!itemId) {
            return res.status(400).json({ error: 'Validation Error', message: 'Item ID is required' });
        }

        const menuItem = await db('FoodTruck.MenuItems').where('itemId', itemId).first();
        if (!menuItem) {
            return res.status(404).json({ error: 'Not Found', message: 'Menu item not found' });
        }

        if (menuItem.status !== 'available') {
            return res.status(400).json({ error: 'Not Available', message: 'This item is not available' });
        }

        // Check inventory
        const inventory = await db('FoodTruck.Inventory').where('itemId', itemId).first();
        if (inventory && inventory.quantity < (quantity || 1)) {
            return res.status(400).json({ error: 'Insufficient Stock', message: 'Not enough items in stock' });
        }

        // Check if item already in cart
        const existingCartItem = await db('FoodTruck.Carts')
            .where('userId', user.userId)
            .where('itemId', itemId)
            .first();

        if (existingCartItem) {
            // Update quantity
            const newQuantity = existingCartItem.quantity + (quantity || 1);
            await db('FoodTruck.Carts')
                .where('cartId', existingCartItem.cartId)
                .update({ quantity: newQuantity });

            const updatedItem = await db('FoodTruck.Carts').where('cartId', existingCartItem.cartId).first();
            return res.status(200).json({ message: 'Cart updated', cartItem: updatedItem });
        }

        // Add new cart item
        const newCartItem = {
            userId: user.userId,
            itemId: parseInt(itemId),
            quantity: quantity || 1,
            price: menuItem.price
        };

        const cartItem = await db('FoodTruck.Carts').insert(newCartItem).returning('*');

        return res.status(201).json({ message: 'Item added to cart', cartItem: cartItem[0] });
    } catch (error) {
        console.error('Add to cart error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: error.message });
    }
});

/**
 * PUT /api/v1/cart/:cartId
 * Update cart item quantity
 */
router.put('/:cartId', async (req, res) => {
    try {
        const user = await getUser(req);
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized', message: 'Please login' });
        }

        const { cartId } = req.params;
        const { quantity } = req.body;

        if (!quantity || quantity < 1) {
            return res.status(400).json({ error: 'Validation Error', message: 'Valid quantity is required (minimum 1)' });
        }

        const cartItem = await db('FoodTruck.Carts')
            .where('cartId', cartId)
            .where('userId', user.userId)
            .first();

        if (!cartItem) {
            return res.status(404).json({ error: 'Not Found', message: 'Cart item not found' });
        }

        // Check inventory
        const inventory = await db('FoodTruck.Inventory').where('itemId', cartItem.itemId).first();
        if (inventory && inventory.quantity < quantity) {
            return res.status(400).json({ error: 'Insufficient Stock', message: 'Not enough items in stock' });
        }

        await db('FoodTruck.Carts').where('cartId', cartId).update({ quantity: parseInt(quantity) });

        const updatedItem = await db('FoodTruck.Carts').where('cartId', cartId).first();
        return res.status(200).json({ message: 'Cart updated', cartItem: updatedItem });
    } catch (error) {
        console.error('Update cart error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: error.message });
    }
});

/**
 * DELETE /api/v1/cart/:cartId
 * Remove item from cart
 */
router.delete('/:cartId', async (req, res) => {
    try {
        const user = await getUser(req);
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized', message: 'Please login' });
        }

        const { cartId } = req.params;

        const deleted = await db('FoodTruck.Carts')
            .where('cartId', cartId)
            .where('userId', user.userId)
            .del();

        if (!deleted) {
            return res.status(404).json({ error: 'Not Found', message: 'Cart item not found' });
        }

        return res.status(200).json({ message: 'Item removed from cart' });
    } catch (error) {
        console.error('Remove from cart error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: error.message });
    }
});

/**
 * DELETE /api/v1/cart
 * Clear entire cart
 */
router.delete('/', async (req, res) => {
    try {
        const user = await getUser(req);
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized', message: 'Please login' });
        }

        await db('FoodTruck.Carts').where('userId', user.userId).del();

        return res.status(200).json({ message: 'Cart cleared' });
    } catch (error) {
        console.error('Clear cart error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: error.message });
    }
});

module.exports = router;



