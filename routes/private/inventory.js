/**
 * Inventory API Routes (Private)
 * Handles inventory management for truck owners
 */
const express = require('express');
const router = express.Router();
const db = require('../../connectors/db');
const { getUser } = require('../../utils/session');

/**
 * GET /api/v1/inventory
 * Get inventory for truck owner's items
 */
router.get('/', async (req, res) => {
    try {
        const user = await getUser(req);
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized', message: 'Please login' });
        }

        if (user.role !== 'truckOwner') {
            return res.status(403).json({ error: 'Forbidden', message: 'Only truck owners can view inventory' });
        }

        const inventory = await db
            .select('i.*', 'm.name', 'm.category', 'm.price', 'm.status as itemStatus', 't.truckName', 't.truckId')
            .from({ i: 'FoodTruck.Inventory' })
            .innerJoin('FoodTruck.MenuItems as m', 'i.itemId', 'm.itemId')
            .innerJoin('FoodTruck.Trucks as t', 'm.truckId', 't.truckId')
            .where('t.ownerId', user.userId)
            .orderBy('t.truckName', 'asc')
            .orderBy('m.name', 'asc');

        // Add low stock warning and group by truck
        const inventoryWithWarnings = inventory.map(item => ({
            ...item,
            lowStock: item.quantity <= item.lowStockThreshold,
            outOfStock: item.quantity === 0
        }));

        // Summary stats
        const stats = {
            totalItems: inventory.length,
            lowStockItems: inventoryWithWarnings.filter(i => i.lowStock && !i.outOfStock).length,
            outOfStockItems: inventoryWithWarnings.filter(i => i.outOfStock).length
        };

        return res.status(200).json({
            inventory: inventoryWithWarnings,
            stats
        });
    } catch (error) {
        console.error('Get inventory error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: error.message });
    }
});

/**
 * GET /api/v1/inventory/truck/:truckId
 * Get inventory for a specific truck
 */
router.get('/truck/:truckId', async (req, res) => {
    try {
        const user = await getUser(req);
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized', message: 'Please login' });
        }

        const { truckId } = req.params;

        // Verify ownership
        const truck = await db('FoodTruck.Trucks').where('truckId', truckId).first();
        if (!truck) {
            return res.status(404).json({ error: 'Not Found', message: 'Truck not found' });
        }

        if (truck.ownerId !== user.userId) {
            return res.status(403).json({ error: 'Forbidden', message: 'Access denied' });
        }

        const inventory = await db
            .select('i.*', 'm.name', 'm.category', 'm.price', 'm.status as itemStatus')
            .from({ i: 'FoodTruck.Inventory' })
            .innerJoin('FoodTruck.MenuItems as m', 'i.itemId', 'm.itemId')
            .where('m.truckId', truckId)
            .orderBy('m.name', 'asc');

        const inventoryWithWarnings = inventory.map(item => ({
            ...item,
            lowStock: item.quantity <= item.lowStockThreshold,
            outOfStock: item.quantity === 0
        }));

        return res.status(200).json({
            truckName: truck.truckName,
            inventory: inventoryWithWarnings
        });
    } catch (error) {
        console.error('Get truck inventory error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: error.message });
    }
});

/**
 * GET /api/v1/inventory/:itemId
 * Get inventory for specific item
 */
router.get('/:itemId', async (req, res) => {
    try {
        const user = await getUser(req);
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized', message: 'Please login' });
        }

        const { itemId } = req.params;

        const item = await db('FoodTruck.MenuItems').where('itemId', itemId).first();
        if (!item) {
            return res.status(404).json({ error: 'Not Found', message: 'Item not found' });
        }

        // Verify ownership
        const truck = await db('FoodTruck.Trucks').where('truckId', item.truckId).first();
        if (truck.ownerId !== user.userId) {
            return res.status(403).json({ error: 'Forbidden', message: 'Access denied' });
        }

        const inventory = await db('FoodTruck.Inventory').where('itemId', itemId).first();

        if (!inventory) {
            return res.status(200).json({
                itemId: parseInt(itemId),
                name: item.name,
                quantity: 0,
                lowStockThreshold: 10,
                lowStock: true,
                outOfStock: true,
                message: 'No inventory record exists for this item'
            });
        }

        return res.status(200).json({
            ...inventory,
            name: item.name,
            lowStock: inventory.quantity <= inventory.lowStockThreshold,
            outOfStock: inventory.quantity === 0
        });
    } catch (error) {
        console.error('Get item inventory error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: error.message });
    }
});

/**
 * PUT /api/v1/inventory/:itemId
 * Update inventory quantity
 */
router.put('/:itemId', async (req, res) => {
    try {
        const user = await getUser(req);
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized', message: 'Please login' });
        }

        if (user.role !== 'truckOwner') {
            return res.status(403).json({ error: 'Forbidden', message: 'Only truck owners can update inventory' });
        }

        const { itemId } = req.params;
        const { quantity, lowStockThreshold, adjustment } = req.body;

        // Verify item exists and ownership
        const item = await db('FoodTruck.MenuItems').where('itemId', itemId).first();
        if (!item) {
            return res.status(404).json({ error: 'Not Found', message: 'Item not found' });
        }

        const truck = await db('FoodTruck.Trucks').where('truckId', item.truckId).first();
        if (truck.ownerId !== user.userId) {
            return res.status(403).json({ error: 'Forbidden', message: 'Access denied' });
        }

        // Check if inventory record exists
        const existing = await db('FoodTruck.Inventory').where('itemId', itemId).first();

        const updateData = { lastRestocked: new Date() };

        if (adjustment !== undefined) {
            // Relative adjustment (+/- from current)
            const currentQty = existing ? existing.quantity : 0;
            const newQty = Math.max(0, currentQty + parseInt(adjustment));
            updateData.quantity = newQty;
        } else if (quantity !== undefined) {
            // Absolute quantity
            updateData.quantity = Math.max(0, parseInt(quantity));
        }

        if (lowStockThreshold !== undefined) {
            updateData.lowStockThreshold = Math.max(0, parseInt(lowStockThreshold));
        }

        if (existing) {
            await db('FoodTruck.Inventory').where('itemId', itemId).update(updateData);
        } else {
            await db('FoodTruck.Inventory').insert({
                itemId: parseInt(itemId),
                quantity: updateData.quantity || 0,
                lowStockThreshold: updateData.lowStockThreshold || 10,
                lastRestocked: new Date()
            });
        }

        const updatedInventory = await db('FoodTruck.Inventory').where('itemId', itemId).first();

        // Update menu item status based on inventory
        if (updatedInventory.quantity === 0) {
            await db('FoodTruck.MenuItems').where('itemId', itemId).update({ status: 'unavailable' });
        } else if (item.status === 'unavailable') {
            await db('FoodTruck.MenuItems').where('itemId', itemId).update({ status: 'available' });
        }

        return res.status(200).json({ 
            message: 'Inventory updated', 
            inventory: {
                ...updatedInventory,
                name: item.name,
                lowStock: updatedInventory.quantity <= updatedInventory.lowStockThreshold,
                outOfStock: updatedInventory.quantity === 0
            }
        });
    } catch (error) {
        console.error('Update inventory error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: error.message });
    }
});

/**
 * POST /api/v1/inventory/restock
 * Bulk restock multiple items
 */
router.post('/restock', async (req, res) => {
    try {
        const user = await getUser(req);
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized', message: 'Please login' });
        }

        if (user.role !== 'truckOwner') {
            return res.status(403).json({ error: 'Forbidden', message: 'Only truck owners can update inventory' });
        }

        const { items } = req.body; // Array of { itemId, quantity }

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'Validation Error', message: 'Items array is required' });
        }

        const results = [];

        for (const item of items) {
            const { itemId, quantity } = item;

            // Verify ownership
            const menuItem = await db('FoodTruck.MenuItems').where('itemId', itemId).first();
            if (!menuItem) continue;

            const truck = await db('FoodTruck.Trucks').where('truckId', menuItem.truckId).first();
            if (truck.ownerId !== user.userId) continue;

            // Update inventory
            const existing = await db('FoodTruck.Inventory').where('itemId', itemId).first();
            if (existing) {
                await db('FoodTruck.Inventory').where('itemId', itemId).update({
                    quantity: parseInt(quantity),
                    lastRestocked: new Date()
                });
            } else {
                await db('FoodTruck.Inventory').insert({
                    itemId: parseInt(itemId),
                    quantity: parseInt(quantity),
                    lowStockThreshold: 10,
                    lastRestocked: new Date()
                });
            }

            // Update menu item status
            if (parseInt(quantity) > 0 && menuItem.status === 'unavailable') {
                await db('FoodTruck.MenuItems').where('itemId', itemId).update({ status: 'available' });
            }

            results.push({ itemId, quantity, name: menuItem.name });
        }

        return res.status(200).json({ 
            message: `Restocked ${results.length} items`, 
            items: results 
        });
    } catch (error) {
        console.error('Bulk restock error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: error.message });
    }
});

/**
 * GET /api/v1/inventory/low-stock
 * Get all low stock items
 */
router.get('/alerts/low-stock', async (req, res) => {
    try {
        const user = await getUser(req);
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized', message: 'Please login' });
        }

        if (user.role !== 'truckOwner') {
            return res.status(403).json({ error: 'Forbidden', message: 'Only truck owners can view inventory alerts' });
        }

        const lowStockItems = await db
            .select('i.*', 'm.name', 'm.category', 't.truckName')
            .from({ i: 'FoodTruck.Inventory' })
            .innerJoin('FoodTruck.MenuItems as m', 'i.itemId', 'm.itemId')
            .innerJoin('FoodTruck.Trucks as t', 'm.truckId', 't.truckId')
            .where('t.ownerId', user.userId)
            .whereRaw('i.quantity <= i."lowStockThreshold"')
            .orderBy('i.quantity', 'asc');

        return res.status(200).json(lowStockItems);
    } catch (error) {
        console.error('Get low stock items error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: error.message });
    }
});

module.exports = router;

