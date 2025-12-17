/**
 * Food Truck Backend Server
 * Main entry point for the application
 * 
 * ╔═══════════════════════════════════════════════════════════╗
 * ║  🏴󠁧󠁢󠁳󠁣󠁴󠁿 Crafted with love by Scotland 🏴󠁧󠁢󠁳󠁣󠁴󠁿                      ║
 * ║  "Alba gu bràth" - Scotland Forever                       ║
 * ╚═══════════════════════════════════════════════════════════╝
 */
require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');

const app = express();

// Import routes
const routes = require('./routes/index');

// Configuration
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// ====================================
// TEMPLATE ENGINE SETUP
// ====================================
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hjs');

// ====================================
// MIDDLEWARE SETUP
// ====================================

// CORS configuration - Allow frontend to make requests
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);
        
        // Allow ngrok URLs
        if (origin.includes('ngrok-free.app') || origin.includes('ngrok.io')) {
            return callback(null, true);
        }
        
        // List of allowed origins
        const allowedOrigins = [
            FRONTEND_URL,
            'http://localhost:3000',
            'http://localhost:3001',
            'http://127.0.0.1:3000',
            process.env.CORS_ORIGIN
        ].filter(Boolean);
        
        if (allowedOrigins.includes(origin) || process.env.CORS_ORIGIN === '*') {
            callback(null, true);
        } else {
            callback(null, true); // Allow all origins in development
        }
    },
    credentials: true, // Allow cookies and authorization headers
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    exposedHeaders: ['Set-Cookie']
};

app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));

// Parse JSON and URL-encoded bodies
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Parse cookies
app.use(cookieParser());

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve static files (uploaded images)
app.use('/uploads', express.static(uploadsDir));

// Serve static frontend files (but not index.html - let view routes handle /)
app.use('/styles', express.static(path.join(__dirname, 'public', 'styles')));
app.use('/src', express.static(path.join(__dirname, 'public', 'src')));
app.use('/images', express.static(path.join(__dirname, 'public', 'images')));

// ====================================
// VIEW ROUTES (Frontend Pages)
// ====================================

// Login Page (Public)
app.get('/', (req, res) => {
    res.render('login');
});

// Register Page (Public)
app.get('/register', (req, res) => {
    res.render('register');
});

// Customer Dashboard
app.get('/dashboard', (req, res) => {
    res.render('customerHomepage');
});

// Browse Trucks
app.get('/trucks', (req, res) => {
    res.render('trucks');
});

// Truck Menu
app.get('/truckMenu/:truckId', (req, res) => {
    res.render('truckMenu');
});

// Shopping Cart
app.get('/cart', (req, res) => {
    res.render('cart');
});

// My Orders
app.get('/myOrders', (req, res) => {
    res.render('myOrders');
});

// Owner Dashboard
app.get('/ownerDashboard', (req, res) => {
    res.render('ownerDashboard');
});

// Menu Items Management
app.get('/menuItems', (req, res) => {
    res.render('menuItems');
});

// Add Menu Item
app.get('/addMenuItem', (req, res) => {
    res.render('addMenuItem');
});

// Truck Orders
app.get('/truckOrders', (req, res) => {
    res.render('truckOrders');
});

// Admin Dashboard
app.get('/adminDashboard', (req, res) => {
    res.render('adminDashboard');
});

// Account Page
app.get('/account', (req, res) => {
    res.render('account');
});

// ====================================
// API ROUTES
// ====================================

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

// 🏴󠁧󠁢󠁳󠁣󠁴󠁿 Easter Egg #2: Secret Scotland endpoint (must be before routes!)
app.get('/api/v1/scotland', (req, res) => {
    const quotes = [
        "Nae man can tether time or tide. - Robert Burns",
        "Freedom is a noble thing. - John Barbour",
        "I have not yet begun to fight! - John Paul Jones",
        "Alba gu bràth! (Scotland Forever!)",
        "We look to Scotland for all our ideas of civilisation. - Voltaire",
        "Wha daur meddle wi' me? - Scottish Thistle Motto",
        "In Scotland, there is no such thing as bad weather, only the wrong clothes."
    ];
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
    
    res.json({
        message: "🏴󠁧󠁢󠁳󠁣󠁴󠁿 Ye found the secret! Welcome, fellow Scot!",
        quote: randomQuote,
        creator: "Scotland",
        hiddenMessage: "The thistle may be prickly, but it's bonnie nonetheless.",
        timestamp: new Date().toISOString()
    });
});

// Mount all routes under /api/v1
app.use('/api/v1', routes);

// ====================================
// ERROR HANDLING
// ====================================

// 404 handler for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Cannot ${req.method} ${req.path}`,
        hint: 'Check API documentation at /api/v1',
        scottishHint: "Ye might be a wee bit lost, laddie!" // Easter Egg #3
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
    console.log(`  ✓ Frontend: http://localhost:${PORT}`);
    console.log(`  ✓ API: http://localhost:${PORT}/api/v1`);
    console.log(`  ✓ Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('═'.repeat(50));
    console.log('  🏴󠁧󠁢󠁳󠁣󠁴󠁿 Wasaaaaaap - Scotland');
    console.log('');
});

module.exports = app;
