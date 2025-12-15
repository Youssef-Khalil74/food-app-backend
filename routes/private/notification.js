/**
 * Notification API Routes (Private)
 * Handles user notifications
 */
const express = require('express');
const router = express.Router();
const db = require('../../connectors/db');
const { getUser } = require('../../utils/session');

/**
 * GET /api/v1/notification
 * Get user's notifications
 */
router.get('/', async (req, res) => {
    try {
        const user = await getUser(req);
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized', message: 'Please login' });
        }

        const { limit = 50, unreadOnly } = req.query;

        let query = db('FoodTruck.Notifications')
            .where('userId', user.userId)
            .orderBy('createdAt', 'desc')
            .limit(parseInt(limit));

        if (unreadOnly === 'true') {
            query = query.where('isRead', false);
        }

        const notifications = await query;
        const unreadCount = await db('FoodTruck.Notifications')
            .where('userId', user.userId)
            .where('isRead', false)
            .count('notificationId as count')
            .first();

        return res.status(200).json({
            notifications,
            unreadCount: parseInt(unreadCount.count) || 0,
            total: notifications.length
        });
    } catch (error) {
        console.error('Get notifications error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: error.message });
    }
});

/**
 * GET /api/v1/notification/count
 * Get unread notification count
 */
router.get('/count', async (req, res) => {
    try {
        const user = await getUser(req);
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized', message: 'Please login' });
        }

        const result = await db('FoodTruck.Notifications')
            .where('userId', user.userId)
            .where('isRead', false)
            .count('notificationId as count')
            .first();

        return res.status(200).json({ unreadCount: parseInt(result.count) || 0 });
    } catch (error) {
        console.error('Get notification count error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: error.message });
    }
});

/**
 * GET /api/v1/notification/:notificationId
 * Get single notification
 */
router.get('/:notificationId', async (req, res) => {
    try {
        const user = await getUser(req);
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized', message: 'Please login' });
        }

        const { notificationId } = req.params;

        const notification = await db('FoodTruck.Notifications')
            .where('notificationId', notificationId)
            .where('userId', user.userId)
            .first();

        if (!notification) {
            return res.status(404).json({ error: 'Not Found', message: 'Notification not found' });
        }

        return res.status(200).json(notification);
    } catch (error) {
        console.error('Get notification error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: error.message });
    }
});

/**
 * PUT /api/v1/notification/:notificationId
 * Mark notification as read
 */
router.put('/:notificationId', async (req, res) => {
    try {
        const user = await getUser(req);
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized', message: 'Please login' });
        }

        const { notificationId } = req.params;

        const notification = await db('FoodTruck.Notifications')
            .where('notificationId', notificationId)
            .where('userId', user.userId)
            .first();

        if (!notification) {
            return res.status(404).json({ error: 'Not Found', message: 'Notification not found' });
        }

        await db('FoodTruck.Notifications')
            .where('notificationId', notificationId)
            .update({ isRead: true });

        return res.status(200).json({ message: 'Notification marked as read' });
    } catch (error) {
        console.error('Mark notification read error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: error.message });
    }
});

/**
 * PUT /api/v1/notification/read-all
 * Mark all notifications as read
 */
router.put('/read/all', async (req, res) => {
    try {
        const user = await getUser(req);
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized', message: 'Please login' });
        }

        const result = await db('FoodTruck.Notifications')
            .where('userId', user.userId)
            .where('isRead', false)
            .update({ isRead: true });

        return res.status(200).json({ message: `Marked ${result} notifications as read` });
    } catch (error) {
        console.error('Mark all notifications read error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: error.message });
    }
});

/**
 * DELETE /api/v1/notification/:notificationId
 * Delete a notification
 */
router.delete('/:notificationId', async (req, res) => {
    try {
        const user = await getUser(req);
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized', message: 'Please login' });
        }

        const { notificationId } = req.params;

        const deleted = await db('FoodTruck.Notifications')
            .where('notificationId', notificationId)
            .where('userId', user.userId)
            .del();

        if (!deleted) {
            return res.status(404).json({ error: 'Not Found', message: 'Notification not found' });
        }

        return res.status(200).json({ message: 'Notification deleted' });
    } catch (error) {
        console.error('Delete notification error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: error.message });
    }
});

/**
 * DELETE /api/v1/notification
 * Delete all read notifications
 */
router.delete('/', async (req, res) => {
    try {
        const user = await getUser(req);
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized', message: 'Please login' });
        }

        const { all } = req.query;

        let query = db('FoodTruck.Notifications').where('userId', user.userId);
        
        if (all !== 'true') {
            query = query.where('isRead', true);
        }

        const deleted = await query.del();

        return res.status(200).json({ message: `Deleted ${deleted} notifications` });
    } catch (error) {
        console.error('Delete notifications error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: error.message });
    }
});

module.exports = router;



