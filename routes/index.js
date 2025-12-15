/**
 * Main Routes Index
 * Combines all public and private routes
 */
const express = require('express');
const router = express.Router();

// Import middleware
const { authMiddleware } = require('../middleware/auth');

// Import public routes
const registrationRouter = require('./public/registration');

// Import private routes
const accountRouter = require('./private/account');
const restaurantRouter = require('./private/restaurant');
const foodRouter = require('./private/food');
const cartRouter = require('./private/cart');
const orderRouter = require('./private/order');
const pickupRouter = require('./private/pickup');
const inventoryRouter = require('./private/inventory');
const notificationRouter = require('./private/notification');
const habitsRouter = require('./private/habits');
const paymentRouter = require('./private/payment');

// Database for public routes
const db = require('../connectors/db');

// ====================================
// PUBLIC ROUTES (No Authentication)
// ====================================

// Registration routes
router.use('/registration', registrationRouter);
router.use('/user', registrationRouter); // Alias for milestone compatibility

// Public truck routes
router.get('/trucks', async function(req, res) {
    try {
        const trucks = await db
            .select('truckId', 'truckName', 'truckLogo', 'truckStatus', 'orderStatus', 'createdAt')
            .from('FoodTruck.Trucks')
            .where('truckStatus', 'available')
            .orderBy('truckName', 'asc');

        return res.status(200).json(trucks);
    } catch (error) {
        console.error('Get trucks error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: 'Could not fetch trucks' });
    }
});

router.get('/trucks/:truckId', async function(req, res) {
    try {
        const { truckId } = req.params;

        const truck = await db
            .select('truckId', 'truckName', 'truckLogo', 'truckStatus', 'orderStatus', 'createdAt')
            .from('FoodTruck.Trucks')
            .where('truckId', truckId)
            .first();

        if (!truck) {
            return res.status(404).json({ error: 'Not Found', message: 'Truck not found' });
        }

        const menuItems = await db
            .select('itemId', 'name', 'description', 'price', 'category', 'status')
            .from('FoodTruck.MenuItems')
            .where('truckId', truckId)
            .where('status', 'available')
            .orderBy('category', 'asc')
            .orderBy('name', 'asc');

        const menuByCategory = menuItems.reduce((acc, item) => {
            if (!acc[item.category]) acc[item.category] = [];
            acc[item.category].push(item);
            return acc;
        }, {});

        return res.status(200).json({ ...truck, menu: menuItems, menuByCategory });
    } catch (error) {
        console.error('Get truck error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: 'Could not fetch truck details' });
    }
});

router.get('/trucks/:truckId/menu', async function(req, res) {
    try {
        const { truckId } = req.params;
        const { category } = req.query;

        let query = db
            .select('itemId', 'name', 'description', 'price', 'category', 'status')
            .from('FoodTruck.MenuItems')
            .where('truckId', truckId)
            .where('status', 'available');

        if (category) {
            query = query.whereRaw('LOWER(category) = ?', [category.toLowerCase()]);
        }

        const menuItems = await query.orderBy('category', 'asc').orderBy('name', 'asc');
        return res.status(200).json(menuItems);
    } catch (error) {
        console.error('Get menu error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: 'Could not fetch menu' });
    }
});

router.get('/menu/:itemId', async function(req, res) {
    try {
        const { itemId } = req.params;

        const item = await db
            .select('m.itemId', 'm.name', 'm.description', 'm.price', 'm.category', 'm.status', 't.truckName', 't.truckId', 't.truckLogo')
            .from({ m: 'FoodTruck.MenuItems' })
            .innerJoin('FoodTruck.Trucks as t', 'm.truckId', 't.truckId')
            .where('m.itemId', itemId)
            .first();

        if (!item) {
            return res.status(404).json({ error: 'Not Found', message: 'Menu item not found' });
        }

        return res.status(200).json(item);
    } catch (error) {
        console.error('Get menu item error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: 'Could not fetch menu item' });
    }
});

router.get('/categories', async function(req, res) {
    try {
        const categories = await db
            .distinct('category')
            .from('FoodTruck.MenuItems')
            .where('status', 'available')
            .orderBy('category', 'asc');

        return res.status(200).json(categories.map(c => c.category));
    } catch (error) {
        console.error('Get categories error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: 'Could not fetch categories' });
    }
});

router.get('/menu/category/:category', async function(req, res) {
    try {
        const { category } = req.params;

        const items = await db
            .select('m.itemId', 'm.name', 'm.description', 'm.price', 'm.category', 't.truckName', 't.truckId')
            .from({ m: 'FoodTruck.MenuItems' })
            .innerJoin('FoodTruck.Trucks as t', 'm.truckId', 't.truckId')
            .whereRaw('LOWER(m.category) = ?', [category.toLowerCase()])
            .where('m.status', 'available')
            .where('t.truckStatus', 'available');

        return res.status(200).json(items);
    } catch (error) {
        console.error('Get menu by category error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: 'Could not fetch menu items' });
    }
});

router.get('/search', async function(req, res) {
    try {
        const { q } = req.query;

        if (!q || q.length < 2) {
            return res.status(400).json({ error: 'Validation Error', message: 'Search query must be at least 2 characters' });
        }

        const searchTerm = `%${q.toLowerCase()}%`;

        const trucks = await db
            .select('truckId', 'truckName', 'truckLogo')
            .from('FoodTruck.Trucks')
            .whereRaw('LOWER("truckName") LIKE ?', [searchTerm])
            .where('truckStatus', 'available');

        const menuItems = await db
            .select('m.itemId', 'm.name', 'm.description', 'm.price', 'm.category', 't.truckName', 't.truckId')
            .from({ m: 'FoodTruck.MenuItems' })
            .innerJoin('FoodTruck.Trucks as t', 'm.truckId', 't.truckId')
            .where(function() {
                this.whereRaw('LOWER(m.name) LIKE ?', [searchTerm])
                    .orWhereRaw('LOWER(m.description) LIKE ?', [searchTerm])
                    .orWhereRaw('LOWER(m.category) LIKE ?', [searchTerm]);
            })
            .where('m.status', 'available')
            .where('t.truckStatus', 'available');

        return res.status(200).json({ query: q, trucks, menuItems, totalResults: trucks.length + menuItems.length });
    } catch (error) {
        console.error('Search error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: 'Could not perform search' });
    }
});

router.get('/popular', async function(req, res) {
    try {
        const popularItems = await db
            .select('m.itemId', 'm.name', 'm.description', 'm.price', 'm.category', 't.truckName', 't.truckId')
            .count('oi.orderItemId as orderCount')
            .from({ oi: 'FoodTruck.OrderItems' })
            .innerJoin('FoodTruck.MenuItems as m', 'oi.itemId', 'm.itemId')
            .innerJoin('FoodTruck.Trucks as t', 'm.truckId', 't.truckId')
            .where('m.status', 'available')
            .where('t.truckStatus', 'available')
            .groupBy('m.itemId', 'm.name', 'm.description', 'm.price', 'm.category', 't.truckName', 't.truckId')
            .orderBy('orderCount', 'desc')
            .limit(10);

        return res.status(200).json(popularItems);
    } catch (error) {
        console.error('Get popular items error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: 'Could not fetch popular items' });
    }
});

// ====================================
// PRIVATE ROUTES (Require Authentication)
// ====================================

// Apply auth middleware to all routes below
router.use(authMiddleware);

// Mount private route modules
router.use('/account', accountRouter);
router.use('/restaurant', restaurantRouter);
router.use('/food', foodRouter);
router.use('/cart', cartRouter);
router.use('/order', orderRouter);
router.use('/pickup', pickupRouter);
router.use('/inventory', inventoryRouter);
router.use('/notification', notificationRouter);
router.use('/habits', habitsRouter);
router.use('/payment', paymentRouter);

// Test route for authenticated access
router.get('/test', (req, res) => {
    res.status(200).json({ message: 'Private API is working', authenticated: true });
});

module.exports = router;



