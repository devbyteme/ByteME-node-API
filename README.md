# ByteMe Node API

A Node.js API for restaurant vendor management built with Express and MongoDB.

## Features

- MongoDB connection with Mongoose
- Vendor (Restaurant) registration and management
- User registration and management
- Authentication system for both vendors and users
- Password hashing with bcryptjs
- RESTful API endpoints
- Input validation and error handling
- CORS enabled

## Prerequisites

- Node.js (v14 or higher)
- MongoDB Atlas account
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd ByteMe-Node-API
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```env
# Server Configuration
PORT=3000
NODE_ENV=development

# MongoDB Configuration
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/byteme?retryWrites=true&w=majority
```

4. Run the application:
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## API Endpoints

### Authentication

#### Vendor Authentication
- **POST** `/api/auth/vendor/register` - Register a new vendor
- **POST** `/api/auth/vendor/login` - Login vendor

#### User Authentication
- **POST** `/api/auth/user/register` - Register a new user
- **POST** `/api/auth/user/login` - Login user

#### General Authentication
- **GET** `/api/auth/profile` - Get current profile
- **PUT** `/api/auth/change-password` - Change password

### Vendors (Restaurants)

#### Register a new vendor
- **POST** `/api/auth/vendor/register`
- **Body:**
```json
{
  "name": "Restaurant Name",
  "email": "restaurant@example.com",
  "password": "password123",
  "location": {
    "address": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001"
  },
  "phone": "+1-555-123-4567",
  "cuisine": "Italian",
  "description": "Authentic Italian cuisine",
  "openingHours": {
    "monday": {"open": "09:00", "close": "22:00"},
    "tuesday": {"open": "09:00", "close": "22:00"}
  }
}
```

#### Vendor Management
- **GET** `/api/vendors` - Get all vendors
- **GET** `/api/vendors/:id` - Get vendor by ID
- **PUT** `/api/vendors/:id` - Update vendor
- **DELETE** `/api/vendors/:id` - Delete vendor (soft delete)

### Users (Customers)

#### Register a new user
- **POST** `/api/auth/user/register`
- **Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "password123",
  "phone": "+1-555-123-4567",
  "address": {
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001"
  }
}
```

#### User Management
- **GET** `/api/users` - Get all users
- **GET** `/api/users/:id` - Get user by ID
- **PUT** `/api/users/:id` - Update user profile
- **DELETE** `/api/users/:id` - Delete user (soft delete)
- **GET** `/api/users/:id/preferences` - Get user preferences
- **PUT** `/api/users/:id/preferences` - Update user preferences

## Models

### Vendor Model Fields
- `name` - Restaurant name (required)
- `email` - Email address (required, unique)
- `password` - Password (required, min 6 chars)
- `location` - Address details (required)
- `phone` - Phone number (required)
- `cuisine` - Type of cuisine (required)
- `description` - Restaurant description (optional)
- `openingHours` - Operating hours for each day
- `isActive` - Vendor status
- `rating` - Average rating (0-5)
- `totalReviews` - Number of reviews
- `images` - Array of image URLs
- `documents` - Business documents/licenses
- `createdAt` - Registration date
- `updatedAt` - Last update date

### User Model Fields
- `firstName` - First name (required)
- `lastName` - Last name (required)
- `email` - Email address (required, unique)
- `password` - Password (required, min 6 chars)
- `phone` - Phone number (optional)
- `address` - Address details (optional)
- `profileImage` - Profile picture URL
- `isActive` - User status
- `isEmailVerified` - Email verification status
- `lastLogin` - Last login timestamp
- `preferences` - User preferences and settings
- `createdAt` - Registration date
- `updatedAt` - Last update date

## Project Structure

```
├── config/
│   └── database.js          # MongoDB connection
├── controllers/
│   ├── authController.js    # Authentication logic
│   ├── vendorController.js  # Vendor management logic
│   └── userController.js    # User management logic
├── models/
│   ├── Vendor.js           # Vendor data model
│   └── User.js             # User data model
├── routes/
│   ├── authRoutes.js       # Authentication routes
│   ├── vendorRoutes.js     # Vendor management routes
│   └── userRoutes.js       # User management routes
├── index.js                # Main server file
├── package.json
└── README.md
```

## Development

The application uses:
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **bcryptjs** - Password hashing
- **cors** - Cross-origin resource sharing
- **dotenv** - Environment variables

## Error Handling

The API includes comprehensive error handling for:
- Validation errors
- Duplicate email addresses
- Invalid MongoDB ObjectIds
- Database connection issues
- General server errors

## Security Features

- Password hashing with bcryptjs
- Input validation and sanitization
- CORS configuration
- Environment variable management
- No sensitive data exposure in responses
- Separate authentication and management endpoints 