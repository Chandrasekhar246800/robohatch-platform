# Quick Start: Testing Admin Panel

## Prerequisites
Both servers should be running:
- ✅ Backend API: http://localhost:5000
- ✅ Frontend: http://localhost:3000

## Step-by-Step Testing Guide

### 1. Login as Admin
1. Open browser and navigate to: http://localhost:3000/login
2. Enter admin credentials:
   - **Email**: `Admin@robohatch.in`
   - **Password**: `Admin@123456789090`
3. Click "Login"
4. **You will be automatically redirected to the admin panel**

### 2. Verify Admin Restrictions
1. After login, you should be at: http://localhost:3000/admin
2. Notice that the navigation header shows **only the "Admin" link**
3. All other navigation links (Home, Products, Cart, etc.) are hidden for admin users
4. Try to manually navigate to customer pages:
   - http://localhost:3000/ - Should redirect to /admin
   - http://localhost:3000/products - Should redirect to /admin
   - http://localhost:3000/cart - Should redirect to /admin
5. This confirms admin users can only access the admin panel

### 3. Access Admin Panel
On the admin dashboard, you'll see:
- **Stats Cards**:
  - Total Products: 10
  - Total Orders: (number of orders in system)
  - Total Revenue: (sum of all paid orders)
  - Pending Uploads: 3 (mock data)
- **Quick Actions**: Dashboard, Products, Orders, Upload Approvals tabs
- **Recent Orders**: List of last 5 orders
- **Product Status**: In Stock / Out of Stock / Featured breakdown

### 4. Test Products Tab
1. Click "Products" tab
2. View all 10 seeded products with:
   - Product image
   - Product name
   - Category
   - Price
   - Stock status
3. See action buttons (View/Edit/Delete) for each product

### 5. Test Orders Tab
1. Click "Orders" tab
2. If you have orders in the system:
   - View order details (ID, date, items, customer)
   - Test status update: Select different status from dropdown
   - Click "View Details" to see full order page
3. If no orders exist:
   - You'll see "No orders yet" message
   - Create a test order first (see "Create Test Order" section below)

### 6. Test Status Updates
1. In Orders tab, find an order with `PENDING` status
2. Change dropdown to `PAID`
3. Order status should update in real-time
4. Check that the status is saved (refresh page to verify)

## Create Test Order

To test order management features, create a test order:

### Method 1: Through Frontend UI
1. Logout from admin account (or use incognito window)
2. Register a new user at http://localhost:3000/register
3. Browse products at http://localhost:3000/products
4. Add products to cart
5. Go to cart: http://localhost:3000/cart
6. Click "Proceed to Checkout"
7. Fill UPI details and complete payment
8. Login back as admin to see the order

### Method 2: Using Existing User
1. Login with any registered user (not admin)
2. Add products to cart and checkout
3. Complete payment flow
4. Login as admin to manage the order

## Expected Behavior

### ✅ Success Indicators:
- Admin automatically redirected to /admin after login (not home page)
- Only "Admin" link visible in navigation for admin users
- Admin panel loads without errors
- Stats cards show real data from database
- Orders list shows actual orders (if any exist)
- Status dropdown updates work correctly
- **Admin cannot access customer pages** (auto-redirected to /admin)
- Non-admin users cannot see Admin link
- Non-admin users redirected if they try to access `/admin` directly

### ❌ Potential Issues:

**Issue**: Admin link not showing after login
- **Solution**: Verify you logged in with `Admin@robohatch.in`
- **Check**: User role in database should be `ADMIN`

**Issue**: Redirected to home when accessing `/admin`
- **Solution**: Make sure you're logged in as admin
- **Check**: Clear browser cache and login again

**Issue**: Orders not loading
- **Solution**: Check backend API is running
- **Check**: Look for errors in browser console (F12)

**Issue**: Status update not working
- **Solution**: Verify valid status transition (see ADMIN_GUIDE.md)
- **Check**: Backend API logs for validation errors

## Testing Checklist

### Au**Admin auto-redirected to /admin panel** (not home page)
- [ ] **Only "Admin" link visible** in navigation for admin
- [ ] **Admin cannot access customer pages** (/, /products, /cart, /orders)
- [ ] Login with admin credentials succeeds
- [ ] Admin link visible in navigation after login
- [ ] Admin link NOT visible for regular users
- [ ] Direct access to `/admin` blocked for non-admin users
- [ ] Unauthenticated users redirected to login

### Admin Dashboard:
- [ ] Stats cards display correct numbers
- [ ] Recent orders list shows actual orders
- [ ] Product status breakdown shows correct counts
- [ ] Tab navigation works (Dashboard, Products, Orders, Uploads)

### Order Management:
- [ ] Orders list loads successfully
- [ ] Order details display correctly
- [ ] Status dropdown shows current status
- [ ] Status update works and persists
- [ ] "View Details" button navigates to order page

### Products Management:
- [ ] All 10 products display in table
- [ ] Product images load correctly
- [ ] Category and price information correct
- [ ] Stock status badges show correctly
- [ ] Search input renders (functionality TBD)

## Next Steps

After successful testing:
1. Review [ADMIN_GUIDE.md](./ADMIN_GUIDE.md) for detailed feature documentation
2. Test order status transitions (PENDING → PAID → SHIPPED → DELIVERED)
3. Verify order statistics update correctly
4. Test with multiple orders and different statuses
5. Check mobile responsiveness of admin panel

## Useful Commands

```bash
# Restart backend server
cd apps/api
npm run dev

# Restart frontend server
cd apps/web
npm run dev

# Re-seed database (includes admin user)
cd apps/api
npm run seed

# Check backend logs
# Look in the terminal where `npm run dev` is running
```

## API Testing (Optional)

Test admin API endpoints using curl or Postman:

```bash
# Login to get JWT token
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"Admin@robohatch.in","password":"Admin@123456789090"}'

# Get all orders (replace <TOKEN> with JWT from login)
curl http://localhost:5000/api/orders \
  -H "Authorization: Bearer <TOKEN>"

# Update order status
curl -X PUT http://localhost:5000/api/orders/<ORDER_ID>/status \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"status":"SHIPPED"}'

# Get order statistics
curl http://localhost:5000/api/orders/stats \
  -H "Authorization: Bearer <TOKEN>"
```

## Screenshots Location

Take screenshots of:
1. Admin login page with credentials filled
2. Admin dashboard with stats visible
3. Products tab showing all products
4. Orders tab with order management
5. Status update dropdown in action

Save in: `docs/screenshots/admin-panel/`

## Support

If you encounter issues:
1. Check browser console (F12 → Console tab)
2. Check backend API logs in terminal
3. Verify database connection
4. Ensure both servers are running
5. Review ADMIN_GUIDE.md for troubleshooting

Happy testing! 🚀
