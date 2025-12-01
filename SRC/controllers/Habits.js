function habitsAPI(app) {
  const knex = require('knex');
  const db = knex({
    client: 'pg',
    connection: {
      host: 'localhost',
      port: 3000,
      user: 'postgres',
      password: '123',
      database: 'postgres'
    }
  });

  // Helper to get customer (student) ID (from query/body/header or fallback 1)
  function getCustomerId(req) {
    return Number(req.query.customerId || req.body.customerId || req.headers['x-customer-id'] || 1);
  }

  // GET /habits
  app.get("/habits", async (req, res) => {
    const customerId = getCustomerId(req);
    try {
      const countRes = await db('Orders').where({ CustomerID: customerId }).count('OrderID').first();
      const count = parseInt(countRes.count || countRes.count || 0, 10);
      let results = [];
      if (count >= 3) {
        // Get most frequent products for this student
        const rows = await db('OrderItem')
          .join('Orders', 'OrderItem.OrderID', 'Orders.OrderID')
          .join('ProductItem', 'OrderItem.ProductID', 'ProductItem.ProductID')
          .join('Manage', 'Orders.OrderID', 'Manage.OrderID')
          .join('Restaurant', 'Manage.RestaurantName', 'Restaurant.RestaurantName')
          .select(
            'ProductItem.ProductID',
            'ProductItem.ProductName',
            'ProductItem.ProductDescription',
            'ProductItem.ProductCategory',
            'ProductItem.Price',
            'Orders.RestaurantName'
          )
          .count('OrderItem.OrderItemID as TimesOrdered')
          .max('Orders.Date as LastOrderedDate')
          .max('Orders.time as LastOrderedTime')
          .where('Orders.CustomerID', customerId)
          .groupBy(
            'ProductItem.ProductID',
            'ProductItem.ProductName',
            'ProductItem.ProductDescription',
            'ProductItem.ProductCategory',
            'ProductItem.Price',
            'Orders.RestaurantName'
          )
          .orderBy([{ column: 'TimesOrdered', order: 'desc' }, { column: 'LastOrderedDate', order: 'desc' }, { column: 'LastOrderedTime', order: 'desc' }])
          .limit(5);

        results = rows.map(item => ({
          productId: item.ProductID,
          productName: item.ProductName,
          productDescription: item.ProductDescription,
          productCategory: item.ProductCategory,
          price: Number(item.Price),
          restaurantName: item.RestaurantName,
          lastOrdered: item.LastOrderedDate
            ? `${item.LastOrderedDate} ${item.LastOrderedTime || ''}`.trim()
            : null,
          timesOrdered: Number(item.TimesOrdered)
        }));
      } else {
        // Fallback: show all items from the most recent order
        const lastOrder = await db('Orders')
          .where({ CustomerID: customerId })
          .orderBy('Date', 'desc')
          .orderBy('time', 'desc')
          .first();

        if (!lastOrder) {
          return res.json([]); // No orders at all
        }

        const items = await db('OrderItem')
          .where({ OrderID: lastOrder.OrderID })
          .join('ProductItem', 'OrderItem.ProductID', 'ProductItem.ProductID')
          .select(
            'ProductItem.ProductID',
            'ProductItem.ProductName',
            'ProductItem.ProductDescription',
            'ProductItem.ProductCategory',
            'ProductItem.Price',
            'OrderItem.Quantity'
          )
          .orderBy('OrderItemID');

        results = items.map(item => ({
          productId: item.ProductID,
          productName: item.ProductName,
          productDescription: item.ProductDescription,
          productCategory: item.ProductCategory,
          price: Number(item.Price),
          restaurantName: lastOrder.RestaurantName,
          lastOrdered: `${lastOrder.Date} ${lastOrder.time}`,
          timesOrdered: 1
        }));
      }
      res.json(results);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /habits/reorder (repeat order or repeat product)
  app.post("/habits/reorder", async (req, res) => {
    const customerId = getCustomerId(req);
    const { orderId, productId } = req.body;
    if (!orderId && !productId) {
      return res.status(400).json({ error: 'orderId or productId required' });
    }

    try {
      let orderTemplate = null;
      let orderItems = [];
      let restaurantName = null;

      if (orderId) {
        // repeat entire order
        orderTemplate = await db('Orders').where({ OrderID: orderId, CustomerID: customerId }).first();
        if (!orderTemplate) {
          return res.status(404).json({ error: 'Original order not found.' });
        }
        orderItems = await db('OrderItem').where({ OrderID: orderId });
        restaurantName = orderTemplate.RestaurantName;
      } else if (productId) {
        // repeat most recent instance of ordering this product
        const lastProductOrder = await db('OrderItem')
          .join('Orders', 'OrderItem.OrderID', 'Orders.OrderID')
          .where('Orders.CustomerID', customerId)
          .andWhere('OrderItem.ProductID', productId)
          .orderBy('Orders.Date', 'desc')
          .orderBy('Orders.time', 'desc')
          .select(
            'OrderItem.Quantity',
            'OrderItem.Price',
            'Orders.RestaurantName',
            'OrderItem.ProductID'
          )
          .first();

        if (!lastProductOrder) {
          return res.status(404).json({ error: 'No previous order with this product.' });
        }
        restaurantName = lastProductOrder.RestaurantName;
        orderItems = [lastProductOrder];
      }

      // Generate unique OrderID and OrderItemID (for demo; consider using SERIAL or UUIDs)
      const now = new Date();
      const newOrderId = Number(`${now.getTime()}${Math.floor(Math.random()*900+100)}`);
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().slice(0, 8);

      // Insert order
      await db('Orders').insert({
        OrderID: newOrderId,
        CustomerID: customerId,
        RestaurantName: restaurantName,
        PaymentInfo: 'paid', // for demo/testing
        Date: dateStr,
        time: timeStr
      });

      // Insert order items
      for (const item of orderItems) {
        const newOrderItemId = Number(`${Date.now()}${Math.floor(Math.random()*900+100)}`);
        await db('OrderItem').insert({
          OrderItemID: newOrderItemId,
          OrderID: newOrderId,
          ProductID: item.ProductID,
          Quantity: item.Quantity || 1,
          Price: item.Price
        });
      }

      // Insert manage record (restaurant <-> order)
      await db('Manage').insert({
        RestaurantName: restaurantName,
        OrderID: newOrderId
      });

      res.status(201).json({ message: 'Order placed successfully!', newOrderId });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
}

module.exports = habitsAPI;