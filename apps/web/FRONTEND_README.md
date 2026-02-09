# Robohatch - Premium 3D Printed Products E-Commerce Platform

A modern, production-ready e-commerce frontend for 3D printed products built with Next.js 14, TypeScript, and Tailwind CSS.

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Animations:** Framer Motion
- **State Management:** Zustand (Cart & UI state)
- **Server State:** TanStack React Query
- **Icons:** Lucide React
- **Fonts:** Inter (Google Fonts)
- **Image Optimization:** Next/Image

## Color Palette

- **Primary Orange:** `#F27405` - CTAs and primary actions
- **Accent Orange:** `#F25C05` - Hover states
- **Deep Brown:** `#8C3503` - Borders and accents
- **Dark Espresso:** `#260A03` - Header/Footer background
- **Soft Peach:** `#F2935C` - Text on dark backgrounds

## Project Structure

```
apps/web/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── layout.tsx          # Root layout with Header/Footer
│   │   ├── page.tsx            # Home page
│   │   ├── products/           # Products listing
│   │   ├── product/[id]/       # Product detail
│   │   ├── cart/               # Shopping cart
│   │   ├── account/            # User account
│   │   └── admin/              # Admin dashboard
│   ├── components/
│   │   ├── layout/             # Header, Footer
│   │   ├── ui/                 # Reusable UI components
│   │   └── product/            # Product-specific components
│   ├── store/                  # Zustand stores
│   │   ├── cart.store.ts       # Cart state (persisted)
│   │   └── ui.store.ts         # UI state
│   ├── lib/
│   │   ├── mock-data.ts        # Mock products & data
│   │   └── utils.ts            # Utility functions
│   └── styles/
│       └── globals.css         # Global styles & Tailwind
├── tailwind.config.js          # Tailwind configuration
└── package.json
```

## Features

### Pages

1. **Home Page (`/`)**
   - Hero section with brand message
   - Featured products grid
   - Categories showcase
   - Custom design CTA section

2. **Products Listing (`/products`)**
   - Filterable by category
   - Price range filter
   - Sort options (featured, price, rating, newest)
   - Responsive grid layout

3. **Product Detail (`/product/[id]`)**
   - Image gallery with thumbnails
   - Product specifications
   - Quantity selector
   - Add to cart functionality
   - Related products

4. **Cart (`/cart`)**
   - Item list with quantity controls
   - Price breakdown (subtotal, shipping, tax)
   - Persistent cart state
   - Checkout CTA

5. **Account (`/account`)**
   - Profile information
   - Order history
   - Custom uploads section
   - Account statistics

6. **Admin (`/admin`)**
   - Dashboard with statistics
   - Product management table
   - Order management
   - Upload approval UI

### Components

- **UI Components:** Button, Card, Input, Badge, Skeleton
- **Layout Components:** Header (sticky), Footer
- **Product Components:** ProductCard, ProductGrid, CategoryCard

### State Management

- **Cart Store (Zustand + Persistence)**
  - Add/remove items
  - Update quantities
  - Calculate totals
  - Persisted to localStorage

- **UI Store (Zustand)**
  - Mobile menu state
  - Search modal state
  - Cart drawer state

## Getting Started

### Installation

```bash
cd apps/web
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Build

```bash
npm run build
npm start
```

## Mock Data

The application uses comprehensive mock data located in `src/lib/mock-data.ts`:

- 12 sample products across 6 categories
- Product specifications (material, dimensions, weight)
- Mock user profile
- Sample order history
- Category definitions

## Key Features

### Design System

- Consistent color usage following brand guidelines
- Responsive breakpoints (mobile, tablet, desktop)
- Smooth animations with Framer Motion
- Accessible UI components
- Loading states with skeleton loaders

### Performance

- Image optimization with Next/Image
- Server-side rendering with Next.js 14
- Code splitting and lazy loading
- Optimized bundle size

### User Experience

- Sticky navigation header
- Mobile-responsive design
- Smooth page transitions
- Hover effects and micro-interactions
- Empty states with CTAs
- Error handling

### Accessibility

- WCAG contrast standards
- Semantic HTML
- ARIA labels
- Keyboard navigation support
- Focus states

## Future Integration

The frontend is designed to easily connect to a real backend:

- API endpoints can be added using Next.js API routes
- React Query setup ready for data fetching
- TypeScript interfaces prepared for type safety
- Mock data structure matches expected API responses

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

Private - All rights reserved

---

Built with ❤️ for Robohatch
