const express = require("express");
const app = express();
app.use(express.json());
// =========================================
// FAKE DATABASE (In Memory)
// =========================================
let foods = [
{ id: 1, name: "Pizza", price: 120, category: "Italian" },
{ id: 2, name: "Burger", price: 90, category: "Fast Food" },
{ id: 3, name: "Pasta", price: 150, category: "Italian" },
];
let orders = [];
// =========================================
// BASIC
// =========================================
app.get("/", (req, res) => {
res.send("Welcome to the Food App API");
});

// =========================================
// FOODS
// =========================================
// Get all foods
app.get("/foods", (req, res) => {
res.json(foods);
});
// Get food by ID
app.get("/foods/:id", (req, res) => {
const food = foods.find((f) => f.id === parseInt(req.params.id));
if (!food) return res.status(404).json({ message: "Food not found" });
res.json(food);
});
// Add new food
app.post("/foods", (req, res) => {
const newFood = req.body;
foods.push(newFood);
res.json({ message: "Food added", food: newFood });
});
// Update food
app.put("/foods/:id", (req, res) => {
const id = parseInt(req.params.id);
const index = foods.findIndex((f) => f.id === id);
if (index === -1) return res.status(404).json({ message: "Food not found" });
foods[index] = { ...foods[index], ...req.body };
res.json({ message: "Food updated", food: foods[index] });
});
// Delete food
app.delete("/foods/:id", (req, res) => {
const id = parseInt(req.params.id);
foods = foods.filter((f) => f.id !== id);
res.json({ message: "Food deleted" });
});
// Search foods by name
app.get("/foods/search/:name", (req, res) => {
const keyword = req.params.name.toLowerCase();

const results = foods.filter((f) => f.name.toLowerCase().includes(keyword));
res.json(results);
});
// Filter foods by category
app.get("/foods/category/:category", (req, res) => {
const category = req.params.category.toLowerCase();
const results = foods.filter(
(f) => f.category.toLowerCase() === category
);
res.json(results);
});
// =========================================
// CATEGORIES
// =========================================
app.get("/categories", (req, res) => {
const categories = [...new Set(foods.map((f) => f.category))];
res.json(categories);
});
// =========================================
// ORDERS
// =========================================
// Place an order
app.post("/orders", (req, res) => {
const order = {
id: orders.length + 1,
items: req.body.items, // e.g. [1, 2]
total: req.body.total,
status: "pending",
};
orders.push(order);
res.json({ message: "Order placed", order });
});
// Get all orders
app.get("/orders", (req, res) => {
res.json(orders);
});
// Get order by ID

app.get("/orders/:id", (req, res) => {
const order = orders.find((o) => o.id === parseInt(req.params.id));
if (!order) return res.status(404).json({ message: "Order not found" });
res.json(order);
});
// Update order status
app.put("/orders/:id", (req, res) => {
const id = parseInt(req.params.id);
const order = orders.find((o) => o.id === id);
if (!order) return res.status(404).json({ message: "Order not found" });
order.status = req.body.status;
res.json({ message: "Order status updated", order });
});
// =========================================
// RUN SERVER
// =========================================
app.listen(3000, () => console.log("Server running on http://localhost:3000"));