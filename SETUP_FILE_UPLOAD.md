# File Upload Setup Guide

This guide will help you set up Supabase Storage for image uploads in your clothing shop backend.

## ✅ What's Already Done

1. ✅ Installed required packages (`multer` and `@supabase/supabase-js`)
2. ✅ Created Supabase storage client configuration (`config/supabase.js`)
3. ✅ Created file upload middleware (`middleware/uploadMiddleware.js`)
4. ✅ Updated item routes to handle file uploads (POST `/api/items/add` and PUT `/api/items/:id`)
5. ✅ Updated API documentation

## 🔧 Setup Steps Required

### Step 1: Get Your Supabase Anon Key

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Select your project: `xxzmnjkwlxpkfrrznnmp`
3. Go to **Settings** > **API**
4. Copy the `anon` `public` key (NOT the service_role key)

### Step 2: Create Storage Bucket

1. In your Supabase dashboard, go to **Storage**
2. Click **Create a new bucket**
3. Bucket name: `product-images`
4. Set bucket to **Public** (so image URLs are publicly accessible)
5. Click **Create bucket**

### Step 3: Update Environment Variables

Add this line to your `.env` file:

```env
SUPABASE_ANON_KEY=your_actual_anon_key_here
```

Your `.env` should now look like:

```env
PORT=4000
DATABASE_URL=postgresql://postgres:Xristo1080.@db.xxzmnjkwlxpkfrrznnmp.supabase.co:5432/postgres
JWT_SECRET=my_super_secret_key
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  # Replace with your actual key
```

**Note:** The `SUPABASE_URL` is optional - it will be automatically extracted from your `DATABASE_URL`.

### Step 4: Update Vercel Environment Variables (for production)

If deploying to Vercel:

1. Go to your Vercel project dashboard
2. Go to **Settings** > **Environment Variables**
3. Add new variable:
   - **Name:** `SUPABASE_ANON_KEY`
   - **Value:** Your Supabase anon key
   - **Environment:** Production, Preview, Development (select all)
4. Click **Save**
5. Redeploy your application

### Step 5: Test the Upload

#### Using Postman/Thunder Client:

1. Create a new POST request to `http://localhost:4000/api/items/add`
2. Set **Authorization** header: `Bearer your_jwt_token`
3. Set request type to **form-data**
4. Add fields:
   - `name`: "Test Item" (text)
   - `description`: "Test Description" (text)
   - `price`: 29.99 (text)
   - `image`: Select a JPG/PNG file (file)
5. Send the request

#### Using cURL:

```bash
curl -X POST http://localhost:4000/api/items/add \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "name=Test Item" \
  -F "description=Test Description" \
  -F "price=29.99" \
  -F "image=@/path/to/your/image.jpg"
```

## 📝 How It Works

### File Upload (multipart/form-data)

Frontend sends form data with file:
```javascript
const formData = new FormData();
formData.append('name', 'T-Shirt');
formData.append('description', 'Cotton T-Shirt');
formData.append('price', 29.99);
formData.append('image', fileObject); // File from input type="file"

fetch('/api/items/add', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
    // Don't set Content-Type - browser sets it automatically with boundary
  },
  body: formData
});
```

### URL Upload (JSON)

Frontend sends JSON with URL (still works):
```javascript
fetch('/api/items/add', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'T-Shirt',
    description: 'Cotton T-Shirt',
    price: 29.99,
    image_url: 'https://example.com/image.jpg'
  })
});
```

## 🔍 Troubleshooting

### Error: "SUPABASE_ANON_KEY is required"
- Make sure you've added `SUPABASE_ANON_KEY` to your `.env` file
- Restart your server after adding the env variable

### Error: "Failed to upload image" or "Bucket not found"
- Check that you created the bucket named exactly `product-images`
- Verify the bucket is set to **Public**
- Check your Supabase anon key is correct

### Error: "Invalid file type"
- Only JPG, JPEG, PNG, GIF, and WebP files are accepted
- Maximum file size is 5MB

### Images not loading in frontend
- Verify the bucket is set to **Public** in Supabase Storage settings
- Check the returned `image_url` is accessible in a browser

## 📚 Additional Resources

- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [Multer Documentation](https://github.com/expressjs/multer)
- API Reference: See `API_REFERENCE.md`
