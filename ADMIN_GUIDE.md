# Admin Panel Guide

## Admin Access

### Admin Credentials
- **Email**: `Admin@robohatch.in`
- **Password**: `Admin@123456789090`
- **Role**: `ADMIN`

The admin user is automatically seeded into the database when you run `npm run seed` in the API directory.

## Accessing the Admin Panel

### Admin Login
1. Navigate to http://localhost:3000/login
2. Login with the admin credentials above
3. You will be **automatically redirected to the admin panel** at http://localhost:3000/admin

**Important**: Admin users are restricted to the admin panel only. They cannot access customer-facing pages like products, cart, or checkout. If an admin tries to access these pages, they will be automatically redirected to the admin panel.

## Admin Panel Features

### Dashboard Tab
The dashboard provides an overview of your platform:
- **Total Revenue**: Sum of all paid orders
- **Total Orders**: Total number of orders in the system
- **Pending Orders**: Orders awaiting payment or processing
- **Total Products**: Number of products available

**Quick Stats:**
- Recent Orders list (last 5 orders)
- Product status breakdown (In Stock, Out of Stock, Featured)
- Quick action cards to navigate to different admin sections

### Products Tab
Manage your product catalog:
- **View All Products**: See all products with images, names, categories, prices, and stock status
- **Product Actions**:
  - 👁️ View: See product details
  - ✏️ Edit: Modify product information (upcoming feature)
  - 🗑️ Delete: Remove product from catalog (upcoming feature)
- **Search**: Filter products by name
- **Add New Product**: Create new products (upcoming feature)

### Orders Tab
Manage customer orders:
- **View All Orders**: Complete list of orders with details
- **Order Information**:
  - Order ID (truncated for display)
  - Order date and time
  - Order items with quantities
  - Customer email
  - Total amount
  - Current status
- **Status Management**: Update order status directly from the dropdown:
  - `PENDING`: Order created but not yet paid
  - `PAID`: Payment received, ready for processing
  - `SHIPPED`: Order has been shipped
  - `DELIVERED`: Order delivered to customer
  - `CANCELLED`: Order cancelled
- **View Details**: Navigate to detailed order page

### Upload Approvals Tab
For custom design requests (upcoming feature):
- Review customer-uploaded design files
- Approve or reject custom orders
- Communicate with customers about designs

## Security Features

### Role-Based Access Control
- Admin panel is only accessible to users with `ADMIN` role
- Non-admin users are redirected to home page if they try to access `/admin`
- Unauthenticated users are redirected to login page with return URL
- **Admin users are restricted to admin panel only** - they cannot access customer pages:
  - Home page (`/`)
  - Products page (`/products`)
  - Cart page (`/cart`)
  - Orders page (`/orders`)
  - Any customer-facing pages
- Admin users only see the "Admin" link in navigation, all other links are hidden

### Authentication Guards
- All admin routes check authentication status
- JWT token verification on every API request
- Automatic logout on token expiration

## Order Management Workflow

### Typical Order Flow:
1. **PENDING** → Customer places order but hasn't paid
2. **PAID** → Payment verified, order ready for processing
3. **SHIPPED** → Order has been shipped to customer
4. **DELIVERED** → Customer received the order
5. **CANCELLED** → Order cancelled (can happen from PENDING, PAID, or SHIPPED status)

### Status Change Rules (Backend Enforced):
- From `PENDING`: Can go to `PAID` or `CANCELLED`
- From `PAID`: Can go to `SHIPPED` or `CANCELLED`
- From `SHIPPED`: Can go to `DELIVERED` or `CANCELLED`
- From `DELIVERED`: Cannot change (final status)
- From `CANCELLED`: Cannot change (final status)

## Backend API Endpoints (Admin Access)

All order management endpoints require authentication:

### Get All Orders
```http
GET /api/orders
Authorization: Bearer <token>
Query: ?limit=10&offset=0
```

### Get Single Order
```http
GET /api/orders/:id
Authorization: Bearer <token>
```

### Update Order Status
```http
PUT /api/orders/:id/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "SHIPPED"
}
```

### Get Order Statistics
```http
GET /api/orders/stats
Authorization: Bearer <token>
```

Returns:
```json
{
  "total": 25,
  "pending": 5,
  "paid": 10,
  "shipped": 8,
  "delivered": 2,
  "cancelled": 0,
  "totalRevenue": 15000.00
}
```

## Future Admin Features

### Coming Soon:
- **User Management**: View and manage user accounts, roles, and permissions
- **Product Management**: Full CRUD operations for products
- **Category Management**: Add, edit, delete product categories
- **Reports & Analytics**:
  - Sales reports by date range
  - Popular products dashboard
  - Customer analytics
  - Revenue trends and charts
- **Bulk Operations**: Bulk update prices, stock status, etc.
- **Custom Design Approvals**: Review and approve custom print requests
- **Inventory Management**: Stock tracking and alerts
- **Shipping Integration**: Connect with shipping providers
- **Email Notifications**: Automated order status emails

## Troubleshooting

### Can't Access Admin Panel
**Issue**: Redirected to home page when trying to access `/admin`
**Solution**: 
1. Make sure you're logged in with admin credentials
2. Check that the user role is set to `ADMIN` in the database
3. Clear browser cache and localStorage, then login again

### Orders Not Loading
**Issue**: "Loading orders..." never completes
**Solution**:
1. Check that the backend API is running on port 5000
2. Verify database connection in `apps/api/.env`
3. Check browser console for API errors
4. Ensure JWT token is valid (not expired)

### Status Update Not Working
**Issue**: Order status dropdown doesn't update
**Solution**:
1. Check that you're updating to a valid status transition
2. Verify backend validation rules allow the status change
3. Check browser console for API errors

## Best Practices

### Order Management:
1. Always verify payment before moving order to `PAID` status
2. Update customers when changing order status
3. Only mark as `DELIVERED` when confirmation is received
4. Use `CANCELLED` status appropriately with reason tracking

### Security:
1. Never share admin credentials
2. Use strong, unique passwords
3. Logout when done managing the platform
4. Monitor user activity for suspicious behavior

### Data Management:
1. Regularly backup the database
2. Monitor order statistics for unusual patterns
3. Keep product information up-to-date
4. Archive old orders periodically

## Technical Details

### Tech Stack:
- **Frontend**: Next.js 14.2.35, React, TypeScript, Tailwind CSS
- **Backend**: Express.js, Prisma ORM, MySQL
- **Authentication**: JWT tokens, bcrypt password hashing
- **State Management**: Zustand

### Database Models:
- **User**: Authentication and role management
- **Product**: Product catalog
- **Category**: Product categorization
- **Order**: Order records with status
- **OrderItem**: Individual items in orders
- **Payment**: Payment transaction records
- **Cart**: Shopping cart for authenticated users
- **CartItem**: Items in cart

### File Structure:
```
apps/web/src/app/admin/page.tsx         # Admin dashboard page
apps/web/src/components/layout/Header.tsx # Navigation with admin link
apps/api/src/controllers/order.controller.ts # Order management logic
apps/api/src/services/order.service.ts   # Order business logic
apps/api/src/routes/order.route.ts       # Order API routes
apps/api/prisma/seed.ts                  # Database seeding (includes admin user)
```

## Support

For technical issues or feature requests, please contact the development team or create an issue in the project repository.
