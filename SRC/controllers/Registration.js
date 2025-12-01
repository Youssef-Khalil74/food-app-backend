/**
 * Simple Customer Management API using Express.js
 * This file sets up a RESTful API with CRUD, search, and filter operations
 * for a list of customer accounts.
 */
const express = require('express');
const app = express();
const port = 3001; // Using a different port to avoid conflict

// Middleware to parse JSON request bodies
app.use(express.json());

// Dummy data store.
let customers = [
    { customerId: 101, firstName: "Alice", lastName: "Smith", email: "alice.s@example.com", password: "hashed_password_1" },
    { customerId: 102, firstName: "Bob", lastName: "Johnson", email: "bob.j@example.com", password: "hashed_password_2" },
    { customerId: 103, firstName: "Charlie", lastName: "Brown", email: "charlie.b@example.com", password: "hashed_password_3" },
    { customerId: 104, firstName: "Diana", lastName: "Prince", email: "diana.p@example.com", password: "hashed_password_4" },
];

// --- ROUTES ---

// Get all customers
app.get("/customers", (req, res) => {
    // Return all customer records (excluding sensitive data like password)
    const safeCustomers = customers.map(({ password, ...rest }) => rest);
    res.json(safeCustomers);
});

// Get customer by ID
app.get("/customers/:id", (req, res) => {
    // Find customer by customerId
    const customer = customers.find((c) => c.customerId === parseInt(req.params.id));

    if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
    }

    // Return the customer (excluding password)
    const { password, ...safeCustomer } = customer;
    res.json(safeCustomer);
});

// Add new customer
app.post("/customers", (req, res) => {
    // Generate a new ID
    const newId = customers.length > 0 ? Math.max(...customers.map(c => c.customerId)) + 1 : 101;
    
    // Create new customer object, using 'customerId' instead of 'id'
    const newCustomer = { customerId: newId, ...req.body };

    // Basic validation for required fields
    if (!newCustomer.firstName || !newCustomer.lastName || !newCustomer.email || !newCustomer.password) {
        return res.status(400).json({ message: "Missing required fields (firstName, lastName, email, password)" });
    }

    customers.push(newCustomer);
    
    // Return the new customer (excluding password)
    const { password, ...safeNewCustomer } = newCustomer;
    res.status(201).json({ message: "Customer added", customer: safeNewCustomer });
});

// Update customer
app.put("/customers/:id", (req, res) => {
    const id = parseInt(req.params.id);
    const index = customers.findIndex((c) => c.customerId === id);

    if (index === -1) {
        return res.status(404).json({ message: "Customer not found" });
    }

    // Merge existing data with update data, ensuring customerId is preserved
    customers[index] = { ...customers[index], ...req.body, customerId: id };

    // Return the updated customer (excluding password)
    const { password, ...safeUpdatedCustomer } = customers[index];
    res.json({ message: "Customer updated", customer: safeUpdatedCustomer });
});

// Delete customer
app.delete("/customers/:id", (req, res) => {
    const id = parseInt(req.params.id);
    const initialLength = customers.length;

    // Filter out the customer with the matching ID
    customers = customers.filter((c) => c.customerId !== id);

    if (customers.length === initialLength) {
        return res.status(404).json({ message: "Customer not found, nothing deleted" });
    }

    res.json({ message: "Customer deleted", deletedCustomerId: id });
});

// Search customers by first or last name
app.get("/customers/search/:name", (req, res) => {
    const keyword = req.params.name.toLowerCase();
    
    // Filter customers whose first or last name includes the keyword (case-insensitive)
    const results = customers.filter(
        (c) => (c.firstName && c.firstName.toLowerCase().includes(keyword)) || 
               (c.lastName && c.lastName.toLowerCase().includes(keyword))
    );
    
    // Return results (excluding passwords)
    const safeResults = results.map(({ password, ...rest }) => rest);
    res.json(safeResults);
});

// Filter customers by last name (like the category filter in the previous example)
app.get("/customers/filter/lastname/:lastname", (req, res) => {
    const lastName = req.params.lastname.toLowerCase();

    // Filter customers that match the exact last name (case-insensitive)
    const results = customers.filter(
        (c) => c.lastName && c.lastName.toLowerCase() === lastName
    );
    
    // Return results (excluding passwords)
    const safeResults = results.map(({ password, ...rest }) => rest);
    res.json(safeResults);
});


// Start the server
app.listen(port, () => {
    console.log(`Customer API listening at http://localhost:${port}`);
});