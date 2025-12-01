const express = require('express');
const router = express.Router();
const db = require('../config/dbconnector');

// Get all pickups
router.get('/', async (req, res) => {
  try {
    const pickups = await db('Orders').select('*');
    res.json(pickups);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Create new pickup (order)
router.post('/', async (req, res) => {
  try {
    const { CustomerID, RestaurantName, PaymentInfo, Date, time } = req.body;
    const maxId = await db('Orders').max('OrderID as maxId').first();
    const OrderID = (maxId.maxId || 0) + 1;
    await db('Orders').insert({ OrderID, CustomerID, RestaurantName, PaymentInfo, Date, time });
    res.status(201).json({ message: 'Pickup scheduled', OrderID });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
