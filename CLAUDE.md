# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A clothing shop backend API built with Express.js and PostgreSQL, designed to manage inventory, sales, user authentication, and reporting for a retail clothing business. The system supports role-based access control with admin and cashier roles. Deployed on Vercel with a Supabase PostgreSQL database.

## Development Commands

```bash
# Install dependencies
npm install

# Start development server with hot reload (local only)
npm run dev

# Start production server (local only)
npm start

# The server runs on port 4000 by default (configurable via .env)
```

## Database Connection

- Uses PostgreSQL via `pg` package with connection pooling
- Connection configured in `db.js` using `DATABASE_URL` from environment variables
- Database hosted on Supabase with SSL enabled (`rejectUnauthorized: false`)

## Environment Variables

Required variables in `.env`:
- `DATABASE_URL`: PostgreSQL connection string (Supabase)
- `JWT_SECRET`: Secret key for JWT token signing
- `PORT`: Server port (default: 4000)
- `NODE_ENV`: Set to 'production' for Vercel deployment
- `SUPABASE_ANON_KEY`: Supabase anonymous key for storage access (required for image uploads)
- `SUPABASE_URL`: Supabase project URL (optional - auto-extracted from DATABASE_URL)

## Architecture

### Authentication & Authorization

**JWT-based authentication** (middleware/authMiddleware.js):
- `authenticateToken`: Verifies JWT from Authorization header (Bearer token)
- `authorizeRoles(...roles)`: Restricts endpoints to specific roles (admin, cashier)
- Tokens expire after 12 hours
- User info stored in `req.user` after authentication (contains `id` and `role`)

**User Roles:**
- `admin`: Full access to all endpoints, user management, reports, and settings
- `cashier`: Can process sales, view items, view/create offers

### API Routes Structure

All routes follow `/api/{resource}` pattern:

- **Auth** (`/api/auth`): User registration, login, current user info
- **Items** (`/api/items`): Inventory management (admin: CRUD, cashier: read-only)
- **Sales** (`/api/sales`): Transaction processing with stock validation, filterable by date/payment/cashier
- **Offers** (`/api/offers`): Create/view/approve discount requests from other shops
- **Users** (`/api/users`): User management (admin only)
- **Reports** (`/api/reports`): Dashboard stats, sales reports, top products, cashier performance, CSV export
- **Settings** (`/api/settings`): Shop configuration (name, tax, currency, receipt text)

### Database Schema Pattern

Tables referenced in code:
- `users`: id, email, password (bcrypt hashed), role, created_at
- `items`: id, name, description, price, quantity, image_url, created_at
- `sales`: id, cashier_id, items (JSONB array), total, payment_method, payment_bank, created_at
- `offers`: id, from_shop, items (JSONB), requested_discount (JSONB), payment_method, status, created_at, updated_at
- `settings`: id, shop_name, tax_rate, currency, receipt_header, receipt_footer, updated_at

### Transaction Handling

Sales processing (routes/sales.routes.js) uses PostgreSQL transactions to ensure atomicity:
1. Begin transaction
2. Validate item availability and stock levels
3. Decrement inventory quantities
4. Insert sale record with JSONB items array
5. Commit or rollback on error

Always use this pattern for multi-step database operations.

### Payment Methods

Supported payment methods: `cash`, `BOG`, `TBC`
- Card payments store optional `payment_bank` field
- Reports include payment method breakdowns

### File Upload (Image Storage)

Item images can be uploaded via file or URL:
- **Middleware**: `uploadMiddleware.js` uses multer with memory storage (Vercel-compatible)
- **Storage**: Supabase Storage bucket `product-images`
- **Supported formats**: JPEG, JPG, PNG, GIF, WebP (max 5MB)
- **Upload flow**:
  1. File received via multipart/form-data (field name: `image`)
  2. Stored in memory buffer (multer memoryStorage)
  3. Uploaded to Supabase Storage with unique filename
  4. Public URL returned and saved to database
- **Endpoints**: POST /api/items/add and PUT /api/items/:id support both file upload and `image_url`
- **Fallback**: If no file uploaded, accepts `image_url` string for external URLs

**Configuration**: config/supabase.js initializes Supabase client using SUPABASE_ANON_KEY

### API Documentation

Swagger/OpenAPI documentation available at `/api-docs` endpoint:
- JSDoc comments in route files generate API documentation
- Security scheme: Bearer JWT authentication
- swagger-jsdoc configured in server.js with `./routes/*.js` pattern

## Code Organization

```
server.js           # Express app setup, middleware, route mounting
db.js              # PostgreSQL connection pool
config/
  supabase.js      # Supabase client for storage operations
middleware/
  authMiddleware.js  # JWT verification and role authorization
  uploadMiddleware.js # Multer file upload configuration
routes/
  *.routes.js      # Route handlers with Swagger annotations
controllers/
  authController.js # Registration and login logic
```

## Deployment (Vercel)

- Server exports Express app as module for Vercel serverless
- vercel.json configures all routes to server.js
- Local development uses `app.listen()`, skipped when `NODE_ENV=production`
- CORS configured to allow localhost and vercel.app domains

## Key Patterns

**Dynamic SQL updates**: Routes use parameterized query building to update only provided fields:
```javascript
const updates = [];
const values = [];
let paramCount = 1;
if (field !== undefined) {
  updates.push(`field = $${paramCount++}`);
  values.push(field);
}
values.push(id);
const query = `UPDATE table SET ${updates.join(', ')} WHERE id = $${paramCount}`;
```

**JSONB queries**: Sales items and offers stored as JSONB, queried with `jsonb_array_elements()` for reporting.

**Stock management**: Sales creation validates and decrements inventory in a single transaction.
