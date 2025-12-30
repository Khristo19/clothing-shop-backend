const { S3Client } = require('@aws-sdk/client-s3');

// Cloudflare R2 is S3-compatible
const r2Client = new S3Client({
    region: 'auto', // R2 uses 'auto' for region
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'clothing-shop-images';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL; // e.g., https://pub-xxxxx.r2.dev

if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
    console.warn('⚠️  R2 credentials not configured. Image uploads will fail.');
}

module.exports = {
    r2Client,
    R2_BUCKET_NAME,
    R2_PUBLIC_URL
};
