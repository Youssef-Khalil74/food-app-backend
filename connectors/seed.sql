-- ====================================
-- Sample Data (Optional - for testing)
-- ====================================
-- Note: Run this after scripts.sql to populate test data

-- Sample Users (password is 'password123' for all)
INSERT INTO "FoodTruck"."Users"("name", "email", "password", "role", "birthDate")
VALUES('Ahmed Mohamed', 'ahmed@example.com', 'password123', 'customer', '1998-05-15');

INSERT INTO "FoodTruck"."Users"("name", "email", "password", "role", "birthDate")
VALUES('Sara Ali', 'sara@example.com', 'password123', 'truckOwner', '2000-08-22');

INSERT INTO "FoodTruck"."Users"("name", "email", "password", "role", "birthDate")
VALUES('Khaled Hassan', 'khaled@example.com', 'password123', 'truckOwner', '1995-03-10');


-- Sample Trucks
INSERT INTO "FoodTruck"."Trucks"("truckName", "truckLogo", "ownerId", "truckStatus", "orderStatus")
VALUES('Tasty Tacos Truck', '/uploads/taco-logo.png', 2, 'available', 'available');

INSERT INTO "FoodTruck"."Trucks"("truckName", "truckLogo", "ownerId", "truckStatus", "orderStatus")
VALUES('Burger Paradise', '/uploads/burger-logo.png', 3, 'available', 'available');


-- Sample Menu Items for Truck 1
INSERT INTO "FoodTruck"."MenuItems"("truckId", "name", "description", "price", "category", "status")
VALUES(1, 'Beef Taco', 'Delicious beef taco with cheese and salsa', 25.00, 'Main Course', 'available');

INSERT INTO "FoodTruck"."MenuItems"("truckId", "name", "description", "price", "category", "status")
VALUES(1, 'Chicken Burrito', 'Grilled chicken burrito with vegetables', 35.50, 'Main Course', 'available');

INSERT INTO "FoodTruck"."MenuItems"("truckId", "name", "description", "price", "category", "status")
VALUES(1, 'Nachos', 'Crispy nachos with cheese sauce', 20.00, 'Sides', 'available');

INSERT INTO "FoodTruck"."MenuItems"("truckId", "name", "description", "price", "category", "status")
VALUES(1, 'Horchata', 'Traditional Mexican rice drink', 15.00, 'Beverages', 'available');


-- Sample Menu Items for Truck 2
INSERT INTO "FoodTruck"."MenuItems"("truckId", "name", "description", "price", "category", "status")
VALUES(2, 'Classic Burger', 'Juicy beef patty with special sauce', 42.00, 'Main Course', 'available');

INSERT INTO "FoodTruck"."MenuItems"("truckId", "name", "description", "price", "category", "status")
VALUES(2, 'Cheese Fries', 'Fries topped with melted cheddar', 18.00, 'Sides', 'available');

INSERT INTO "FoodTruck"."MenuItems"("truckId", "name", "description", "price", "category", "status")
VALUES(2, 'Chicken Wings', 'Spicy buffalo chicken wings', 38.00, 'Main Course', 'available');

INSERT INTO "FoodTruck"."MenuItems"("truckId", "name", "description", "price", "category", "status")
VALUES(2, 'Milkshake', 'Creamy chocolate milkshake', 22.00, 'Beverages', 'available');


-- Sample Inventory
INSERT INTO "FoodTruck"."Inventory"("itemId", "quantity", "lowStockThreshold")
VALUES(1, 50, 10);

INSERT INTO "FoodTruck"."Inventory"("itemId", "quantity", "lowStockThreshold")
VALUES(2, 30, 10);

INSERT INTO "FoodTruck"."Inventory"("itemId", "quantity", "lowStockThreshold")
VALUES(3, 40, 15);

INSERT INTO "FoodTruck"."Inventory"("itemId", "quantity", "lowStockThreshold")
VALUES(4, 25, 10);

INSERT INTO "FoodTruck"."Inventory"("itemId", "quantity", "lowStockThreshold")
VALUES(5, 35, 10);

INSERT INTO "FoodTruck"."Inventory"("itemId", "quantity", "lowStockThreshold")
VALUES(6, 45, 15);

INSERT INTO "FoodTruck"."Inventory"("itemId", "quantity", "lowStockThreshold")
VALUES(7, 28, 10);

INSERT INTO "FoodTruck"."Inventory"("itemId", "quantity", "lowStockThreshold")
VALUES(8, 20, 10);



