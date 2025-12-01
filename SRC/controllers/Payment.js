function paymentSystem(app) {
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

  // Helper validation
  async function validateStudent(studentId) {
    const student = await db('Customer').where({ CustomerID: studentId }).first();
    if (!student) throw new Error('Student not found');
    return student;
  }
  async function validateOrder(orderId) {
    const order = await db('Orders').where({ OrderID: orderId }).first();
    if (!order) throw new Error('Order not found');
    return order;
  }
  async function validateOrderOwned(orderId, studentId) {
    const order = await validateOrder(orderId);
    if (order.CustomerID !== Number(studentId)) throw new Error('Order does not belong to this student');
  }
  async function validatePaymentMethod(method) {
    const allowed = ['cash', 'card', 'wallet'];
    if (!allowed.includes(method)) throw new Error('Invalid payment method');
  }
  async function orderNotPaid(orderId) {
    const payment = await db('Payment').where({ OrderID: orderId }).andWhereIn('Status', ['pending', 'paid']).first();
    if (payment) throw new Error('Order is already paid');
  }
  async function validateAmount(orderId, amount) {
    const items = await db('OrderItem').where({ OrderID: orderId });
    if (!items.length) throw new Error("Order has no items");
    let sum = 0;
    for (const it of items) sum += parseFloat(it.Price) * it.Quantity;
    if (parseFloat(amount) !== parseFloat(sum)) throw new Error('Amount does not match order total');
  }
  async function validateTruck(truckName) {
    const truck = await db('Restaurant').where({ RestaurantName: truckName }).first();
    if (!truck) throw new Error('Food truck not found');
    return truck;
  }
  async function validatePaymentExists(paymentId) {
    const payment = await db('Payment').where({ PaymentID: paymentId }).first();
    if (!payment) throw new Error('Payment not found');
    return payment;
  }

  // 1. Create Payment
  app.post("/payments", async (req, res) => {
    try {
      const { studentId, orderId, amount, method } = req.body;
      await validateStudent(studentId);
      await validateOrder(orderId);
      await validateOrderOwned(orderId, studentId);
      await validatePaymentMethod(method);
      await orderNotPaid(orderId);
      await validateAmount(orderId, amount);
      // Insert
      const [payment] = await db('Payment').insert({
        OrderID: orderId,
        Amount: amount,
        Method: method,
        Status: 'pending'
      }).returning('*');
      res.status(201).json({ message: "Payment created", payment });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // 2. Get Payment By ID (+ order + student)
  app.get("/payments/:id", async (req, res) => {
    try {
      const payment = await db('Payment').where({ PaymentID: req.params.id }).first();
      if (!payment) return res.status(404).json({ message: "Payment not found" });
      const order = await db('Orders').where({ OrderID: payment.OrderID }).first();
      const student = order ? await db('Customer').where({ CustomerID: order.CustomerID }).first() : null;
      res.json({ payment, order, student });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3. List all payments for a student
  app.get("/students/:studentId/payments", async (req, res) => {
    try {
      await validateStudent(req.params.studentId);
      const payments = await db('Payment')
        .join('Orders', 'Payment.OrderID', 'Orders.OrderID')
        .where('Orders.CustomerID', req.params.studentId)
        .select('Payment.*');
      res.json(payments);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // 4. List all payments for a food truck 
  app.get("/foodtrucks/:truckId/payments", async (req, res) => {
    try {
      await validateTruck(req.params.truckId);
      // Payments for orders managed by this truck
      const payments = await db('Payment')
        .join('Orders', 'Payment.OrderID', 'Orders.OrderID')
        .join('Manage', 'Manage.OrderID', 'Orders.OrderID')
        .where('Manage.RestaurantName', req.params.truckId)
        .select('Payment.*');
      res.json(payments);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // 5. Update payment status
  app.patch("/payments/:id/status", async (req, res) => {
    try {
      const { status } = req.body;
      const validTransitions = [
        ['pending', 'paid'],
        ['pending', 'failed'],
        ['refund', 'refunded']
      ];
      const payment = await validatePaymentExists(req.params.id);
      const fromStatus = payment.Status;
      const allowed = validTransitions.some(([from, to]) => from === fromStatus && to === status);
      if (!allowed) throw new Error('Invalid status transition');
      const [updated] = await db('Payment').where({ PaymentID: req.params.id }).update({ Status: status }).returning('*');
      res.json({ message: "Payment status updated", payment: updated });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });
}

module.exports = paymentSystem;