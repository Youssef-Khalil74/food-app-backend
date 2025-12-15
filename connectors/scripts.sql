-- ====================================
-- GIU Food Truck Management System
-- Database Schema Script
-- ====================================
-- Create new schema FoodTruck inside postgres database
-- Create these tables inside postgres using pgAdmin4
-- ====================================


-- Drop tables if they exist (in reverse order due to foreign key constraints)
DROP TABLE IF EXISTS "FoodTruck"."Notifications";
DROP TABLE IF EXISTS "FoodTruck"."Inventory";
DROP TABLE IF EXISTS "FoodTruck"."Pickups";
DROP TABLE IF EXISTS "FoodTruck"."Sessions";
DROP TABLE IF EXISTS "FoodTruck"."Carts";
DROP TABLE IF EXISTS "FoodTruck"."OrderItems";
DROP TABLE IF EXISTS "FoodTruck"."Orders";
DROP TABLE IF EXISTS "FoodTruck"."MenuItems";
DROP TABLE IF EXISTS "FoodTruck"."Trucks";
DROP TABLE IF EXISTS "FoodTruck"."Users";

-- FoodTruck schema
CREATE SCHEMA IF NOT EXISTS "FoodTruck";

-- ====================================
-- CORE TABLES (From Milestone)
-- ====================================

-- Users Table
CREATE TABLE IF NOT EXISTS "FoodTruck"."Users"(
    "userId" SERIAL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL UNIQUE,
    "password" TEXT NOT NULL,
    "role" TEXT DEFAULT 'customer',
    "birthDate" DATE DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- Trucks Table
CREATE TABLE IF NOT EXISTS "FoodTruck"."Trucks"(
    "truckId" SERIAL PRIMARY KEY,
    "truckName" TEXT NOT NULL UNIQUE,
    "truckLogo" TEXT,
    "ownerId" INTEGER NOT NULL,
    "truckStatus" TEXT DEFAULT 'available',
    "orderStatus" TEXT DEFAULT 'available',
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("ownerId") REFERENCES "FoodTruck"."Users"("userId") ON DELETE CASCADE
);


-- MenuItems Table
CREATE TABLE IF NOT EXISTS "FoodTruck"."MenuItems"(
    "itemId" SERIAL PRIMARY KEY,
    "truckId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" NUMERIC(10,2) NOT NULL,
    "category" TEXT NOT NULL,
    "status" TEXT DEFAULT 'available',
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("truckId") REFERENCES "FoodTruck"."Trucks"("truckId") ON DELETE CASCADE
);


-- Orders Table
CREATE TABLE IF NOT EXISTS "FoodTruck"."Orders"(
    "orderId" SERIAL PRIMARY KEY,
    "userId" INTEGER NOT NULL,
    "truckId" INTEGER NOT NULL,
    "orderStatus" TEXT NOT NULL DEFAULT 'pending',
    "totalPrice" NUMERIC(10,2) NOT NULL,
    "scheduledPickupTime" TIMESTAMP,
    "estimatedEarliestPickup" TIMESTAMP,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("userId") REFERENCES "FoodTruck"."Users"("userId") ON DELETE CASCADE,
    FOREIGN KEY ("truckId") REFERENCES "FoodTruck"."Trucks"("truckId") ON DELETE CASCADE
);


-- OrderItems Table
CREATE TABLE IF NOT EXISTS "FoodTruck"."OrderItems"(
    "orderItemId" SERIAL PRIMARY KEY,
    "orderId" INTEGER NOT NULL,
    "itemId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" NUMERIC(10,2) NOT NULL,
    FOREIGN KEY ("orderId") REFERENCES "FoodTruck"."Orders"("orderId") ON DELETE CASCADE,
    FOREIGN KEY ("itemId") REFERENCES "FoodTruck"."MenuItems"("itemId") ON DELETE CASCADE
);


-- Carts Table
CREATE TABLE IF NOT EXISTS "FoodTruck"."Carts"(
    "cartId" SERIAL PRIMARY KEY,
    "userId" INTEGER NOT NULL,
    "itemId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price" NUMERIC(10,2) NOT NULL,
    FOREIGN KEY ("userId") REFERENCES "FoodTruck"."Users"("userId") ON DELETE CASCADE,
    FOREIGN KEY ("itemId") REFERENCES "FoodTruck"."MenuItems"("itemId") ON DELETE CASCADE
);


-- Sessions Table
CREATE TABLE IF NOT EXISTS "FoodTruck"."Sessions"(
    "id" SERIAL PRIMARY KEY,
    "userId" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("userId") REFERENCES "FoodTruck"."Users"("userId") ON DELETE CASCADE
);


-- ====================================
-- ADDITIONAL TABLES (For Extra Features)
-- ====================================

-- Pickups Table (for pickup management)
CREATE TABLE IF NOT EXISTS "FoodTruck"."Pickups"(
    "pickupId" SERIAL PRIMARY KEY,
    "orderId" INTEGER NOT NULL UNIQUE,
    "pickupStatus" TEXT DEFAULT 'scheduled',
    "scheduledTime" TIMESTAMP,
    "completedAt" TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("orderId") REFERENCES "FoodTruck"."Orders"("orderId") ON DELETE CASCADE
);


-- Inventory Table (for stock tracking)
CREATE TABLE IF NOT EXISTS "FoodTruck"."Inventory"(
    "inventoryId" SERIAL PRIMARY KEY,
    "itemId" INTEGER NOT NULL UNIQUE,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "lowStockThreshold" INTEGER DEFAULT 10,
    "lastRestocked" TIMESTAMP,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("itemId") REFERENCES "FoodTruck"."MenuItems"("itemId") ON DELETE CASCADE
);


-- Notifications Table (for user notifications)
CREATE TABLE IF NOT EXISTS "FoodTruck"."Notifications"(
    "notificationId" SERIAL PRIMARY KEY,
    "userId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN DEFAULT FALSE,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("userId") REFERENCES "FoodTruck"."Users"("userId") ON DELETE CASCADE
);


-- ====================================
-- INDEXES (for performance)
-- ====================================
CREATE INDEX IF NOT EXISTS "idx_orders_userId" ON "FoodTruck"."Orders"("userId");
CREATE INDEX IF NOT EXISTS "idx_orders_truckId" ON "FoodTruck"."Orders"("truckId");
CREATE INDEX IF NOT EXISTS "idx_orderItems_orderId" ON "FoodTruck"."OrderItems"("orderId");
CREATE INDEX IF NOT EXISTS "idx_menuItems_truckId" ON "FoodTruck"."MenuItems"("truckId");
CREATE INDEX IF NOT EXISTS "idx_carts_userId" ON "FoodTruck"."Carts"("userId");
CREATE INDEX IF NOT EXISTS "idx_sessions_token" ON "FoodTruck"."Sessions"("token");
CREATE INDEX IF NOT EXISTS "idx_notifications_userId" ON "FoodTruck"."Notifications"("userId");



