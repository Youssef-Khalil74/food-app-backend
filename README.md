# Food Truck Backend API

GIU Food Truck Management System - Backend API Server

## Features

- **User Management**: Registration, login, profile management
- **Restaurant/Truck Management**: CRUD operations for food trucks
- **Food/Menu Management**: Add/update/delete menu items
- **Shopping Cart**: Full cart functionality with inventory checking
- **Orders**: Order creation, status tracking, history
- **Pickups**: Schedule and manage order pickups
- **Inventory**: Track stock levels, low stock alerts
- **Notifications**: Real-time notifications for orders and updates
- **Habits**: Personalized recommendations based on order history
- **Payment**: Payment processing and refunds

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL with `FoodTruck` schema
- **ORM**: Knex.js
- **Authentication**: Session-based with cookies

## Project Structure

```
food-truck-backend/
├── connectors/
│   ├── db.js           # Database connection
│   ├── scripts.sql     # Database schema
│   └── seed.sql        # Sample data
├── middleware/
│   ├── auth.js         # Authentication middleware
│   └── upload.js       # File upload (multer)
├── routes/
│   ├── public/
│   │   ├── api.js      # Public routes index
│   │   └── registration.js  # Register & login
│   └── private/
│       ├── api.js          # Private routes index
│       ├── account.js      # User profile management
│       ├── restaurant.js   # Truck CRUD operations
│       ├── food.js         # Menu item management
│       ├── cart.js         # Shopping cart
│       ├── order.js        # Order management
│       ├── pickup.js       # Pickup scheduling
│       ├── inventory.js    # Stock management
│       ├── notification.js # User notifications
│       ├── habits.js       # Recommendations/habits
│       └── payment.js      # Payment processing
├── utils/
│   └── session.js      # Session helper functions
├── uploads/            # Uploaded images
├── server.js           # Main application
├── package.json
└── .env.example
```

## Setup

### Prerequisites

- Node.js (v18+)
- PostgreSQL
- pgAdmin4 (recommended)

### Installation

1. **Clone and install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your database credentials:
   ```
   PASSWORD=your_postgres_password
   ```

3. **Create database schema**:
   - Open pgAdmin4
   - Connect to your PostgreSQL server
   - Run `connectors/scripts.sql` to create the FoodTruck schema
   - (Optional) Run `connectors/seed.sql` for sample data

4. **Start the server**:
   ```bash
   npm run dev    # Development with nodemon
   npm start      # Production
   ```

## API Endpoints

### Public Endpoints (No Authentication)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/registration` | Register new user |
| POST | `/api/v1/registration/login` | Login |
| GET | `/api/v1/registration` | Get all users |
| GET | `/api/v1/trucks` | List all trucks |
| GET | `/api/v1/trucks/:id` | Get truck with menu |
| GET | `/api/v1/trucks/:id/menu` | Get truck menu |
| GET | `/api/v1/menu/:itemId` | Get menu item |
| GET | `/api/v1/categories` | List categories |
| GET | `/api/v1/search?q=` | Search |
| GET | `/api/v1/popular` | Popular items |

### Private Endpoints (Require Authentication)

#### Account (`/api/v1/account`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/account` | Get profile |
| PUT | `/account` | Update profile |
| PUT | `/account/email` | Update email |
| PUT | `/account/password` | Change password |
| PUT | `/account/name` | Update name |
| POST | `/account/logout` | Logout |
| DELETE | `/account` | Delete account |

#### Restaurant (`/api/v1/restaurant`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/restaurant` | Get all trucks |
| GET | `/restaurant/my-trucks` | Get my trucks (owner) |
| GET | `/restaurant/:truckId` | Get truck details |
| POST | `/restaurant` | Create truck (owner) |
| PUT | `/restaurant/:truckId` | Update truck (owner) |
| DELETE | `/restaurant/:truckId` | Delete truck (owner) |
| GET | `/restaurant/:truckId/orders` | Get truck orders (owner) |

#### Food (`/api/v1/food`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/food` | Get all food items |
| GET | `/food/:itemId` | Get food item details |
| POST | `/food` | Add food item (owner) |
| PUT | `/food/:itemId` | Update food item (owner) |
| DELETE | `/food/:itemId` | Delete food item (owner) |
| GET | `/food/category/:category` | Get items by category |

#### Cart (`/api/v1/cart`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/cart` | Get cart |
| POST | `/cart` | Add to cart |
| PUT | `/cart/:cartId` | Update quantity |
| DELETE | `/cart/:cartId` | Remove item |
| DELETE | `/cart` | Clear cart |

#### Order (`/api/v1/order`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/order` | List orders |
| GET | `/order/:orderId` | Order details |
| POST | `/order` | Create order |
| PUT | `/order/:orderId` | Update status (owner) |
| DELETE | `/order/:orderId` | Cancel order |
| GET | `/order/:orderId/items` | Get order items |

#### Pickup (`/api/v1/pickup`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/pickup` | List pickups |
| GET | `/pickup/:pickupId` | Pickup details |
| POST | `/pickup` | Schedule pickup |
| PUT | `/pickup/:pickupId` | Update pickup |
| DELETE | `/pickup/:pickupId` | Cancel pickup |

#### Inventory (`/api/v1/inventory`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/inventory` | Get all inventory (owner) |
| GET | `/inventory/truck/:truckId` | Truck inventory |
| GET | `/inventory/:itemId` | Item inventory |
| PUT | `/inventory/:itemId` | Update stock |
| POST | `/inventory/restock` | Bulk restock |
| GET | `/inventory/alerts/low-stock` | Low stock items |

#### Notification (`/api/v1/notification`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/notification` | Get notifications |
| GET | `/notification/count` | Unread count |
| GET | `/notification/:id` | Get notification |
| PUT | `/notification/:id` | Mark read |
| PUT | `/notification/read/all` | Mark all read |
| DELETE | `/notification/:id` | Delete notification |
| DELETE | `/notification` | Delete read |

#### Habits (`/api/v1/habits`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/habits` | Get recommendations |
| GET | `/habits/quick-reorder` | Quick reorder items |
| GET | `/habits/history` | Order history with stats |
| GET | `/habits/top-items` | Top ordered items |

#### Payment (`/api/v1/payment`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/payment` | Process payment |
| GET | `/payment/:orderId` | Payment status |
| POST | `/payment/:orderId/refund` | Request refund (owner) |

## Authentication

The API uses session-based authentication with cookies:

1. **Login**: POST to `/api/v1/registration/login` with email/password
2. **Cookie**: Server sets `session_token` cookie
3. **Requests**: Include the cookie in subsequent requests
4. **API Clients**: Can also pass token via `Authorization` header

## Database Schema

The application uses a PostgreSQL `FoodTruck` schema with:

- **Users**: Customer and truck owner accounts
- **Trucks**: Food truck information
- **MenuItems**: Menu items per truck
- **Orders**: Customer orders
- **OrderItems**: Items within orders
- **Carts**: Shopping cart items
- **Sessions**: User sessions
- **Pickups**: Pickup scheduling
- **Inventory**: Stock management
- **Notifications**: User notifications

## User Roles

- **customer**: Can browse, order, and manage their cart/orders
- **truckOwner**: Can manage trucks, menus, inventory, and view orders

## File Mapping (Original → New)

| Original File | New File |
|---------------|----------|
| `SRC/controllers/registration.js` | `routes/public/registration.js` |
| `SRC/controllers/account.js` | `routes/private/account.js` |
| `SRC/controllers/restaurant.js` | `routes/private/restaurant.js` |
| `SRC/controllers/food.js` | `routes/private/food.js` |
| `SRC/controllers/cart.js` | `routes/private/cart.js` |
| `SRC/controllers/order.js` | `routes/private/order.js` |
| `SRC/controllers/pickup.js` | `routes/private/pickup.js` |
| `SRC/controllers/inventory.js` | `routes/private/inventory.js` |
| `SRC/controllers/notification.js` | `routes/private/notification.js` |
| `SRC/controllers/habits.js` | `routes/private/habits.js` |
| `SRC/controllers/payment.js` | `routes/private/payment.js` |
