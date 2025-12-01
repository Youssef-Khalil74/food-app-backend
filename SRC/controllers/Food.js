const express = require('express');
const router = express.Router();
const db = require('../config/dbconnector');

// Get all foods
router.get('/', async (req, res) => {
  try {
    const foods = await db('ProductItem').select('*');
    res.json(foods);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get food by ID
router.get('/:id', async (req, res) => {
  try {
    const food = await db('ProductItem').where('ProductID', req.params.id).first();
    if (!food) return res.status(404).json({ message: 'Food not found' });
    res.json(food);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Add food
router.post('/', async (req, res) => {
  try {
    const { ProductName, ProductDescription, ProductCategory, Price } = req.body;
    const maxId = await db('ProductItem').max('ProductID as maxId').first();
    const ProductID = (maxId.maxId || 0) + 1;
    await db('ProductItem').insert({ ProductID, ProductName, ProductDescription, ProductCategory, Price });
    res.status(201).json({ message: 'Food added', ProductID });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Update food
router.put('/:id', async (req, res) => {
  try {
    await db('ProductItem').where('ProductID', req.params.id).update(req.body);
    res.json({ message: 'Food updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Delete food
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await db('ProductItem').where('ProductID', req.params.id).del();
    if (!deleted) return res.status(404).json({ message: 'Food not found' });
    res.json({ message: 'Food deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
