# On-Time Food Truck Application - Complete Functionalities

## 📋 Overview

**On-Time** is a comprehensive food truck management system that connects customers with food trucks, allowing online ordering, menu management, and order tracking. The system supports three user roles: **Customer**, **Truck Owner**, and **Admin**.

---

## 🔐 1. Authentication & User Management

### 1.1 User Registration
- Create new account with name, email, password, and birth date
- Choose account type: **Customer** or **Truck Owner**
- Email uniqueness validation
- Automatic redirect to login after successful registration

### 1.2 User Login
- Email and password authentication
- Session token generation (valid for 5 hours)
- Cookie-based session management
- Role-based redirection after login:
  - Customers → Customer Dashboard
  - Truck Owners → Owner Dashboard
  - Admins → Admin Dashboard

### 1.3 User Logout
- Session invalidation
- Cookie clearance
- Redirect to login page

---

## 👤 2. Account Management

### 2.1 Profile Viewing
- View personal information (name, email, birth date)
- View account statistics:
  - **Customers**: Total orders placed, total money spent
  - **Truck Owners**: Total orders received, total money earned
- View member since date

### 2.2 Profile Editing
- Update name
- Update email (with password verification)
- Update birth date
- Change password (requires current password confirmation)

### 2.3 Account Deletion
- Password verification required
- Confirmation required (type "DELETE")
- Prevents deletion if truck owner has active orders
- Cascading deletion of all user data

---

## 🍔 3. Customer Features

### 3.1 Customer Dashboard
- Welcome message with personalized greeting
- **Habits Section**: Display favorite/most ordered items
- **Available Trucks**: Browse all available food trucks
- **Specials & Announcements**: View current promotions
- **How It Works**: Step-by-step ordering guide

### 3.2 Browse Food Trucks
- View all available food trucks with status
- Search trucks by name
- Filter by availability status
- View truck details and logos

### 3.3 Truck Menu Viewing
- View complete menu for selected truck
- Filter menu items by category (Main Course, Sides, Beverages, etc.)
- See item details: name, description, price, category
- Check item availability status

### 3.4 Shopping Cart
- Add items to cart with quantity selection
- View cart items grouped by truck
- Update item quantities
- Remove individual items
- Clear entire cart
- View cart totals (items, quantity, price)
- Inventory validation before adding

### 3.5 Order Placement
- Place orders from cart items
- Check truck availability before ordering
- Schedule pickup time (optional)
- Automatic estimated pickup time (20 minutes)
- Automatic inventory deduction
- Cart clearing after order
- Order confirmation with details

### 3.6 Order Management (My Orders)
- View all personal orders
- Filter orders by status:
  - Pending
  - Confirmed
  - Preparing
  - Ready
  - Completed
  - Cancelled
- View order details (items, prices, truck info)
- Cancel pending orders (with inventory restoration)

### 3.7 Pickup Scheduling
- Schedule pickup time for orders
- Add pickup notes
- View scheduled pickups
- Reschedule pickups
- Cancel scheduled pickups

---

## 🚚 4. Truck Owner Features

### 4.1 Owner Dashboard
- View truck name and status
- Toggle order acceptance (Available/Not Accepting)
- View pending orders count
- Quick access to:
  - Add Menu Item
  - Manage Menu
  - View Orders
- View recent orders summary

### 4.2 Menu Management
- **Add Menu Items**:
  - Item name (required)
  - Category (required): Main Course, Sides, Beverages, Desserts, Snacks
  - Description (optional)
  - Price in EGP (required)
  - Automatic inventory entry creation (100 stock)

- **Edit Menu Items**:
  - Update name, description, price, category
  - Change item status (available/unavailable)

- **Delete Menu Items**:
  - Remove items from menu
  - Cascading deletion of related data

### 4.3 Order Management (Truck Orders)
- View all orders for owned truck(s)
- Filter by status: All Active, Pending, Ready
- Sort by: Pickup Time, Order Time
- View order details:
  - Customer name and email
  - Order items with quantities
  - Total price
  - Order status
- Update order status:
  - Pending → Confirmed → Preparing → Ready → Completed
  - Cancel orders (restores inventory)
- View completed orders history

### 4.4 Inventory Management
- View all inventory items with stock levels
- See inventory alerts:
  - Low stock warning (below threshold)
  - Out of stock notification
- Update inventory quantities:
  - Set absolute quantity
  - Make relative adjustments (+/-)
- Set low stock threshold per item
- Bulk restock multiple items
- Automatic item status update based on stock:
  - 0 stock → item becomes unavailable
  - Restocked → item becomes available

### 4.5 Truck Status Management
- Toggle truck availability status
- Toggle order acceptance status:
  - Available (accepting orders)
  - Unavailable (not accepting)
  - Busy (temporarily unavailable)

---

## 👑 5. Admin Features

### 5.1 Admin Dashboard
- View system statistics:
  - Total users count
  - Total food trucks count
  - Total orders count
- User role filter buttons

### 5.2 User Management
- View all registered users
- Filter users by role (Customers, Truck Owners, Admins)
- View user details (name, email, role, join date)
- Update user roles

### 5.3 Food Truck Management
- **Create Food Trucks**:
  - Assign truck name
  - Assign to existing truck owner
  - Validation: owner must have truckOwner role
  - Duplicate name prevention

- **View All Trucks**:
  - See truck name, owner, status
  - View truck details

- **Delete Trucks**:
  - Remove trucks from system
  - Cascading deletion of menu items, orders, etc.

### 5.4 Menu Item Management (Admin)
- Add menu items to any truck
- Specify: truck, name, description, price, category
- Delete any menu item

---

## 🔔 6. Notification System

### 6.1 Notification Types
- **New Order**: Truck owner notified when customer places order
- **Order Update**: Customer notified when order status changes
- **Pickup Scheduled**: Truck owner notified of scheduled pickup
- **Pickup Update**: Both parties notified of pickup status changes

### 6.2 Notification Management
- View all notifications
- Filter unread notifications
- Mark individual as read/unread
- Mark all as read
- Delete individual notifications
- Delete all read notifications
- Delete all notifications

---

## 📊 7. Habits & Recommendations

### 7.1 Personalized Recommendations
- **Your Favorites**: Most ordered items based on history
- **Favorite Trucks**: Most frequently ordered from trucks
- **You Might Like**: Popular items user hasn't tried
- **Category Recommendations**: Items from favorite category

### 7.2 Quick Reorder
- View last order items for quick reordering
- View most frequently ordered items

### 7.3 Order History & Statistics
- Complete order history with pagination
- Order statistics:
  - Total orders placed
  - Total amount spent
  - Average order value
- View order items for each past order

---

## 🔍 8. Public Features (No Login Required)

### 8.1 Browse Trucks (Public)
- View all available food trucks
- View truck details and menu

### 8.2 Search
- Search trucks by name
- Search menu items by name, description, or category
- Combined search results

### 8.3 Categories
- View all food categories
- Browse items by category

### 8.4 Popular Items
- View most popular items across all trucks

### 8.5 Specials
- View current specials and announcements

---

## 🛠️ 9. Technical Features

### 9.1 Session Management
- UUID-based session tokens
- 5-hour session expiry
- Cookie and Authorization header support
- Automatic session cleanup

### 9.2 File Upload
- Image upload for truck logos
- 5MB file size limit
- Supported formats: JPEG, PNG, GIF, WebP
- Automatic file cleanup on errors

### 9.3 Database
- PostgreSQL database
- FoodTruck schema with tables:
  - Users, Sessions
  - Trucks, MenuItems, Inventory
  - Carts, Orders, OrderItems
  - Pickups, Notifications, Specials

### 9.4 API Structure
- RESTful API design
- Base URL: `/api/v1`
- Public endpoints (no auth required)
- Private endpoints (auth required)
- Role-based access control

---

## 📱 10. Pages Summary

| Page | URL | Access | Description |
|------|-----|--------|-------------|
| Login | `/` | Public | User login form |
| Register | `/register` | Public | New user registration |
| Customer Dashboard | `/dashboard` | Customer | Main customer home page |
| Browse Trucks | `/trucks` | Customer | View all food trucks |
| Truck Menu | `/truckMenu/:id` | Customer | View truck menu & add to cart |
| Shopping Cart | `/cart` | Customer | View and manage cart |
| My Orders | `/myOrders` | Customer | View order history |
| Account | `/account` | All Users | Manage profile settings |
| Owner Dashboard | `/ownerDashboard` | Truck Owner | Main owner home page |
| Menu Items | `/menuItems` | Truck Owner | Manage truck menu |
| Add Menu Item | `/addMenuItem` | Truck Owner | Add new menu item |
| Truck Orders | `/truckOrders` | Truck Owner | Manage incoming orders |
| Admin Dashboard | `/adminDashboard` | Admin | System management |

---

## 🔒 Security Features

1. **Authentication**: Session-based with secure tokens
2. **Authorization**: Role-based access control (RBAC)
3. **Input Validation**: Server-side validation for all inputs
4. **Password Verification**: Required for sensitive operations
5. **Session Expiry**: Automatic session timeout after 5 hours
6. **CORS Configuration**: Controlled cross-origin requests

---

## 📈 Order Flow

```
1. Customer browses trucks and menu items
2. Customer adds items to cart
3. Customer places order (cart → order)
4. Truck owner receives notification
5. Truck owner confirms order → Customer notified
6. Truck owner prepares order → Customer notified
7. Truck owner marks ready → Customer notified
8. Customer picks up order
9. Truck owner marks completed
```

---

*Document generated for On-Time Food Truck Application*
*Total Features: 50+ distinct functionalities across 10 major categories*


