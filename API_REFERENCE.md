# Clothing Shop Backend API Reference

Base URL: `http://localhost:4000` (development) or your Vercel deployment URL

## Authentication

All authenticated endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## API Endpoints

### Authentication (`/api/auth`)

#### POST `/api/auth/register`
Register a new user
- **Auth Required:** No
- **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "password123",
    "role": "admin" | "cashier"
  }
  ```
- **Response:** `201 Created`
  ```json
  {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "role": "admin"
    }
  }
  ```

#### POST `/api/auth/login`
Login and receive JWT token
- **Auth Required:** No
- **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```
- **Response:** `200 OK`
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "email": "user@example.com",
      "role": "admin"
    }
  }
  ```

#### GET `/api/auth/me`
Get current authenticated user
- **Auth Required:** Yes
- **Roles:** admin, cashier
- **Response:** `200 OK`
  ```json
  {
    "id": 1,
    "role": "admin"
  }
  ```

---

### Items (`/api/items`)

#### POST `/api/items/add`
Add a new item to inventory
- **Auth Required:** Yes
- **Roles:** admin only
- **Content-Type:** `multipart/form-data` (for file upload) or `application/json` (for URL)
- **Request Body (Form Data for file upload):**
  ```
  name: "T-Shirt" (required)
  description: "Cotton T-Shirt"
  price: 29.99 (required)
  image: <file> (optional - JPG, PNG, GIF, WebP, max 5MB)
  ```
- **Request Body (JSON for URL):**
  ```json
  {
    "name": "T-Shirt",
    "description": "Cotton T-Shirt",
    "price": 29.99,
    "image_url": "https://example.com/image.jpg"
  }
  ```
- **Response:** `201 Created`
  ```json
  {
    "item": {
      "id": 1,
      "name": "T-Shirt",
      "description": "Cotton T-Shirt",
      "price": 29.99,
      "quantity": 0,
      "image_url": "https://xxxx.supabase.co/storage/v1/object/public/product-images/items/xxx.jpg",
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  }
  ```

#### GET `/api/items`
Get all items
- **Auth Required:** Yes
- **Roles:** admin, cashier
- **Response:** `200 OK`
  ```json
  [
    {
      "id": 1,
      "name": "T-Shirt",
      "description": "Cotton T-Shirt",
      "price": 29.99,
      "quantity": 50,
      "image_url": "https://example.com/image.jpg",
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ]
  ```

#### PUT `/api/items/:id`
Update an item
- **Auth Required:** Yes
- **Roles:** admin only
- **URL Params:** `id` (item ID)
- **Content-Type:** `multipart/form-data` (for file upload) or `application/json` (for URL)
- **Request Body (Form Data for file upload):** (all fields optional)
  ```
  name: "Updated T-Shirt"
  description: "Premium Cotton T-Shirt"
  price: 34.99
  quantity: 100
  image: <file> (optional - JPG, PNG, GIF, WebP, max 5MB)
  ```
- **Request Body (JSON for URL):** (all fields optional)
  ```json
  {
    "name": "Updated T-Shirt",
    "description": "Premium Cotton T-Shirt",
    "price": 34.99,
    "quantity": 100,
    "image_url": "https://example.com/new-image.jpg"
  }
  ```
- **Response:** `200 OK` (returns updated item)

#### DELETE `/api/items/:id`
Delete an item
- **Auth Required:** Yes
- **Roles:** admin only
- **URL Params:** `id` (item ID)
- **Response:** `200 OK`
  ```json
  {
    "message": "Item deleted successfully",
    "item": { ... }
  }
  ```

---

### Sales (`/api/sales`)

#### POST `/api/sales`
Create a new sale (automatically decrements stock)
- **Auth Required:** Yes
- **Roles:** admin, cashier
- **Request Body:**
  ```json
  {
    "items": [
      {
        "id": 1,
        "name": "T-Shirt",
        "price": 29.99,
        "qty": 2
      }
    ],
    "total": 59.98,
    "payment_method": "cash" | "BOG" | "TBC",
    "payment_bank": "BOG" (optional, for card payments)
  }
  ```
- **Response:** `201 Created`
  ```json
  {
    "id": 1,
    "cashier_id": 1,
    "items": "[{\"id\":1,\"name\":\"T-Shirt\",\"price\":29.99,\"qty\":2}]",
    "total": 59.98,
    "payment_method": "cash",
    "payment_bank": null,
    "created_at": "2024-01-01T00:00:00.000Z"
  }
  ```

#### GET `/api/sales`
Get all sales with optional filters
- **Auth Required:** Yes
- **Roles:** admin, cashier
- **Query Params:** (all optional)
  - `payment_method`: cash | BOG | TBC
  - `cashier_id`: integer
  - `from`: YYYY-MM-DD
  - `to`: YYYY-MM-DD
- **Example:** `/api/sales?from=2024-01-01&to=2024-01-31&payment_method=cash`
- **Response:** `200 OK`
  ```json
  [
    {
      "id": 1,
      "cashier_id": 1,
      "cashier_email": "cashier@example.com",
      "items": "[...]",
      "total": 59.98,
      "payment_method": "cash",
      "payment_bank": null,
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ]
  ```

#### GET `/api/sales/:id`
Get single sale details
- **Auth Required:** Yes
- **Roles:** admin, cashier
- **URL Params:** `id` (sale ID)
- **Response:** `200 OK` (single sale object with cashier_email)

---

### Offers (`/api/offers`)

#### POST `/api/offers`
Create a new offer from another shop
- **Auth Required:** Yes
- **Roles:** admin, cashier
- **Request Body:**
  ```json
  {
    "from_shop": "Shop Name",
    "items": [
      {
        "id": 1,
        "name": "T-Shirt",
        "price": 29.99,
        "qty": 10
      }
    ],
    "requested_discount": {
      "type": "percentage" | "manual",
      "value": 10
    },
    "payment_method": "cash" | "BOG" | "TBC"
  }
  ```
- **Response:** `201 Created`

#### GET `/api/offers`
Get all offers
- **Auth Required:** Yes
- **Roles:** admin, cashier
- **Response:** `200 OK`
  ```json
  [
    {
      "id": 1,
      "from_shop": "Shop Name",
      "items": "[...]",
      "requested_discount": "{\"type\":\"percentage\",\"value\":10}",
      "payment_method": "cash",
      "status": "pending" | "approved" | "rejected",
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  ]
  ```

#### PUT `/api/offers/status`
Approve or reject an offer
- **Auth Required:** Yes
- **Roles:** admin only
- **Request Body:**
  ```json
  {
    "offer_id": 1,
    "status": "approved" | "rejected"
  }
  ```
- **Response:** `200 OK` (returns updated offer)

---

### Users (`/api/users`)

#### GET `/api/users`
Get all users
- **Auth Required:** Yes
- **Roles:** admin only
- **Response:** `200 OK`
  ```json
  [
    {
      "id": 1,
      "email": "user@example.com",
      "role": "admin",
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ]
  ```

#### POST `/api/users`
Create a new user
- **Auth Required:** Yes
- **Roles:** admin only
- **Request Body:**
  ```json
  {
    "email": "newuser@example.com",
    "password": "password123",
    "role": "admin" | "cashier"
  }
  ```
- **Response:** `201 Created`

#### PUT `/api/users/:id`
Update a user
- **Auth Required:** Yes
- **Roles:** admin only
- **URL Params:** `id` (user ID)
- **Request Body:**
  ```json
  {
    "email": "updated@example.com",
    "role": "cashier"
  }
  ```
- **Response:** `200 OK`

#### DELETE `/api/users/:id`
Delete a user
- **Auth Required:** Yes
- **Roles:** admin only
- **URL Params:** `id` (user ID)
- **Response:** `200 OK`
  ```json
  {
    "message": "User deleted successfully",
    "user": { "id": 1, "email": "user@example.com" }
  }
  ```

---

### Reports (`/api/reports`)

#### GET `/api/reports/dashboard`
Get dashboard statistics
- **Auth Required:** Yes
- **Roles:** admin only
- **Response:** `200 OK`
  ```json
  {
    "today": {
      "transactions": 5,
      "revenue": 299.95
    },
    "week": {
      "transactions": 25,
      "revenue": 1499.75
    },
    "month": {
      "transactions": 100,
      "revenue": 5999.00
    },
    "inventory": {
      "totalValue": 15000.00,
      "lowStock": [...],
      "outOfStock": [...]
    },
    "paymentMethods": [...],
    "topProducts": [...]
  }
  ```

#### GET `/api/reports/sales`
Get sales report for date range
- **Auth Required:** Yes
- **Roles:** admin only
- **Query Params:** (required)
  - `from`: YYYY-MM-DD
  - `to`: YYYY-MM-DD
- **Example:** `/api/reports/sales?from=2024-01-01&to=2024-01-31`
- **Response:** `200 OK`
  ```json
  {
    "summary": {
      "total_transactions": 100,
      "total_revenue": 5999.00,
      "avg_order_value": 59.99
    },
    "dailySales": [...],
    "paymentBreakdown": [...]
  }
  ```

#### GET `/api/reports/top-products`
Get top selling products
- **Auth Required:** Yes
- **Roles:** admin only
- **Query Params:** (optional)
  - `limit`: integer (default: 10)
- **Example:** `/api/reports/top-products?limit=5`
- **Response:** `200 OK`
  ```json
  [
    {
      "product_name": "T-Shirt",
      "product_id": "1",
      "total_sold": 150,
      "revenue": 4498.50
    }
  ]
  ```

#### GET `/api/reports/cashier-performance`
Get cashier performance metrics
- **Auth Required:** Yes
- **Roles:** admin only
- **Query Params:** (required)
  - `from`: YYYY-MM-DD
  - `to`: YYYY-MM-DD
- **Example:** `/api/reports/cashier-performance?from=2024-01-01&to=2024-01-31`
- **Response:** `200 OK`
  ```json
  [
    {
      "id": 1,
      "email": "cashier@example.com",
      "role": "cashier",
      "total_transactions": 50,
      "total_revenue": 2999.50,
      "avg_transaction_value": 59.99,
      "first_sale": "2024-01-01T10:00:00.000Z",
      "last_sale": "2024-01-31T18:00:00.000Z"
    }
  ]
  ```

#### GET `/api/reports/export-csv`
Export sales data as CSV file
- **Auth Required:** Yes
- **Roles:** admin only
- **Query Params:** (required)
  - `from`: YYYY-MM-DD
  - `to`: YYYY-MM-DD
- **Example:** `/api/reports/export-csv?from=2024-01-01&to=2024-01-31`
- **Response:** `200 OK` (CSV file download)

---

### Settings (`/api/settings`)

#### GET `/api/settings`
Get application settings
- **Auth Required:** Yes
- **Roles:** admin only
- **Response:** `200 OK`
  ```json
  {
    "id": 1,
    "shop_name": "Clothing Shop",
    "tax_rate": 0,
    "currency": "GEL",
    "receipt_header": "Thank you for shopping with us!",
    "receipt_footer": "Please come again",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
  ```

#### PUT `/api/settings`
Update application settings
- **Auth Required:** Yes
- **Roles:** admin only
- **Request Body:** (all fields optional)
  ```json
  {
    "shop_name": "My Clothing Store",
    "tax_rate": 0.18,
    "currency": "GEL",
    "receipt_header": "Welcome!",
    "receipt_footer": "Thank you!"
  }
  ```
- **Response:** `200 OK` (returns updated settings)

---

## Common Error Responses

- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Missing or invalid token
- `403 Forbidden` - Insufficient permissions (wrong role)
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource already exists (e.g., duplicate email)
- `500 Internal Server Error` - Server error

## Important Notes

1. **Items endpoint**: Use `/api/items/add` for POST (not `/api/items`)
2. **Offers status update**: Use `/api/offers/status` (not `/api/offers/:id`)
3. **All dates**: Use YYYY-MM-DD format for query parameters
4. **JSONB fields**: `items` in sales are stored as stringified JSON arrays
5. **Payment methods**: Only `cash`, `BOG`, `TBC` are valid
6. **Roles**: Only `admin` and `cashier` are valid user roles
7. **Image uploads**:
   - Supports both file uploads (multipart/form-data) and URLs (JSON)
   - Accepted formats: JPG, JPEG, PNG, GIF, WebP
   - Max file size: 5MB
   - Images stored in Supabase Storage bucket: `product-images`
   - Field name for file upload: `image`
   - Field name for URL: `image_url`

## Setup Requirements for File Upload

Before using file upload, ensure the following environment variables are set in `.env`:

```env
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_URL=https://your-project.supabase.co  # Optional - auto-extracted from DATABASE_URL
```

**Supabase Storage Setup:**
1. Go to your Supabase project dashboard
2. Navigate to Storage > Create a new bucket
3. Create a bucket named `product-images`
4. Make it **public** (so image URLs are accessible)
5. Copy your `anon` key from Settings > API
6. Add the key to your `.env` file
