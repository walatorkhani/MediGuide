const multer = require("multer");
const path = require("path");

// Stocke les photos de profil professionnel sur disque, dans
// backend/uploads/photos, servi statiquement via /uploads (voir server.js).
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, "..", "uploads", "photos")),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `facility-${req.params.id}-${Date.now()}${ext}`);
  },
});

const TYPES_AUTORISES = [".jpg", ".jpeg", ".png", ".webp"];

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!TYPES_AUTORISES.includes(ext)) {
    return cb(new Error("Format d'image non autorisé (jpg, png, webp uniquement)."));
  }
  cb(null, true);
}

module.exports = multer({
  storage,
  fileFilter,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3 Mo
});
