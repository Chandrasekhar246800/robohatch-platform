# Robohatch Platform - Technical Documentation

## Project Overview

Robohatch is an industrial-grade e-commerce platform designed for 3D printed products. This document covers the foundational phases completed to date: repository setup, monorepo architecture, and database layer integration.

**Current Status:** Foundation and database infrastructure complete. Application logic not yet implemented.

**Technology Stack:**
- Monorepo: TurboRepo with npm workspaces
- Frontend: Next.js 14 (App Router), TypeScript, Tailwind CSS
- Backend: Node.js, Express.js, TypeScript
- Database: MySQL with Prisma ORM v5
- Development: ts-node-dev for hot reload

---

## Phase Breakdown

### Phase 1: Foundation & Repository Setup

**Objective:** Establish monorepo architecture and initialize frontend/backend applications.

**Completed Work:**
- Monorepo structure with TurboRepo
- Workspace configuration for apps and packages
- Next.js frontend initialization
- Express.js backend initialization
- Shared packages structure (UI components, configs)
- Infrastructure directory setup
- Root-level configuration files

**Deliverables:**
- `package.json` with workspace definitions
- `turbo.json` with pipeline configuration
- `apps/web/` - Next.js application
- `apps/api/` - Express.js application
- `packages/ui/` - Shared UI component library
- `packages/config/` - Shared configuration files
- `infra/` - Infrastructure and deployment resources

### Phase 2: Database & ORM Integration

**Objective:** Implement database schema and establish ORM connection layer.

**Completed Work:**
- Prisma ORM installation and initialization
- MySQL database configuration
- Schema design for e-commerce domain
- Initial migration execution
- Prisma Client singleton implementation
- Database connection verification endpoint

**Deliverables:**
- `prisma/schema.prisma` - Complete database schema
- `prisma/migrations/` - Initial migration files
- `src/config/prisma.ts` - Singleton client instance
- `src/routes/test.route.ts` - Database test endpoint
- AWS RDS MySQL connection established

---

## Monorepo Architecture

### Structure

```
robohatch-platform/
│
├── apps/
│   ├── web/          # Next.js frontend application
│   └── api/          # Node.js Express backend
│
├── packages/
│   ├── ui/           # Shared React components
│   └── config/       # Shared ESLint and TypeScript configs
│
├── infra/            # AWS configurations and deployment scripts
│   ├── aws/
│   ├── scripts/
│   └── docs/
│
├── package.json      # Root workspace configuration
├── turbo.json        # TurboRepo pipeline definitions
└── README.md
```

### Directory Purposes

| Directory | Purpose |
|-----------|---------|
| `apps/web` | Customer-facing Next.js application with App Router |
| `apps/api` | RESTful API server using Express.js |
| `packages/ui` | Reusable React components (Button, etc.) |
| `packages/config` | Shared ESLint and TypeScript configurations |
| `infra/` | Cloud infrastructure, deployment scripts, documentation |

### Why Monorepo

**Technical Rationale:**
- **Shared Code:** UI components and types shared between frontend and backend
- **Atomic Changes:** Frontend and backend changes deployed together
- **Unified Dependencies:** Single node_modules reduces duplication
- **Build Optimization:** TurboRepo caching and parallel execution
- **Developer Experience:** Single repository clone, unified tooling

**TurboRepo Configuration:**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "dev": {
      "cache": false
    },
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    }
  }
}
```

---

## Frontend Setup (Current State)

### Initialization Complete

The Next.js application is scaffolded with:
- **TypeScript:** Full type safety across codebase
- **App Router:** Next.js 14 App Directory structure
- **Tailwind CSS:** Utility-first styling framework
- **ESLint:** Code quality enforcement
- **Import Alias:** `@/*` mapped to `src/*`

### File Structure

```
apps/web/
├── src/
│   └── app/
│       ├── layout.tsx    # Root layout component
│       ├── page.tsx      # Home page (placeholder)
│       └── globals.css   # Tailwind directives
├── package.json
├── tsconfig.json
└── next.config.js
```

### Current Implementation

**Layout (`src/app/layout.tsx`):**
- Basic HTML structure
- Metadata configuration
- No navigation or header implemented

**Home Page (`src/app/page.tsx`):**
- Placeholder welcome message
- No product listings or features

### Intentionally Not Built

- Authentication UI
- Product catalog pages
- Shopping cart interface
- User dashboard
- Checkout flow
- API integration layer

**Reason:** Frontend implementation deferred until backend API contracts are established.

---

## Backend Setup (Current State)

### Express Application Structure

```
apps/api/src/
├── app.ts              # Express app configuration
├── server.ts           # Server initialization and startup
├── routes/
│   ├── index.ts        # Route placeholder
│   └── test.route.ts   # Database verification endpoint
├── controllers/
│   └── index.ts        # Controller placeholder
├── services/
│   └── index.ts        # Service layer placeholder
├── repositories/
│   └── index.ts        # Data access placeholder
├── middlewares/
│   └── index.ts        # Middleware placeholder
└── config/
    ├── index.ts        # Configuration placeholder
    └── prisma.ts       # Prisma Client singleton
```

### Layered Architecture Intent

The backend follows a clean architecture pattern:

1. **Routes Layer:** HTTP request routing and validation
2. **Controllers Layer:** Request/response handling
3. **Services Layer:** Business logic implementation
4. **Repositories Layer:** Database access abstraction

**Current State:** Directory structure created, minimal implementations only.

### Implemented Endpoints

| Method | Endpoint | Purpose | Status |
|--------|----------|---------|--------|
| GET | `/health` | Server health check | ✅ Implemented |
| GET | `/test/db-test` | Database connection test | ✅ Implemented |

### Application Configuration

**`src/app.ts`:**
```typescript
import express from "express";
import cors from "cors";
import testRoutes from "./routes/test.route";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_, res) => {
  res.status(200).json({ status: "OK" });
});

app.use("/test", testRoutes);

export default app;
```

**`src/server.ts`:**
```typescript
import app from "./app";

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`);
});
```

### Dependencies

**Production:**
- `express` - Web framework
- `cors` - Cross-origin resource sharing
- `dotenv` - Environment variable management
- `jsonwebtoken` - JWT authentication (not yet used)
- `prisma` - ORM runtime
- `@prisma/client` - Prisma database client

**Development:**
- `typescript` - Type system
- `ts-node-dev` - Development server with hot reload
- `@types/*` - TypeScript definitions

---

## Prisma ORM Integration

### Initialization

Prisma was initialized using:
```bash
npx prisma init
```

This created:
- `prisma/schema.prisma` - Schema definition file
- `prisma.config.ts` - Prisma configuration
- `.env` - Environment variables file

### Client Setup (Singleton Pattern)

**File:** `apps/api/src/config/prisma.ts`

```typescript
import { PrismaClient } from "@prisma/client";
import "dotenv/config";

const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error", "warn"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

**Purpose:**
- Prevents multiple PrismaClient instances during development hot reload
- Reuses single instance to avoid connection pool exhaustion
- Logs errors and warnings for debugging

### Migration Strategy

**First Migration:**
```bash
npx prisma migrate dev --name init
```

**Generated:**
- `prisma/migrations/20260203150914_init/migration.sql` - Initial schema SQL
- Applied to MySQL database on AWS RDS
- Schema synchronized with Prisma models

**Client Generation:**
```bash
npx prisma generate
```

Generates TypeScript-typed client in `node_modules/@prisma/client`.

### Version Note

**Prisma Version:** 5.22.0

Initially attempted with Prisma 7, but encountered breaking changes requiring database adapters. Downgraded to Prisma 5 for stable, production-ready support.

---

## Database Schema (Implemented)

### Schema Overview

The database schema supports an e-commerce platform with user management, product catalog, orders, and file uploads.

### Models

#### User

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
```

**Purpose:** User accounts with authentication and role-based access control.

**Fields:**
- `id` - UUID primary key
- `email` - Unique email address for login
- `password` - Hashed password (bcrypt not yet implemented)
- `name` - Optional display name
- `role` - USER or ADMIN (enum)
- `createdAt` / `updatedAt` - Timestamps

**Relationships:**
- One-to-many with Orders
- One-to-many with Uploads

#### Product

```prisma
model Product {
  id          String   @id @default(uuid())
  name        String
  description String
  price       Decimal
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  images      ProductImage[]
  orderItems  OrderItem[]
  category    Category? @relation(fields: [categoryId], references: [id])
  categoryId  String?
}
```

**Purpose:** 3D printed product listings.

**Fields:**
- `price` - Decimal type for currency precision
- `isActive` - Soft delete / visibility toggle
- `categoryId` - Optional foreign key to Category

**Relationships:**
- One-to-many with ProductImage
- Many-to-one with Category (optional)
- One-to-many with OrderItem

#### Category

```prisma
model Category {
  id        String   @id @default(uuid())
  name      String   @unique
  createdAt DateTime @default(now())

  products  Product[]
}
```

**Purpose:** Product categorization.

**Constraints:**
- `name` must be unique

#### ProductImage

```prisma
model ProductImage {
  id        String   @id @default(uuid())
  url       String
  product   Product @relation(fields: [productId], references: [id])
  productId String
}
```

**Purpose:** Multiple images per product.

**Relationships:**
- Many-to-one with Product (required)

#### Order

```prisma
model Order {
  id        String      @id @default(uuid())
  user      User        @relation(fields: [userId], references: [id])
  userId    String
  status    OrderStatus @default(PENDING)
  total     Decimal
  createdAt DateTime    @default(now())

  items     OrderItem[]
}
```

**Purpose:** Customer orders with status tracking.

**Fields:**
- `status` - Enum: PENDING, PAID, SHIPPED, DELIVERED, CANCELLED
- `total` - Order total amount (Decimal)

**Relationships:**
- Many-to-one with User (required)
- One-to-many with OrderItem

#### OrderItem

```prisma
model OrderItem {
  id        String   @id @default(uuid())
  order     Order    @relation(fields: [orderId], references: [id])
  orderId   String
  product   Product @relation(fields: [productId], references: [id])
  productId String
  quantity  Int
  price     Decimal
}
```

**Purpose:** Line items within an order.

**Design Note:**
- `price` stored at order time (historical pricing)
- `quantity` for multiple units of same product

**Relationships:**
- Many-to-one with Order (required)
- Many-to-one with Product (required)

#### Upload

```prisma
model Upload {
  id        String   @id @default(uuid())
  user      User     @relation(fields: [userId], references: [id])
  userId    String
  fileUrl   String
  status    UploadStatus @default(PENDING)
  createdAt DateTime @default(now())
}
```

**Purpose:** User-uploaded files (e.g., custom 3D models) requiring approval.

**Fields:**
- `fileUrl` - Storage URL (S3, CDN, etc.)
- `status` - Enum: PENDING, APPROVED, REJECTED

**Relationships:**
- Many-to-one with User (required)

### Enums

```prisma
enum Role {
  USER
  ADMIN
}

enum OrderStatus {
  PENDING
  PAID
  SHIPPED
  DELIVERED
  CANCELLED
}

enum UploadStatus {
  PENDING
  APPROVED
  REJECTED
}
```

### Relationships Summary

```
User 1----* Order
User 1----* Upload
Category 1----* Product
Product 1----* ProductImage
Product 1----* OrderItem
Order 1----* OrderItem
```

### Design Decisions

1. **UUID Primary Keys:** Better for distributed systems, prevents ID enumeration attacks
2. **Soft Deletes:** `isActive` on Product instead of hard deletes
3. **Decimal for Currency:** Avoids floating-point precision errors
4. **Historical Pricing:** OrderItem stores price at purchase time
5. **Optional Category:** Products can exist without categorization
6. **Approval Workflow:** Upload status enum enables moderation

---

## Environment Configuration

### Database Connection

**File:** `apps/api/.env`

```env
DATABASE_URL="mysql://admin:password@robohatch-mysql.c344g8euk9qw.eu-north-1.rds.amazonaws.com:3306/robohatch_db"
```

**Connection String Format:**
```
mysql://[username]:[password]@[host]:[port]/[database]
```

**Current Setup:**
- **Provider:** MySQL on AWS RDS
- **Region:** eu-north-1
- **Instance:** robohatch-mysql.c344g8euk9qw.eu-north-1.rds.amazonaws.com
- **Database:** robohatch_db

### Environment Separation

**Principles:**
- `.env` files excluded from Git via `.gitignore`
- `.env.example` checked into repository as template
- Separate credentials for development, staging, production
- Prisma loads environment variables via `dotenv` in `prisma.config.ts`

### Configuration Files

**`prisma.config.ts`:**
```typescript
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
```

---

## Validation & Verification

### Health Check Endpoint

**Endpoint:** `GET http://localhost:4000/health`

**Response:**
```json
{
  "status": "OK"
}
```

**Purpose:** Verify Express server is running.

**Status Code:** 200 (success)

### Database Test Endpoint

**Endpoint:** `GET http://localhost:4000/test/db-test`

**Implementation:**
```typescript
import { Router } from "express";
import { prisma } from "../config/prisma";

const router = Router();

router.get("/db-test", async (_, res) => {
  const users = await prisma.user.findMany();
  res.json({ success: true, users });
});

export default router;
```

**Response (Empty Database):**
```json
{
  "success": true,
  "users": []
}
```

**Purpose:** Verify Prisma can connect to MySQL and execute queries.

### Local Verification Steps

1. **Start Development Servers:**
   ```bash
   npm run dev
   ```

2. **Verify Frontend:**
   - Navigate to `http://localhost:3000`
   - Should see "Welcome to RoboHatch Platform" message

3. **Verify Backend Health:**
   ```bash
   curl http://localhost:4000/health
   ```

4. **Verify Database Connection:**
   ```bash
   curl http://localhost:4000/test/db-test
   ```

5. **Check TurboRepo Output:**
   - Both `@robohatch/web:dev` and `@robohatch/api:dev` should show as running
   - No compilation errors in terminal

### Migration Verification

**Check Applied Migrations:**
```bash
cd apps/api
npx prisma migrate status
```

**Expected Output:**
```
Database schema is up to date!
```

---

## Git & Version Control Strategy

### Initial Commit

**Purpose:** Establish baseline for monorepo structure.

**Included:**
- Root configuration files (`package.json`, `turbo.json`, `.gitignore`)
- Frontend scaffolding (Next.js)
- Backend scaffolding (Express)
- Shared packages (UI, config)
- Infrastructure directory structure

### Phase-Based Commits

**Commit Strategy:**
1. **Foundation Phase:** Monorepo setup and basic structure
2. **Database Phase:** Prisma schema, migrations, client integration
3. **Future Phases:** Feature branches merged to main

**Branching Model:**
- `main` - Stable, deployable code
- `develop` - Integration branch for completed features
- `feature/*` - Individual feature development
- `hotfix/*` - Production bug fixes

### Ignored Files

**`.gitignore` includes:**
```
node_modules/
.next/
dist/
.env
.env*.local
*.tsbuildinfo
.turbo
```

**Reason:** Exclude generated files, dependencies, and sensitive credentials.

---

## Current Project Status

### Completed

✅ **Infrastructure:**
- TurboRepo monorepo with npm workspaces
- Development pipeline (dev, build)
- Frontend application initialized
- Backend application initialized

✅ **Database Layer:**
- Prisma ORM integrated (v5.22.0)
- MySQL connection established (AWS RDS)
- Complete e-commerce schema implemented
- Initial migration applied successfully
- Prisma Client singleton pattern

✅ **Verification:**
- Health check endpoint functional
- Database test endpoint functional
- Development servers running (ports 3000, 4000)

### Not Yet Started

❌ **Authentication:**
- JWT implementation
- Password hashing (bcrypt)
- Login/registration endpoints
- Protected routes

❌ **API Endpoints:**
- User CRUD operations
- Product CRUD operations
- Order management
- File upload handling

❌ **Frontend Features:**
- Product catalog UI
- Shopping cart
- Checkout flow
- User dashboard
- Admin panel

❌ **Business Logic:**
- Controllers implementation
- Services layer
- Repository pattern
- Validation middleware

❌ **Testing:**
- Unit tests
- Integration tests
- E2E tests

❌ **Deployment:**
- CI/CD pipeline
- Docker containerization
- Cloud infrastructure (IaC)
- Environment provisioning

---

## Next Planned Phase

**Phase 3: Authentication & Authorization**

The next development phase will implement user authentication using JWT, password hashing with bcrypt, and role-based access control for protected routes.
