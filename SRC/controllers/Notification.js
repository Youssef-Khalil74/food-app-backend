const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.json());

// --- Simulated Database & State (In-Memory) ---
// Note: In a real application, these would be calls to a database (like the one you specified).

// Tracks current orders and their status
let orders = [
    { OrderID: 101, CustomerID: 1, RestaurantName: 'Burger Joint', Status: 'Pending', ScheduledTime: '12:30' },
    { OrderID: 102, CustomerID: 2, RestaurantName: 'Pizza Palace', Status: 'Preparing', ScheduledTime: '13:00' }
];

// Tracks notifications for users (both customers and restaurants)
// Structure: { recipientId: string, type: string, message: string, read: boolean }
let notifications = [
    // Example for Restaurant 'Burger Joint'
    { recipientId: 'Restaurant:Burger Joint', type: 'NEW_ORDER', message: 'New order #101 received for 12:30 release!', read: false },
    // Example for Customer 2
    { recipientId: 'Customer:2', type: 'ORDER_CONFIRMED', message: 'Your order #102 has been confirmed by Pizza Palace.', read: false }
];

// Utility to generate a unique ID (for new orders/notifications)
const generateId = (array) => (array.length > 0 ? Math.max(...array.map(item => item.OrderID || item.id)) + 1 : 100);

/**
 * Utility function to simulate sending a notification.
 * In a real app, this would push to a WebSocket or a dedicated notification service.
 * @param {string} recipientId - Unique ID (e.g., 'Customer:1' or 'Restaurant:RestaurantName')
 * @param {string} type - Type of notification (e.g., 'NEW_ORDER', 'READY_FOR_PICKUP')
 * @param {string} message - The message content
 */
const sendNotification = (recipientId, type, message) => {
    const newNotification = {
        id: generateId(notifications),
        recipientId,
        type,
        message,
        timestamp: new Date().toISOString(),
        read: false
    };
    notifications.push(newNotification);
    console.log(`[Notification Sent to ${recipientId}]: ${message}`);
    return newNotification;
};

// --- CORE API ENDPOINTS ---

/**
 * Endpoint to fetch all notifications for a specific user or restaurant.
 * Recipient ID format: 'Customer:{id}' or 'Restaurant:{name}'
 * Example: GET /notifications?recipient=Customer:1
 */
app.get('/notifications', (req, res) => {
    const recipientId = req.query.recipient;
    if (!recipientId) {
        return res.status(400).json({ message: "Recipient ID required (e.g., ?recipient=Customer:1)" });
    }

    const recipientNotifications = notifications.filter(n => n.recipientId === recipientId);
    return res.json(recipientNotifications);
});

/**
 * Simulates a customer checking out an order.
 * This handles Scenario 1 & 3.
 *
 * Request Body Example:
 * {
 * "CustomerID": 3,
 * "RestaurantName": "Burger Joint",
 * "OrderItems": [
 * {"ProductID": 1, "Quantity": 1},
 * {"ProductID": 999, "Quantity": 2} // Simulated unavailable item
 * ],
 * "ScheduledTime": "14:00"
 * }
 */
app.post('/orders', (req, res) => {
    const { CustomerID, RestaurantName, OrderItems, ScheduledTime } = req.body;

    // --- SCENARIO 3: Item Not Available Check ---
    // Simulate checking inventory based on ProductItem and Restaurant data.
    const unavailableItem = OrderItems.find(item => item.ProductID === 999);

    if (unavailableItem) {
        // SCENARIO 3 Trigger: Item 999 is hardcoded as 'unavailable' for demonstration
        sendNotification(`Customer:${CustomerID}`, 'ITEM_UNAVAILABLE',
            `Order failed: Item ID ${unavailableItem.ProductID} is currently unavailable at ${RestaurantName}.`);

        return res.status(400).json({
            message: 'Order processing failed due to unavailable items.',
            notificationSent: true
        });
    }

    // --- Proceed with successful order ---
    const newOrderID = generateId(orders);
    const newOrder = {
        OrderID: newOrderID,
        CustomerID: CustomerID,
        RestaurantName: RestaurantName,
        Status: 'Pending',
        ScheduledTime: ScheduledTime,
        Items: OrderItems,
        Date: new Date().toISOString().split('T')[0]
    };
    orders.push(newOrder);

    // --- SCENARIO 1 Trigger: Notification to Restaurant ---
    sendNotification(`Restaurant:${RestaurantName}`, 'NEW_ORDER',
        `New Order #${newOrderID} placed by Customer ${CustomerID}. Prep scheduled for ${ScheduledTime}.`);

    return res.status(201).json({
        message: 'Order placed successfully.',
        order: newOrder,
        notificationSent: true
    });
});

/**
 * Endpoint for a restaurant to update an order's status.
 * This handles Scenario 2.
 * Example: PUT /orders/101/status
 * Request Body: { "newStatus": "Completed" }
 */
app.put('/orders/:id/status', (req, res) => {
    const orderId = parseInt(req.params.id);
    const { newStatus } = req.body;
    const orderIndex = orders.findIndex(o => o.OrderID === orderId);

    if (orderIndex === -1) {
        return res.status(404).json({ message: "Order not found" });
    }

    const order = orders[orderIndex];
    order.Status = newStatus;
    orders[orderIndex] = order;

    let notificationSent = false;
    let message = `Order #${orderId} status updated to ${newStatus}.`;

    if (newStatus === 'Completed') {
        // --- SCENARIO 2 Trigger: Notification to Customer ---
        sendNotification(`Customer:${order.CustomerID}`, 'ORDER_READY',
            `🎉 Your order #${orderId} from ${order.RestaurantName} is ready for pickup!`);
        notificationSent = true;
        message = 'Order completed and customer notified.';
    }

    return res.json({
        message,
        order: order,
        notificationSent: notificationSent
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Notification API running at http://localhost:${PORT}`);
    console.log(`\n--- Test Endpoints ---`);
    console.log(`1. Get Notifications: GET http://localhost:${PORT}/notifications?recipient=Customer:1`);
    console.log(`2. Checkout (Success/Fail): POST http://localhost:${PORT}/orders (see payload example in code)`);
    console.log(`3. Mark Completed: PUT http://localhost:${PORT}/orders/101/status (body: {"newStatus": "Completed"})`);
});