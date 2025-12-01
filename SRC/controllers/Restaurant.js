// RESTAURANTS
// =========================================
// Get all restaurants
app.get("/restaurants", (req, res) => {
res.json(restaurants);
});
// Get restaurant by name
app.get("/restaurants/:name", (req, res) => {
const restaurant = restaurants.find(
(r) => r.RestaurantName.toLowerCase() === req.params.name.toLowerCase()
);
if (!restaurant)
return res.status(404).json({ message: "Restaurant not found" });
res.json(restaurant);
});
// Add new restaurant (with file upload support)
app.post("/restaurants", upload.single("photo"), (req, res) => {
const { RestaurantName, FoodItems } = req.body;
// Validate required fields
if (!RestaurantName || RestaurantName.trim() === "") {
// If file was uploaded but validation fails, delete it
if (req.file) {
fs.unlinkSync(req.file.path);
}
return res
.status(400)
.json({ message: "RestaurantName is required and cannot be empty" });
}
// Check if restaurant already exists (RestaurantName is primary key)
const existingRestaurant = restaurants.find(
(r) => r.RestaurantName.toLowerCase() === RestaurantName.toLowerCase()
);
if (existingRestaurant) {
// If file was uploaded but restaurant exists, delete it
if (req.file) {
fs.unlinkSync(req.file.path);
}
return res.status(409).json({
message: "Restaurant with this name already exists",
restaurant: existingRestaurant,
});
}
// Handle photo: either uploaded file or URL
let photoPath = null;
if (req.file) {
// File was uploaded, use the file path
photoPath = `/uploads/${req.file.filename}`;
} else if (req.body.Photo) {
// URL was provided
photoPath = req.body.Photo;
}
// Create new restaurant object
const newRestaurant = {
RestaurantName: RestaurantName.trim(),
FoodItems: FoodItems || null,
Photo: photoPath,
};
restaurants.push(newRestaurant);
res.status(201).json({
message: "Restaurant added successfully",
restaurant: newRestaurant,
});
});
// Update restaurant photo (file upload)
app.put("/restaurants/:name/photo", upload.single("photo"), (req, res) => {
const restaurantName = req.params.name;
const restaurant = restaurants.find(
(r) => r.RestaurantName.toLowerCase() === restaurantName.toLowerCase()
);
if (!restaurant) {
// If file was uploaded but restaurant not found, delete it
if (req.file) {
fs.unlinkSync(req.file.path);
}
return res.status(404).json({ message: "Restaurant not found" });
}
if (!req.file) {
return res.status(400).json({ message: "No photo file provided" });
}
// Delete old photo file if it exists and is a local file
if (restaurant.Photo && restaurant.Photo.startsWith("/uploads/")) {
const oldPhotoPath = path.join(__dirname, restaurant.Photo);
if (fs.existsSync(oldPhotoPath)) {
fs.unlinkSync(oldPhotoPath);
}
}
// Update restaurant photo
restaurant.Photo = `/uploads/${req.file.filename}`;
res.json({
message: "Restaurant photo updated successfully",
restaurant: restaurant,
});
});
// Delete restaurant
app.delete("/restaurants/:name", (req, res) => {
const restaurantName = req.params.name;
const index = restaurants.findIndex(
(r) => r.RestaurantName.toLowerCase() === restaurantName.toLowerCase()
);
if (index === -1)
return res.status(404).json({ message: "Restaurant not found" });
restaurants.splice(index, 1);
res.json({ message: "Restaurant deleted successfully" });
});
//
