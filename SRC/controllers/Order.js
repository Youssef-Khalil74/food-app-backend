
function orderManagement(app) {
  // ===============================
  // Knex/Express setup (as requested)
  // ===============================
  const knex = require('knex');
  const db = knex({
    client: 'pg',
    connection: {
      host : 'localhost',
      port : 3000,
      user : 'postgres',
      password : '123',
      database : 'postgres'
    }
  });

  // ===============
  // GET all orders
  // ===============
  app.get("/orders", async (req, res) => {
    try {
      const orders = await db('Orders');
      res.json(orders);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==================
  // GET order by ID (+ order items)
  // ==================
  app.get("/orders/:id", async (req, res) => {
    try {
      const order = await db('Orders').where({ OrderID: req.params.id }).first();
      if (!order) return res.status(404).json({ message: "Order not found" });
      // Get items for this order
      const items = await db('OrderItem')
        .where({ OrderID: order.OrderID })
        .join('ProductItem', 'OrderItem.ProductID', 'ProductItem.ProductID')
        .select('OrderItem.*', 'ProductItem.ProductName', 'ProductItem.ProductCategory');
      res.json({ ...order, items });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // =========
  // Add new order
  // =========
  app.post("/orders", async (req, res) => {
    try {
      const { CustomerID, RestaurantName, PaymentInfo, Date, time, items } = req.body;
      // Insert order (without order items first)
      const [order] = await db('Orders')
        .insert({ CustomerID, RestaurantName, PaymentInfo, Date, time })
        .returning('*');
      // Insert order items if given
      let insertedItems = [];
      if (Array.isArray(items) && items.length > 0) {
        // Fetch price for each item & insert
        for (const i of items) {
          const product = await db('ProductItem').where({ ProductID: i.ProductID }).first();
          if (!product) continue; // skip
          const [orderItem] = await db('OrderItem')
            .insert({
              OrderID: order.OrderID,
              ProductID: i.ProductID,
              Quantity: i.Quantity,
              Price: product.Price
            })
            .returning('*');
          insertedItems.push(orderItem);
        }
      }
      res.json({ message: "Order created", order, items: insertedItems });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ===========
  // Update order (basic fields, not items)
  // ===========
  app.put("/orders/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const order = await db('Orders').where({ OrderID: id }).first();
      if (!order) return res.status(404).json({ message: "Order not found" });
      const updateData = req.body;
      const [updated] = await db('Orders')
        .where({ OrderID: id })
        .update(updateData)
        .returning('*');
      res.json({ message: "Order updated", order: updated });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // =======
  // Delete order (+ cascade delete order items)
  // =======
  app.delete("/orders/:id", async (req, res) => {
    try {
      const id = req.params.id;
      await db('OrderItem').where({ OrderID: id }).del();
      const rows = await db('Orders').where({ OrderID: id }).del();
      if (rows === 0) return res.status(404).json({ message: "Order not found" });
      res.json({ message: "Order deleted" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ===============
  // GET all orders for a student
  // ===============
  app.get("/orders/student/:studentId", async (req, res) => {
    try {
      const orders = await db('Orders').where({ CustomerID: req.params.studentId });
      res.json(orders);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================
  // GET all orders for food truck
  // ==========================
  app.get("/orders/restaurant/:restaurantName", async (req, res) => {
    try {
      const orders = await db('Orders').where({ RestaurantName: req.params.restaurantName });
      res.json(orders);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==========================
  // PATCH order status (as field in table, you must add STATUS to schema or use PaymentInfo as demo)
  // ==========================
  app.patch("/orders/:id/status", async (req, res) => {
    try {
      const { status } = req.body;
      // For demo, store status in PaymentInfo
      const [updated] = await db('Orders')
        .where({ OrderID: req.params.id })
        .update({ PaymentInfo: status })
        .returning('*');
      res.json({ message: "Order status updated", order: updated });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ===============  ORDER ITEM MANAGEMENT ===============

  // Add item to order
  app.post("/orders/:id/items", async (req, res) => {
    try {
      const orderId = req.params.id;
      const { ProductID, Quantity } = req.body;
      const product = await db('ProductItem').where({ ProductID }).first();
      if (!product) return res.status(404).json({ message: "Product not found" });
      const [item] = await db('OrderItem')
        .insert({
          OrderID: orderId,
          ProductID,
          Quantity,
          Price: product.Price
        })
        .returning('*');
      res.json({ message: "Item added", item });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Update order item quantity
  app.put("/orders/items/:orderItemId", async (req, res) => {
    try {
      const { Quantity } = req.body;
      const [item] = await db('OrderItem')
        .where({ OrderItemID: req.params.orderItemId })
        .update({ Quantity })
        .returning('*');
      if (!item) return res.status(404).json({ message: "Order item not found" });
      res.json({ message: "Order item updated", item });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Remove order item
  app.delete("/orders/items/:orderItemId", async (req, res) => {
    try {
      const rows = await db('OrderItem').where({ OrderItemID: req.params.orderItemId }).del();
      if (rows === 0) return res.status(404).json({ message: "Order item not found" });
      res.json({ message: "Order item deleted" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

}

module.exports = orderManagement;