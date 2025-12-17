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
 * Get all notifications for current user
 */
router.get('/', async (req, res) => {
    try {
        const user = await getUser(req);
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized', message: 'Please login' });
        }

        const { unreadOnly, limit, offset } = req.query;

        let query = db('FoodTruck.Notifications')
            .where('userId', user.userId)
            .orderBy('createdAt', 'desc');

        if (unreadOnly === 'true') {
            query = query.where('isRead', false);
        }

        if (limit) {
            query = query.limit(parseInt(limit));
        }

        if (offset) {
            query = query.offset(parseInt(offset));
        }

        const notifications = await query;

        // Get counts
        const counts = await db('FoodTruck.Notifications')
            .where('userId', user.userId)
            .select(
                db.raw('COUNT(*) as total'),
                db.raw('COUNT(*) FILTER (WHERE "isRead" = false) as unread')
            )
            .first();

        return res.status(200).json({
            notifications,
            counts: {
                total: parseInt(counts.total) || 0,
                unread: parseInt(counts.unread) || 0
            }
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

        const count = await db('FoodTruck.Notifications')
            .where('userId', user.userId)
            .where('isRead', false)
            .count('notificationId as count')
            .first();

        return res.status(200).json({ unreadCount: parseInt(count.count) || 0 });
    } catch (error) {
        console.error('Get notification count error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: error.message });
    }
});

/**
 * GET /api/v1/notification/:notificationId
 * Get a specific notification
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
 * Mark a notification as read
 */
router.put('/:notificationId', async (req, res) => {
    try {
        const user = await getUser(req);
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized', message: 'Please login' });
        }

        const { notificationId } = req.params;
        const { isRead } = req.body;

        const notification = await db('FoodTruck.Notifications')
            .where('notificationId', notificationId)
            .where('userId', user.userId)
            .first();

        if (!notification) {
            return res.status(404).json({ error: 'Not Found', message: 'Notification not found' });
        }

        const updateValue = isRead !== undefined ? isRead : true;

        await db('FoodTruck.Notifications')
            .where('notificationId', notificationId)
            .update({ isRead: updateValue });

        return res.status(200).json({ 
            message: updateValue ? 'Notification marked as read' : 'Notification marked as unread',
            notificationId: parseInt(notificationId),
            isRead: updateValue
        });
    } catch (error) {
        console.error('Update notification error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: error.message });
    }
});

/**
 * PUT /api/v1/notification/read/all
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

        return res.status(200).json({ 
            message: 'All notifications marked as read',
            count: result
        });
    } catch (error) {
        console.error('Mark all read error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: error.message });
    }
});

/**
 * DELETE /api/v1/notification/:notificationId
 * Delete a specific notification
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

        // Only delete read notifications unless 'all' is specified
        if (all !== 'true') {
            query = query.where('isRead', true);
        }

        const deleted = await query.del();

        return res.status(200).json({ 
            message: all === 'true' ? 'All notifications deleted' : 'Read notifications deleted',
            count: deleted
        });
    } catch (error) {
        console.error('Delete notifications error:', error.message);
        return res.status(500).json({ error: 'Server Error', message: error.message });
    }
});

module.exports = router;

