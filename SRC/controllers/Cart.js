app.get("/carts", (req, res) => {
  res.json(carts);
});
app.get("/carts/:id", (req, res) => {
  const cart = carts.find((c) => c.id === parseInt(req.params.id));
  if (!cart) return res.status(404).json({ message: "Cart not found" });
  res.json(cart);
});
app.post("/carts", (req, res) => {
  const newCart = req.body;
  // In a real application, you might initialize fields like totalQuantityCount to 0
  carts.push(newCart);
  res.json({ message: "Cart created", cart: newCart });
});
app.put("/carts/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const index = carts.findIndex((c) => c.id === id);

  if (index === -1) return res.status(404).json({ message: "Cart not found" });

  carts[index] = { ...carts[index], ...req.body };
  res.json({ message: "Cart updated", cart: carts[index] });
});
app.delete("/carts/:id", (req, res) => {
  const id = parseInt(req.params.id);
  // *Note: The 'carts' array needs to be mutable (e.g., declared with 'let')*
  carts = carts.filter((c) => c.id !== id);
  res.json({ message: "Cart deleted" });
});
app.get("/carts/search/:userId", (req, res) => {
  const keyword = parseInt(req.params.userId); // Searching by integer ID
  const results = carts.filter((c) => c.userId === keyword);
  res.json(results);
});
app.get("/carts/status/:status", (req, res) => {
  const status = req.params.status.toLowerCase();
  const results = carts.filter(
    (c) => c.status.toLowerCase() === status
  );
  res.json(results);
});