const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'articles');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage engine configuration with unique UUID filenames
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${Date.now()}-${crypto.randomUUID()}${ext}`;
    cb(null, uniqueName);
  },
});

// Strict MIME type & extension whitelist (rejects SVGs to prevent stored XSS)
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext) || !ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    const error = new Error('Unsupported file type. Only JPEG, PNG, WEBP, and GIF images are permitted.');
    error.statusCode = 415;
    return cb(error, false);
  }
  cb(null, true);
};

const maxSizeBytes = parseInt(process.env.UPLOAD_MAX_SIZE, 10) || 5 * 1024 * 1024; // 5MB

const upload = multer({
  storage,
  limits: {
    fileSize: maxSizeBytes,
    files: 1,
  },
  fileFilter,
});

module.exports = upload;
