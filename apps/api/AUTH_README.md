# Authentication API

## Overview
Complete authentication system with JWT tokens, password hashing, and role-based access control.

## Endpoints

### 1. Register User
```
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe" // optional
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "USER"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 2. Login User
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "USER"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 3. Get Profile (Protected)
```
GET /api/auth/profile
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "USER",
    "createdAt": "2026-02-03T10:00:00.000Z"
  }
}
```

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Email and password are required"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

### 409 Conflict
```json
{
  "success": false,
  "message": "Email already registered"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Internal server error"
}
```

## Features

- ✅ Password hashing with bcrypt (salt rounds: 10)
- ✅ JWT token authentication
- ✅ Email validation
- ✅ Password strength validation (min 6 characters)
- ✅ Protected routes with middleware
- ✅ Role-based access control (USER/ADMIN)
- ✅ Error handling and validation
- ✅ Token expiration (7 days default)

## Environment Variables

Create a `.env` file in `apps/api/`:

```env
DATABASE_URL="mysql://user:password@localhost:3306/robohatch"
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_EXPIRES_IN="7d"
PORT=5000
NODE_ENV="development"
```

## Database Schema

The User model (already exists in schema.prisma):
```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String
  name      String?
  role      Role     @default(USER)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  orders    Order[]
  uploads   Upload[]
}

enum Role {
  USER
  ADMIN
}
```

## Usage with Frontend

### 1. Register/Login
```typescript
const response = await fetch('http://localhost:5000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});

const { data } = await response.json();
// Store token in localStorage or cookies
localStorage.setItem('token', data.token);
```

### 2. Protected Requests
```typescript
const token = localStorage.getItem('token');

const response = await fetch('http://localhost:5000/api/auth/profile', {
  headers: { 
    'Authorization': `Bearer ${token}`
  }
});
```

## Middleware

### authMiddleware
Protects routes by verifying JWT token:
```typescript
import { authMiddleware } from '../middlewares/auth.middleware';

router.get('/protected', authMiddleware, controller.method);
```

### adminMiddleware
Restricts routes to admin users only:
```typescript
import { authMiddleware, adminMiddleware } from '../middlewares/auth.middleware';

router.delete('/users/:id', authMiddleware, adminMiddleware, controller.deleteUser);
```

## Testing

1. Run the API server:
```bash
cd apps/api
npm run dev
```

2. Test with curl:
```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","name":"Test User"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Get Profile (replace TOKEN with actual token)
curl http://localhost:5000/api/auth/profile \
  -H "Authorization: Bearer TOKEN"
```

## Security Best Practices

1. **Never commit** `.env` file to version control
2. Use strong, random JWT_SECRET in production
3. Enable HTTPS in production
4. Implement rate limiting for login/register endpoints
5. Add refresh token mechanism for better security
6. Consider adding 2FA for sensitive operations
7. Implement password reset functionality
8. Add account verification via email
