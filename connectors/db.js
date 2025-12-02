/**
 * Database Connector
 * Uses Knex to connect to PostgreSQL with FoodTruck schema
 */
const knex = require('knex');
require('dotenv').config();

const config = {
    client: 'pg',
    connection: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 5432,
        user: process.env.DB_USER || 'postgres',
        password: process.env.PASSWORD,
        database: process.env.DB_NAME || 'postgres'
    },
    pool: {
        min: 2,
        max: 10
    }
};

const db = knex(config);

// Test connection on startup
db.raw('SELECT 1')
    .then(() => console.log('✓ Database connected successfully'))
    .catch(err => console.error('✗ Database connection failed:', err.message));

module.exports = db;

