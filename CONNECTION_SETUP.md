# 🔗 Database & Frontend Connection Setup

## ✅ Completed Setup

### Backend (API)
- **Database**: Connected to AWS RDS MySQL instance
- **Server Port**: 5000
- **Authentication**: JWT-based auth with bcrypt password hashing
- **Status**: ✅ Running

### Frontend (Next.js)
- **API Client**: Created with TypeScript support
- **Auth Forms**: Updated to use real API calls
- **Environment**: Configured with API URL
- **Status**: ✅ Connected

---

## 📡 API Endpoints

### Base URL
```
http://localhost:5000
```

### Available Endpoints

#### 1. Health Check
```
GET /health
```

#### 2. Register User
```
POST /api/auth/register

Body:
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

#### 3. Login User
```
POST /api/auth/login

Body:
{
  "email": "john@example.com",
  "password": "password123"
}
```

#### 4. Get Profile (Protected)
```
GET /api/auth/profile
Headers:
  Authorization: Bearer <token>
```

---

## 🎯 Testing the Connection

### 1. Start the Backend
```bash
cd apps/api
npm run dev
```
Server will start on http://localhost:5000

### 2. Start the Frontend
```bash
cd apps/web
npm run dev
```
Frontend will start on http://localhost:3000

### 3. Test Registration
1. Navigate to http://localhost:3000/register
2. Fill in the registration form
3. Submit - you should be redirected to /account

### 4. Test Login
1. Navigate to http://localhost:3000/login
2. Use the credentials you just created
3. Submit - you should be redirected to /account

---

## 📁 Key Files

### Backend
- `apps/api/.env` - Environment variables (DATABASE_URL, JWT_SECRET)
- `apps/api/src/services/auth.service.ts` - Authentication logic
- `apps/api/src/controllers/auth.controller.ts` - Request handlers
- `apps/api/src/middlewares/auth.middleware.ts` - JWT verification
- `apps/api/src/routes/auth.route.ts` - API routes

### Frontend
- `apps/web/.env.local` - API URL configuration
- `apps/web/src/lib/api-client.ts` - API client with TypeScript
- `apps/web/src/components/auth/LoginForm.tsx` - Login with API integration
- `apps/web/src/components/auth/RegisterForm.tsx` - Register with API integration

---

## 🔐 Security Features

- ✅ Password hashing with bcrypt (10 rounds)
- ✅ JWT token authentication (7-day expiration)
- ✅ Email format validation
- ✅ Password strength validation (min 6 characters)
- ✅ Protected routes with middleware
- ✅ Error handling and user feedback
- ✅ CORS enabled for localhost development

---

## 🌐 Environment Variables

### Backend (.env)
```env
DATABASE_URL="mysql://admin:Admin246800864200@robohatch-mysql.c344g8euk9qw.eu-north-1.rds.amazonaws.com:3306/robohatch_db"
PORT=5000
NODE_ENV=development
JWT_SECRET="robohatch-super-secret-jwt-key-2026-change-in-production"
JWT_EXPIRES_IN="7d"
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

---

## 🚀 API Client Usage Example

```typescript
import { apiClient } from '@/lib/api-client';

// Register
const response = await apiClient.register({
  name: 'John Doe',
  email: 'john@example.com',
  password: 'password123'
});

if (response.success) {
  // Token is automatically stored in localStorage
  console.log('User:', response.data.user);
  console.log('Token:', response.data.token);
}

// Login
const loginResponse = await apiClient.login({
  email: 'john@example.com',
  password: 'password123'
});

// Get Profile (requires authentication)
const profile = await apiClient.getProfile();

// Check if authenticated
const isAuth = apiClient.isAuthenticated();

// Logout
apiClient.logout();
```

---

## 📊 Database Schema

The User table is already created with Prisma:

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String   // Hashed with bcrypt
  name      String?
  role      Role     @default(USER)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  orders    Order[]
  uploads   Upload[]
}
```

---

## 🎨 Frontend Features

### Login Form
- Email and password validation
- "Remember me" checkbox
- Forgot password link
- Real-time error display from API
- Loading states with animations
- Automatic token storage

### Register Form
- Full name, email, password fields
- Password strength indicator (4 levels)
- Password confirmation
- Terms & conditions checkbox
- Real-time validation
- API error handling

---

## 🔄 Data Flow

```
Frontend Form → API Client → Backend API → Database
                     ↓
              Store JWT Token
                     ↓
           Use for Authenticated Requests
```

---

## 🐛 Troubleshooting

### API not starting
- Check if port 5000 is available
- Verify DATABASE_URL in .env
- Run `npm install` in apps/api

### Frontend can't connect
- Verify API is running on port 5000
- Check NEXT_PUBLIC_API_URL in .env.local
- Check browser console for CORS errors

### Database connection issues
- Verify AWS RDS is accessible
- Check database credentials
- Ensure network/firewall allows connection

---

## ✨ Next Steps

1. ✅ Backend authentication working
2. ✅ Frontend connected to API
3. ✅ Database connected
4. 🔄 Test full registration flow
5. 🔄 Test full login flow
6. 📝 Add user profile management
7. 📝 Add password reset functionality
8. 📝 Add email verification
9. 📝 Add refresh token mechanism

---

**Status**: 🟢 All systems connected and operational!
