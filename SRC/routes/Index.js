const express = require("express");
const router = express.Router();

// Import controllers
const registration = require("../controllers/registration");
const account = require("../controllers/account");
const habits = require("../controllers/habits");
const restaurants = require("../controllers/restaurants");
const menu = require("../controllers/menu");
const cart = require("../controllers/cart");
const orders = require("../controllers/orders");
const pickup = require("../controllers/pickup");
const inventory = require("../controllers/inventory");
const payment = require("../controllers/payment");

// Register routes
router.use("/registration", registration);
router.use("/account", account);
router.use("/habits", habits);
router.use("/restaurants", restaurants);
router.use("/menu", menu);
router.use("/cart", cart);
router.use("/orders", orders);
router.use("/pickup", pickup);
router.use("/inventory", inventory);
router.use("/payment", payment);

module.exports = router;
