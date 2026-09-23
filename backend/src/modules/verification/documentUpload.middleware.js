const multer = require("multer");
const path = require("path");
const fs = require("fs");

const PRIVATE_DOCS_DIR = path.resolve(__dirname, "../../../private_uploads/documents");

// Ensure private documents directory exists
if (!fs.existsSync(PRIVATE_DOCS_DIR)) {
  fs.mkdirSync(PRIVATE_DOCS_DIR, { recursive: true });
}

// Storage configuration - strictly saves into private_uploads (NOT express.static)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, PRIVATE_DOCS_DIR);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    cb(null, `doc_${uniqueSuffix}${ext}`);
  }
});

// File filter: allows images and PDFs
const fileFilter = (req, file, cb) => {
  const allowedMimes = ["image/jpeg", "image/png", "image/webp", "image/jpg", "application/pdf"];
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExts = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];

  if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid document format. Only PDF, PNG, JPG, and WEBP files are accepted."));
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter
});

const handleDocumentUpload = (fieldName = "document") => {
  const uploadSingle = upload.single(fieldName);
  return (req, res, next) => {
    uploadSingle(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            success: false,
            message: "Document file size exceeds the 10MB limit."
          });
        }
        return res.status(400).json({
          success: false,
          message: `Upload error: ${err.message}`
        });
      } else if (err) {
        return res.status(400).json({
          success: false,
          message: err.message || "Failed to upload document."
        });
      }
      next();
    });
  };
};

module.exports = {
  handleDocumentUpload,
  PRIVATE_DOCS_DIR
};
