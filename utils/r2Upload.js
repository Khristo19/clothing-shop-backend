const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } = require('../config/r2');

/**
 * Upload a file to Cloudflare R2
 * @param {Buffer} fileBuffer - File buffer from multer
 * @param {string} fileName - Unique file name
 * @param {string} mimeType - File MIME type
 * @returns {Promise<string>} Public URL of uploaded file
 */
async function uploadToR2(fileBuffer, fileName, mimeType) {
    const filePath = `items/${fileName}`;

    const command = new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: filePath,
        Body: fileBuffer,
        ContentType: mimeType,
        CacheControl: 'public, max-age=31536000', // 1 year cache
    });

    try {
        await r2Client.send(command);

        // Return public URL
        const publicUrl = `${R2_PUBLIC_URL}/${filePath}`;
        return publicUrl;
    } catch (error) {
        console.error('R2 upload error:', error);
        throw new Error('Failed to upload image to R2');
    }
}

module.exports = { uploadToR2 };
