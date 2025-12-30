# 🚀 Complete Deployment Guide

## Overview
This guide will help you deploy your clothing shop application using:
- **Cloudflare**: Domain registration + R2 image storage ($1.50/month for 100GB)
- **Vercel**: Backend + Frontend hosting (FREE)
- **Supabase**: PostgreSQL database (FREE)

**Total Cost: ~$2.33/month** ($1.50 R2 + $0.83 domain)

---

## Prerequisites
- GitHub account (for code repository)
- Backend code pushed to GitHub
- Frontend code pushed to GitHub

---

## Phase 1: Set Up Cloudflare Account (5 minutes)

### 1.1 Create Account
1. Go to https://dash.cloudflare.com/sign-up
2. Create a free account
3. Verify your email

---

## Phase 2: Buy Domain (5 minutes)

### 2.1 Purchase Domain via Cloudflare
1. In Cloudflare dashboard, click **"Domain Registration"** (left sidebar)
2. Search for your desired domain (e.g., `myshop.com`)
3. Select domain and click **"Purchase"** (~$8-15/year)
4. Complete payment
5. Domain is automatically added to your Cloudflare account

> **Alternative**: If you already own a domain elsewhere:
> - Add it to Cloudflare
> - Change your domain's nameservers to:
>   - `ns1.cloudflare.com`
>   - `ns2.cloudflare.com`

---

## Phase 3: Set Up Cloudflare R2 (10 minutes)

### 3.1 Enable R2
1. In Cloudflare dashboard, click **"R2"** (left sidebar)
2. Click **"Purchase R2 Plan"**
3. Accept terms (free to enable, pay-as-you-go: ~$1.50/100GB/month)

### 3.2 Create R2 Bucket
1. Click **"Create bucket"**
2. **Name:** `clothing-shop-images`
3. **Location:** Automatic (or choose nearest region)
4. Click **"Create bucket"**

### 3.3 Make Bucket Public
1. Click on your bucket `clothing-shop-images`
2. Go to **"Settings"** tab
3. Scroll to **"Public access"** section
4. Click **"Allow Access"**
5. **COPY AND SAVE** the **Public Bucket URL**
   - Format: `https://pub-xxxxxxxxxxxxx.r2.dev`

### 3.4 Create API Token
1. Go back to **R2** main page
2. Click **"Manage R2 API Tokens"**
3. Click **"Create API token"**
4. **Token name:** `clothing-shop-backend`
5. **Permissions:** Object Read & Write
6. **TTL:** Forever
7. **Apply to specific buckets only:** Select `clothing-shop-images`
8. Click **"Create API token"**

### 3.5 Save Credentials
**IMPORTANT:** Copy and save these values immediately (shown only once):

```
Access Key ID: xxxxxxxxxxxxxxxxxxxxxxxx
Secret Access Key: yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
```

Also note your **Account ID** (found in R2 URL):
- URL format: `dash.cloudflare.com/[ACCOUNT-ID]/r2`
- Example: If URL is `dash.cloudflare.com/abc123def456/r2`, your Account ID is `abc123def456`

**Save all these values:**
```
R2_ACCOUNT_ID=abc123def456
R2_ACCESS_KEY_ID=xxxxxxxxxxxxxxxxxxxxxxxx
R2_SECRET_ACCESS_KEY=yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
R2_BUCKET_NAME=clothing-shop-images
R2_PUBLIC_URL=https://pub-xxxxxxxxxxxxx.r2.dev
```

---

## Phase 4: Deploy Backend to Vercel (15 minutes)

### 4.1 Push Code to GitHub
Make sure your backend code is committed and pushed to GitHub.

### 4.2 Deploy to Vercel
1. Go to https://vercel.com
2. Click **"Sign Up"** and choose **"Continue with GitHub"**
3. Click **"Add New..."** → **"Project"**
4. **Import** your backend repository
5. **Configure Project:**
   - **Framework Preset:** Other
   - **Root Directory:** `./` (leave as is)
   - **Build Command:** (leave empty)
   - **Output Directory:** (leave empty)
6. Click **"Deploy"** (will fail - that's OK, we need to add environment variables)

### 4.3 Add Environment Variables
1. Go to your project → **Settings** → **Environment Variables**
2. Add the following variables (all environments: Production, Preview, Development):

```
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-ID].supabase.co:5432/postgres
JWT_SECRET=your-jwt-secret-from-local-env
NODE_ENV=production
R2_ACCOUNT_ID=abc123def456
R2_ACCESS_KEY_ID=xxxxxxxxxxxxxxxxxxxxxxxx
R2_SECRET_ACCESS_KEY=yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
R2_BUCKET_NAME=clothing-shop-images
R2_PUBLIC_URL=https://pub-xxxxxxxxxxxxx.r2.dev
```

**How to get DATABASE_URL from Supabase:**
1. Go to your Supabase project dashboard
2. Click **"Settings"** → **"Database"**
3. Scroll to **"Connection string"** → **"URI"**
4. Copy the connection string and replace `[YOUR-PASSWORD]` with your database password

### 4.4 Redeploy with Environment Variables
1. Go to **Deployments** tab
2. Click the **"..."** menu on the latest deployment
3. Click **"Redeploy"**
4. Wait for deployment to complete (~1-2 minutes)
5. Click on the deployment URL to verify it works
   - You should see API documentation at: `https://your-project.vercel.app/api-docs`

### 4.5 Add Custom Domain to Backend
1. Go to **Settings** → **Domains**
2. Add domain: `api.yourdomain.com` (replace with your actual domain)
3. Vercel will show you DNS records to add

**Note the DNS instructions** - we'll configure them in Phase 5.

---

## Phase 5: Configure DNS in Cloudflare (5 minutes)

### 5.1 Add DNS Records for Backend
1. Go to **Cloudflare** → **Your Domain** → **DNS** → **Records**
2. Click **"Add record"**

Add this record:

| Type | Name | Target | Proxy Status |
|------|------|--------|--------------|
| CNAME | api | cname.vercel-dns.com | DNS only (gray cloud) |

3. Click **"Save"**

### 5.2 Verify Backend Domain
1. Go back to Vercel → Your Backend Project → **Settings** → **Domains**
2. Wait 2-5 minutes for DNS to propagate
3. Domain should show **"Valid Configuration"** ✅
4. Test: Visit `https://api.yourdomain.com/api-docs`

---

## Phase 6: Deploy Frontend to Vercel (15 minutes)

### 6.1 Update Frontend Environment Variable
In your **frontend** code, update the API URL:

**For Vite (React/Vue):**
Create/update `.env.production`:
```
VITE_API_URL=https://api.yourdomain.com/api
```

**For Create React App:**
Create/update `.env.production`:
```
REACT_APP_API_URL=https://api.yourdomain.com/api
```

**For Next.js:**
Update `next.config.js` or `.env.production`:
```
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api
```

### 6.2 Commit and Push
```bash
git add .env.production
git commit -m "Add production API URL"
git push
```

### 6.3 Deploy to Vercel
1. Go to Vercel dashboard
2. Click **"Add New..."** → **"Project"**
3. **Import** your frontend repository
4. **Configure Project:**
   - **Framework Preset:** (Auto-detected: React/Next.js/Vue)
   - **Root Directory:** `./` (or your frontend folder if monorepo)
   - **Build Command:** `npm run build` (usually auto-detected)
   - **Output Directory:** `dist` or `build` (usually auto-detected)

5. **Environment Variables:**
   Add your production API URL:
   ```
   VITE_API_URL=https://api.yourdomain.com/api
   ```
   (or `REACT_APP_API_URL` / `NEXT_PUBLIC_API_URL` depending on your framework)

6. Click **"Deploy"**
7. Wait for deployment (~2-3 minutes)
8. Verify it works by clicking the deployment URL

### 6.4 Add Custom Domain to Frontend
1. Go to **Settings** → **Domains**
2. Add two domains:
   - `yourdomain.com`
   - `www.yourdomain.com`
3. Vercel will provide DNS instructions

### 6.5 Add DNS Records for Frontend
1. Go to **Cloudflare** → **Your Domain** → **DNS** → **Records**

Add these records:

| Type | Name | Target | Proxy Status |
|------|------|--------|--------------|
| CNAME | @ | cname.vercel-dns.com | DNS only (gray cloud) |
| CNAME | www | cname.vercel-dns.com | DNS only (gray cloud) |

2. Click **"Save"**

### 6.6 Verify Frontend Domain
1. Wait 2-5 minutes for DNS propagation
2. In Vercel, domains should show **"Valid Configuration"** ✅
3. Test: Visit `https://yourdomain.com`

---

## Phase 7: Final Testing (10 minutes)

### Test Checklist:

- [ ] **Frontend loads:** Visit `https://yourdomain.com`
- [ ] **Login works:** Test user authentication
- [ ] **Items display:** View product list
- [ ] **Admin panel:** Login as admin
- [ ] **Image upload (R2):** Add a new product with image
  - Image should upload to R2
  - Image URL should be: `https://pub-xxxxx.r2.dev/items/xxxxx.jpg`
  - Image should display on frontend
- [ ] **Edit product:** Update product with new image
- [ ] **Create sale:** Process a transaction
- [ ] **Reports work:** View dashboard and reports
- [ ] **API docs:** Visit `https://api.yourdomain.com/api-docs`

---

## Phase 8: Monitor R2 Storage Usage

### Check R2 Usage:
1. Go to **Cloudflare** → **R2**
2. Click on your bucket `clothing-shop-images`
3. View **Metrics** tab to see:
   - Total storage used
   - Number of objects
   - Bandwidth used

### Cost Estimation:
- Storage: $0.015/GB/month
- 100GB = $1.50/month
- First 10GB free

---

## Troubleshooting

### Issue: Images not uploading
**Check:**
1. Vercel environment variables are set correctly
2. R2 credentials are correct
3. R2 bucket is set to public access
4. Check Vercel function logs for errors

### Issue: Domain not working
**Check:**
1. DNS records are correct (CNAME pointing to `cname.vercel-dns.com`)
2. Wait 5-10 minutes for DNS propagation
3. Proxy status is "DNS only" (gray cloud)

### Issue: Backend API not responding
**Check:**
1. Vercel deployment succeeded
2. Environment variables are set
3. Database connection string is correct
4. Check Vercel function logs

### Issue: CORS errors
**Check:**
1. Frontend is using correct API URL
2. Backend CORS settings allow your domain

---

## Environment Variables Summary

### Backend (Vercel):
```
DATABASE_URL=postgresql://...
JWT_SECRET=...
NODE_ENV=production
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=clothing-shop-images
R2_PUBLIC_URL=https://pub-xxxxx.r2.dev
```

### Frontend (Vercel):
```
VITE_API_URL=https://api.yourdomain.com/api
```

---

## Cost Breakdown

| Service | Plan | Cost |
|---------|------|------|
| Cloudflare Domain | .com domain | ~$9/year ($0.75/month) |
| Cloudflare R2 | Pay-as-you-go | $1.50/month (100GB) |
| Vercel Backend | Hobby (Free) | $0 |
| Vercel Frontend | Hobby (Free) | $0 |
| Supabase Database | Free tier | $0 |
| **TOTAL** | | **~$2.25/month** |

---

## Next Steps After Deployment

1. **Set up monitoring:** Use Vercel Analytics (free)
2. **Enable SSL:** Automatic via Vercel (free)
3. **Set up backups:** Supabase has automatic backups
4. **Monitor R2 usage:** Check monthly to avoid overages
5. **Set up alerts:** Cloudflare can alert you on high usage

---

## Support

- **Vercel Docs:** https://vercel.com/docs
- **Cloudflare R2 Docs:** https://developers.cloudflare.com/r2
- **Supabase Docs:** https://supabase.com/docs

---

**Deployment Date:** 2025-12-30
**Estimated Time:** ~70 minutes total
**Difficulty:** Intermediate

Good luck with your deployment! 🚀
