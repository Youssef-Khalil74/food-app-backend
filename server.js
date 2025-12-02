/**
 * Food Truck Backend Server
 * Main entry point for the application
 */
require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();

// Import routes
const routes = require('./routes/index');

// Configuration
const PORT = process.env.PORT || 3001;

// ====================================
// MIDDLEWARE SETUP
// ====================================

// CORS configuration
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
}));

// Parse JSON and URL-encoded bodies
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve static files (uploaded images)
app.use('/uploads', express.static(uploadsDir));

// ====================================
// ROUTES
// ====================================

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        name: 'Food Truck Backend API',
        version: '1.0.0',
        description: 'GIU Food Truck Management System',
        documentation: '/api/v1',
        health: 'OK'
    });
});

// API info endpoint
app.get('/api/v1', (req, res) => {
    res.json({
        message: 'Food Truck API v1.0',
        status: 'running',
        publicEndpoints: {
            register: 'POST /api/v1/registration',
            login: 'POST /api/v1/registration/login',
            trucks: 'GET /api/v1/trucks',
            truckDetails: 'GET /api/v1/trucks/:truckId',
            menu: 'GET /api/v1/trucks/:truckId/menu',
            menuItem: 'GET /api/v1/menu/:itemId',
            categories: 'GET /api/v1/categories',
            search: 'GET /api/v1/search?q=',
            popular: 'GET /api/v1/popular'
        },
        privateEndpoints: {
            note: 'Require session_token cookie or Authorization header',
            account: '/api/v1/account',
            restaurant: '/api/v1/restaurant',
            food: '/api/v1/food',
            cart: '/api/v1/cart',
            order: '/api/v1/order',
            pickup: '/api/v1/pickup',
            inventory: '/api/v1/inventory',
            notification: '/api/v1/notification',
            habits: '/api/v1/habits',
            payment: '/api/v1/payment'
        }
    });
});

// Mount all routes under /api/v1
app.use('/api/v1', routes);

// ====================================
// ERROR HANDLING
// ====================================

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Cannot ${req.method} ${req.path}`,
        hint: 'Check API documentation at /api/v1'
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    
    // Multer file size error
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ 
            error: 'File Too Large',
            message: 'Maximum file size is 5MB' 
        });
    }
    
    // Multer file type error
    if (err.message && err.message.includes('Only image files')) {
        return res.status(400).json({ 
            error: 'Invalid File Type',
            message: err.message 
        });
    }
    
    res.status(err.status || 500).json({
        error: err.name || 'Internal Server Error',
        message: err.message || 'An unexpected error occurred'
    });
});

// ====================================
// START SERVER
// ====================================

app.listen(PORT, () => {
    console.log('');
    console.log('═'.repeat(50));
    console.log('  🚚 Food Truck Backend Server');
    console.log('═'.repeat(50));
    console.log(`  ✓ Server running on port ${PORT}`);
    console.log(`  ✓ API: http://localhost:${PORT}/api/v1`);
    console.log(`  ✓ Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('═'.repeat(50));
    console.log('');
});

module.exports = app;
