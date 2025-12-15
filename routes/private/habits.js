/**
 * Habits API Routes (Private)
 * Handles personalized recommendations based on order history
 */
const express = require('express');
const router = express.Router();
const db = require('../../connectors/db');
const { getUser } = require('../../utils/session');

/**
 * GET /api/v1/habits
 * Get user's ordering habits and recommendations
 */
router.get('/', async (req, res) => {
    try {
        const user = await getUser(req);
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized', message: 'Please login' });
        }

        // Get user's most ordered items (favorites)
        const mostOrdered = await db
            .select('m.itemId', 'm.name', 'm.description', 'm.price', 'm.category', 't.truckName', 't.truckId', 't.truckLogo')
            .sum('oi.quantity as totalOrdered')
            .count('oi.orderItemId as orderCount')
            .from({ oi: 'FoodTruck.OrderItems' })
            .innerJoin('FoodTruck.Orders as o', 'oi.orderId', 'o.orderId')
            .innerJoin('FoodTruck.MenuItems as m', 'oi.itemId', 'm.itemId')
            .innerJoin('FoodTruck.Trucks as t', 'm.truckId', 't.truckId')
            .where('o.userId', user.userId)
            .where('m.status', 'available')
            .where('o.orderStatus', '!=', 'cancelled')
            .groupBy('m.itemId', 'm.name', 'm.description', 'm.price', 'm.category', 't.truckName', 't.truckId', 't.truckLogo')
            .orderBy('totalOrdered', 'desc')
            .limit(5);

        // Get user's favorite trucks
        const favoriteTrucks = await db
            .select('t.truckId', 't.truckName', 't.truckLogo', 't.truckStatus')
            .count('o.orderId as orderCount')
            .sum('o.totalPrice as totalSpent')
            .from({ o: 'FoodTruck.Orders' })
            .innerJoin('FoodTruck.Trucks as t', 'o.truckId', 't.truckId')
            .where('o.userId', user.userId)
            .where('o.orderStatus', '!=', 'cancelled')
            .groupBy('t.truckId', 't.truckName', 't.truckLogo', 't.truckStatus')
            .orderBy('orderCount', 'desc')
            .limit(3);

        // Get popular items user hasn't tried
        const orderedItemIds = mostOrdered.map(item => item.itemId);
        const youMightLike = await db
            .select('m.itemId', 'm.name', 'm.description', 'm.price', 'm.category', 't.truckName', 't.truckId')
            .count('oi.orderItemId as popularity')
            .from({ oi: 'FoodTruck.OrderItems' })
            .innerJoin('FoodTruck.MenuItems as m', 'oi.itemId', 'm.itemId')
            .innerJoin('FoodTruck.Trucks as t', 'm.truckId', 't.truckId')
            .where('m.status', 'available')
            .where('t.truckStatus', 'available')
            .whereNotIn('m.itemId', orderedItemIds.length > 0 ? orderedItemIds : [0])
            .groupBy('m.itemId', 'm.name', 'm.description', 'm.price', 'm.category', 't.truckName', 't.truckId')
            .orderBy('popularity', 'desc')
            .limit(5);

        // Get favorite category
        const favoriteCategories = await db
            .select('m.category')
            .count('oi.orderItemId as count')
            .from({ oi: 'FoodTruck.OrderItems' })
            .innerJoin('FoodTruck.Orders as o', 'oi.orderId', 'o.orderId')
            .innerJoin('FoodTruck.MenuItems as m', 'oi.itemId', 'm.itemId')
            .where('o.userId', user.userId)
            .groupBy('m.category')
            .orderBy('count', 'desc')
            .limit(1);

        const favoriteCategory = favoriteCategories.length > 0 ? favoriteCategories[0].category : null;

        // If user has a favorite category, get more items from that category
        let categoryRecommendations = [];
        if (favoriteCategory) {
            categoryRecommendations = await db
                .select('m.itemId', 'm.name', 'm.description', 'm.price', 'm.category', 't.truckName', 't.truckId')
                .from({ m: 'FoodTruck.MenuItems' })
                .innerJoin('FoodTruck.Trucks as t', 'm.truckId', 't.truckId')
                .where('m.category', favoriteCategory)
                .where('m.status', 'available')
                .where('t.truckStatus', 'available')
                .whereNotIn('m.itemId', orderedItemIds.length > 0 ? orderedItemIds : [0])
                .limit(3);
        }

        return res.status(200).json({
            yourFavorites: mostOrdered.map(item => ({
                ...item,
                totalOrdered: parseInt(item.totalOrdered),
                orderCount: parseInt(item.orderCount)
            })),
            favoriteTrucks: favoriteTrucks.map(truck => ({
                ...truck,
                orderCount: parseInt(truck.orderCount),
                totalSpent: parseFloat(truck.totalSpent)
            })),
            youMightLike: youMightLike.map(item => ({
                ...item,
                popularity: parseInt(item.popularity)
            })),
            categoryRecommendations,
            favoriteCategory,
            hasHistory: mostOrdered.length > 0,
            message: mostOrdered.length > 0 
                ? 'Recommendations based on your order history' 
                : 'Start ordering to get personalized recommendations!'
        });
    } catch (error) {
        console.error('Get habits error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: error.message });
    }
});

/**
 * GET /api/v1/habits/quick-reorder
 * Get items for quick reorder (most recent + most ordered)
 */
router.get('/quick-reorder', async (req, res) => {
    try {
        const user = await getUser(req);
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized', message: 'Please login' });
        }

        // Get most recent order items
        const recentOrder = await db('FoodTruck.Orders')
            .where('userId', user.userId)
            .where('orderStatus', '!=', 'cancelled')
            .orderBy('createdAt', 'desc')
            .first();

        let recentItems = [];
        if (recentOrder) {
            recentItems = await db
                .select('m.itemId', 'm.name', 'm.price', 'm.category', 'm.status', 't.truckName', 't.truckId', 'oi.quantity')
                .from({ oi: 'FoodTruck.OrderItems' })
                .innerJoin('FoodTruck.MenuItems as m', 'oi.itemId', 'm.itemId')
                .innerJoin('FoodTruck.Trucks as t', 'm.truckId', 't.truckId')
                .where('oi.orderId', recentOrder.orderId);
        }

        // Get top 3 most ordered items
        const topItems = await db
            .select('m.itemId', 'm.name', 'm.price', 'm.category', 'm.status', 't.truckName', 't.truckId')
            .sum('oi.quantity as totalOrdered')
            .from({ oi: 'FoodTruck.OrderItems' })
            .innerJoin('FoodTruck.Orders as o', 'oi.orderId', 'o.orderId')
            .innerJoin('FoodTruck.MenuItems as m', 'oi.itemId', 'm.itemId')
            .innerJoin('FoodTruck.Trucks as t', 'm.truckId', 't.truckId')
            .where('o.userId', user.userId)
            .where('o.orderStatus', '!=', 'cancelled')
            .groupBy('m.itemId', 'm.name', 'm.price', 'm.category', 'm.status', 't.truckName', 't.truckId')
            .orderBy('totalOrdered', 'desc')
            .limit(3);

        return res.status(200).json({
            lastOrder: recentOrder ? {
                orderId: recentOrder.orderId,
                date: recentOrder.createdAt,
                items: recentItems
            } : null,
            frequentItems: topItems.map(item => ({
                ...item,
                totalOrdered: parseInt(item.totalOrdered)
            }))
        });
    } catch (error) {
        console.error('Get quick reorder error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: error.message });
    }
});

/**
 * GET /api/v1/habits/history
 * Get detailed order history with stats
 */
router.get('/history', async (req, res) => {
    try {
        const user = await getUser(req);
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized', message: 'Please login' });
        }

        const { page = 1, limit = 10 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        // Get order stats
        const stats = await db
            .count('orderId as totalOrders')
            .sum('totalPrice as totalSpent')
            .avg('totalPrice as avgOrderValue')
            .from('FoodTruck.Orders')
            .where('userId', user.userId)
            .where('orderStatus', '!=', 'cancelled')
            .first();

        // Get orders count
        const totalCount = await db('FoodTruck.Orders')
            .where('userId', user.userId)
            .count('orderId as count')
            .first();

        // Get paginated orders
        const orders = await db
            .select('o.*', 't.truckName', 't.truckLogo')
            .from({ o: 'FoodTruck.Orders' })
            .innerJoin('FoodTruck.Trucks as t', 'o.truckId', 't.truckId')
            .where('o.userId', user.userId)
            .orderBy('o.createdAt', 'desc')
            .limit(parseInt(limit))
            .offset(offset);

        // Get items for each order
        for (const order of orders) {
            order.items = await db
                .select('oi.*', 'm.name', 'm.category')
                .from({ oi: 'FoodTruck.OrderItems' })
                .innerJoin('FoodTruck.MenuItems as m', 'oi.itemId', 'm.itemId')
                .where('oi.orderId', order.orderId);
        }

        return res.status(200).json({
            stats: {
                totalOrders: parseInt(stats.totalOrders) || 0,
                totalSpent: parseFloat(stats.totalSpent) || 0,
                avgOrderValue: parseFloat(stats.avgOrderValue) || 0
            },
            orders,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                totalCount: parseInt(totalCount.count),
                totalPages: Math.ceil(parseInt(totalCount.count) / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Get order history error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: error.message });
    }
});

/**
 * GET /api/v1/habits/top-items
 * Get user's top ordered items
 */
router.get('/top-items', async (req, res) => {
    try {
        const user = await getUser(req);
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized', message: 'Please login' });
        }

        const { limit = 10 } = req.query;

        const topItems = await db
            .select('m.itemId', 'm.name', 'm.description', 'm.price', 'm.category', 't.truckName', 't.truckId')
            .sum('oi.quantity as totalOrdered')
            .count('oi.orderItemId as orderCount')
            .from({ oi: 'FoodTruck.OrderItems' })
            .innerJoin('FoodTruck.Orders as o', 'oi.orderId', 'o.orderId')
            .innerJoin('FoodTruck.MenuItems as m', 'oi.itemId', 'm.itemId')
            .innerJoin('FoodTruck.Trucks as t', 'm.truckId', 't.truckId')
            .where('o.userId', user.userId)
            .where('o.orderStatus', '!=', 'cancelled')
            .groupBy('m.itemId', 'm.name', 'm.description', 'm.price', 'm.category', 't.truckName', 't.truckId')
            .orderBy('totalOrdered', 'desc')
            .limit(parseInt(limit));

        return res.status(200).json(topItems.map(item => ({
            ...item,
            totalOrdered: parseInt(item.totalOrdered),
            orderCount: parseInt(item.orderCount)
        })));
    } catch (error) {
        console.error('Get top items error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: error.message });
    }
});

module.exports = router;

