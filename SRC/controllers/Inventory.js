
// =========================================
// BASIC
// =========================================
app.get("/", (req, res) => {
res.send("Welcome to the Inventory Management API");
});
// =========================================
// INVENTORY MANAGEMENT
// =========================================
// Get all inventory for a restaurant
app.get("/restaurants/:name/inventory", (req, res) => {
const restaurantName = req.params.name;
// Check if restaurant exists
const restaurant = restaurants.find(
(r) => r.RestaurantName.toLowerCase() === restaurantName.toLowerCase()
);
if (!restaurant) {
return res.status(404).json({ message: "Restaurant not found" });
}
// Get all inventory items for this restaurant
const restaurantInventory = inventory.filter(
(item) => item.RestaurantName.toLowerCase() === restaurantName.toLowerCase()
);
res.json({
restaurant: restaurant.RestaurantName,
inventory: restaurantInventory,
totalItems: restaurantInventory.length,
});
});
// Get inventory status with warnings
app.get("/restaurants/:name/inventory/status", (req, res) => {
const restaurantName = req.params.name;
// Check if restaurant exists
const restaurant = restaurants.find(
(r) => r.RestaurantName.toLowerCase() === restaurantName.toLowerCase()
);
if (!restaurant) {
return res.status(404).json({ message: "Restaurant not found" });
}
// Get all inventory items for this restaurant
const restaurantInventory = inventory.filter(
(item) => item.RestaurantName.toLowerCase() === restaurantName.toLowerCase()
);
// Categorize items
const outOfStock = restaurantInventory.filter((item) => item.CurrentStock === 0);
const lowStock = restaurantInventory.filter(
(item) =>
item.CurrentStock > 0 &&
item.CurrentStock <= item.LowStockThreshold
);
const inStock = restaurantInventory.filter(
(item) => item.CurrentStock > item.LowStockThreshold
);
res.json({
restaurant: restaurant.RestaurantName,
summary: {
totalItems: restaurantInventory.length,
inStock: inStock.length,
lowStock: lowStock.length,
outOfStock: outOfStock.length,
},
items: {
inStock: inStock,
lowStock: lowStock,
outOfStock: outOfStock,
},
});
});
// Get low stock warnings
app.get("/restaurants/:name/inventory/warnings", (req, res) => {
const restaurantName = req.params.name;
// Check if restaurant exists
const restaurant = restaurants.find(
(r) => r.RestaurantName.toLowerCase() === restaurantName.toLowerCase()
);
if (!restaurant) {
return res.status(404).json({ message: "Restaurant not found" });
}
// Get items with low stock or out of stock
const warnings = inventory.filter(
(item) =>
item.RestaurantName.toLowerCase() === restaurantName.toLowerCase() &&
(item.CurrentStock === 0 ||
item.CurrentStock <= item.LowStockThreshold)
);
const warningMessages = warnings.map((item) => {
if (item.CurrentStock === 0) {
return {
ProductID: item.ProductID,
ProductName: item.ProductName,
status: "OUT_OF_STOCK",
message: `${item.ProductName} is out of stock (0 units available)`,
CurrentStock: item.CurrentStock,
IsAvailable: false,
};
} else {
return {
ProductID: item.ProductID,
ProductName: item.ProductName,
status: "LOW_STOCK",
message: `${item.ProductName} is running low (${item.CurrentStock} units remaining, threshold:
${item.LowStockThreshold})`,
CurrentStock: item.CurrentStock,
LowStockThreshold: item.LowStockThreshold,
IsAvailable: true,
};
}
});
res.json({
restaurant: restaurant.RestaurantName,
warnings: warningMessages,
warningCount: warningMessages.length,
});
});
// Add or update inventory item
app.post("/restaurants/:name/inventory", (req, res) => {
const restaurantName = req.params.name;
const { ProductID, ProductName, CurrentStock, LowStockThreshold } = req.body;
// Check if restaurant exists
const restaurant = restaurants.find(
(r) => r.RestaurantName.toLowerCase() === restaurantName.toLowerCase()
);
if (!restaurant) {
return res.status(404).json({ message: "Restaurant not found" });
}
// Validate required fields
if (!ProductID || !ProductName || CurrentStock === undefined) {
return res.status(400).json({
message: "ProductID, ProductName, and CurrentStock are required fields",
});
}
// Check if inventory item already exists
const existingItem = inventory.find(
(item) =>
item.RestaurantName.toLowerCase() === restaurantName.toLowerCase() &&
item.ProductID === ProductID
);
const defaultThreshold = LowStockThreshold || 10; // Default low stock threshold
const stock = parseInt(CurrentStock);
const isAvailable = stock > 0; // Auto-disable if stock is 0
if (existingItem) {
// Update existing item
existingItem.CurrentStock = stock;
existingItem.LowStockThreshold =
LowStockThreshold !== undefined
? parseInt(LowStockThreshold)
: existingItem.LowStockThreshold;
existingItem.IsAvailable = isAvailable; // Auto-update availability
existingItem.ProductName = ProductName; // Update name if changed
res.json({
message: "Inventory item updated successfully",
item: existingItem,
warning:
existingItem.CurrentStock <= existingItem.LowStockThreshold
? `Warning: ${existingItem.ProductName} is running low (${existingItem.CurrentStock} units remaining)`
: null,
});
} else {
// Create new inventory item
const newInventoryItem = {
RestaurantName: restaurant.RestaurantName,
ProductID: parseInt(ProductID),
ProductName: ProductName.trim(),
CurrentStock: stock,
LowStockThreshold: parseInt(defaultThreshold),
IsAvailable: isAvailable, // Auto-disable if stock is 0
};
inventory.push(newInventoryItem);
res.status(201).json({
message: "Inventory item added successfully",
item: newInventoryItem,
warning:
newInventoryItem.CurrentStock <= newInventoryItem.LowStockThreshold
? `Warning: ${newInventoryItem.ProductName} is running low (${newInventoryItem.CurrentStock} units remaining)`
: null,
});
}
});
// Update inventory quantity (for restocking or sales)
app.put("/restaurants/:name/inventory/:productId", (req, res) => {
const restaurantName = req.params.name;
const productId = parseInt(req.params.productId);
const { CurrentStock, LowStockThreshold } = req.body;
// Check if restaurant exists
const restaurant = restaurants.find(
(r) => r.RestaurantName.toLowerCase() === restaurantName.toLowerCase()
);
if (!restaurant) {
return res.status(404).json({ message: "Restaurant not found" });
}
// Find inventory item
const inventoryItem = inventory.find(
(item) =>
item.RestaurantName.toLowerCase() === restaurantName.toLowerCase() &&
item.ProductID === productId
);
if (!inventoryItem) {
return res.status(404).json({
message: "Inventory item not found for this restaurant",
});
}
// Update stock
if (CurrentStock !== undefined) {
inventoryItem.CurrentStock = parseInt(CurrentStock);
// Auto-update availability - disable if stock is 0
inventoryItem.IsAvailable = inventoryItem.CurrentStock > 0;
}
// Update threshold if provided
if (LowStockThreshold !== undefined) {
inventoryItem.LowStockThreshold = parseInt(LowStockThreshold);
}
res.json({
message: "Inventory updated successfully",
item: inventoryItem,
warning:
inventoryItem.CurrentStock <= inventoryItem.LowStockThreshold
? `Warning: ${inventoryItem.ProductName} is running low (${inventoryItem.CurrentStock} units remaining)`
: null,
});
});
// Delete inventory item
app.delete("/restaurants/:name/inventory/:productId", (req, res) => {
const restaurantName = req.params.name;
const productId = parseInt(req.params.productId);
// Check if restaurant exists
const restaurant = restaurants.find(
(r) => r.RestaurantName.toLowerCase() === restaurantName.toLowerCase()
);
if (!restaurant) {
return res.status(404).json({ message: "Restaurant not found" });
}
// Find and remove inventory item
const itemIndex = inventory.findIndex(
(item) =>
item.RestaurantName.toLowerCase() === restaurantName.toLowerCase() &&
item.ProductID === productId
);
if (itemIndex === -1) {
return res.status(404).json({
message: "Inventory item not found for this restaurant",
});
}
const deletedItem = inventory[itemIndex];
inventory.splice(itemIndex, 1);
res.json({
message: "Inventory item deleted successfully",
deletedItem: deletedItem,
});
});
