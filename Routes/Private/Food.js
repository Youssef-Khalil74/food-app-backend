/**
 * Food (Menu Items) API Routes (Private)
 * Handles menu item management
 */
const express = require('express');
const router = express.Router();
const db = require('../../connectors/db');
const { getUser } = require('../../utils/session');

/**
 * GET /api/v1/food
 * Get all food items
 */
router.get('/', async (req, res) => {
    try {
        const { truckId, category } = req.query;

        let query = db
            .select('m.*', 't.truckName', 't.truckId')
            .from({ m: 'FoodTruck.MenuItems' })
            .innerJoin('FoodTruck.Trucks as t', 'm.truckId', 't.truckId');

        if (truckId) {
            query = query.where('m.truckId', truckId);
        }
        if (category) {
            query = query.whereRaw('LOWER(m.category) = ?', [category.toLowerCase()]);
        }

        const items = await query.orderBy('m.name', 'asc');

        return res.status(200).json(items);
    } catch (error) {
        console.error('Get food items error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: error.message });
    }
});

/**
 * GET /api/v1/food/:itemId
 * Get single food item details
 */
router.get('/:itemId', async (req, res) => {
    try {
        const { itemId } = req.params;

        const item = await db
            .select('m.*', 't.truckName', 't.truckId', 't.ownerId')
            .from({ m: 'FoodTruck.MenuItems' })
            .innerJoin('FoodTruck.Trucks as t', 'm.truckId', 't.truckId')
            .where('m.itemId', itemId)
            .first();

        if (!item) {
            return res.status(404).json({ error: 'Not Found', message: 'Menu item not found' });
        }

        // Get inventory info
        const inventory = await db('FoodTruck.Inventory').where('itemId', itemId).first();

        return res.status(200).json({
            ...item,
            inventory: inventory || null
        });
    } catch (error) {
        console.error('Get menu item error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: error.message });
    }
});

/**
 * POST /api/v1/food
 * Add new food item (owner only)
 */
router.post('/', async (req, res) => {
    try {
        const user = await getUser(req);
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized', message: 'Please login' });
        }

        const { truckId, name, description, price, category } = req.body;

        if (!truckId || !name || !price || !category) {
            return res.status(400).json({ error: 'Validation Error', message: 'Truck ID, name, price, and category are required' });
        }

        const truck = await db('FoodTruck.Trucks').where('truckId', truckId).first();

        if (!truck) {
            return res.status(404).json({ error: 'Not Found', message: 'Truck not found' });
        }

        if (truck.ownerId !== user.userId) {
            return res.status(403).json({ error: 'Forbidden', message: 'You can only add items to your own trucks' });
        }

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
            quantity: 0,
            lowStockThreshold: 10
        });

        return res.status(201).json({ message: 'Menu item added', item: item[0] });
    } catch (error) {
        console.error('Add menu item error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: error.message });
    }
});

/**
 * PUT /api/v1/food/:itemId
 * Update food item (owner only)
 */
router.put('/:itemId', async (req, res) => {
    try {
        const user = await getUser(req);
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized', message: 'Please login' });
        }

        const { itemId } = req.params;
        const item = await db('FoodTruck.MenuItems').where('itemId', itemId).first();

        if (!item) {
            return res.status(404).json({ error: 'Not Found', message: 'Menu item not found' });
        }

        // Verify ownership
        const truck = await db('FoodTruck.Trucks').where('truckId', item.truckId).first();
        if (truck.ownerId !== user.userId) {
            return res.status(403).json({ error: 'Forbidden', message: 'You can only update items on your own trucks' });
        }

        const { name, description, price, category, status } = req.body;
        const updateData = {};

        if (name) updateData.name = name.trim();
        if (description !== undefined) updateData.description = description;
        if (price) updateData.price = parseFloat(price);
        if (category) updateData.category = category.trim();
        if (status) updateData.status = status;

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: 'Validation Error', message: 'No update data provided' });
        }

        await db('FoodTruck.MenuItems').where('itemId', itemId).update(updateData);
        const updatedItem = await db('FoodTruck.MenuItems').where('itemId', itemId).first();

        return res.status(200).json({ message: 'Menu item updated', item: updatedItem });
    } catch (error) {
        console.error('Update menu item error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: error.message });
    }
});

/**
 * DELETE /api/v1/food/:itemId
 * Delete food item (owner only)
 */
router.delete('/:itemId', async (req, res) => {
    try {
        const user = await getUser(req);
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized', message: 'Please login' });
        }

        const { itemId } = req.params;
        const item = await db('FoodTruck.MenuItems').where('itemId', itemId).first();

        if (!item) {
            return res.status(404).json({ error: 'Not Found', message: 'Menu item not found' });
        }

        // Verify ownership
        const truck = await db('FoodTruck.Trucks').where('truckId', item.truckId).first();
        if (truck.ownerId !== user.userId) {
            return res.status(403).json({ error: 'Forbidden', message: 'You can only delete items on your own trucks' });
        }

        await db('FoodTruck.MenuItems').where('itemId', itemId).del();

        return res.status(200).json({ message: 'Menu item deleted' });
    } catch (error) {
        console.error('Delete menu item error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: error.message });
    }
});

/**
 * GET /api/v1/food/category/:category
 * Get food items by category
 */
router.get('/category/:category', async (req, res) => {
    try {
        const { category } = req.params;

        const items = await db
            .select('m.*', 't.truckName', 't.truckId')
            .from({ m: 'FoodTruck.MenuItems' })
            .innerJoin('FoodTruck.Trucks as t', 'm.truckId', 't.truckId')
            .whereRaw('LOWER(m.category) = ?', [category.toLowerCase()])
            .where('m.status', 'available')
            .orderBy('m.name', 'asc');

        return res.status(200).json(items);
    } catch (error) {
        console.error('Get food by category error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: error.message });
    }
});

module.exports = router;


