// middleware/validators/fileValidator.js
export const validateFile = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ message: "Image file is required" });
  }

  // Check MIME type
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(req.file.mimetype)) {
    return res.status(400).json({ message: "Invalid file type" });
  }

  // Check file size (example: 5MB max)
  const maxSize = 5 * 1024 * 1024;
  if (req.file.size > maxSize) {
    return res.status(400).json({ message: "File too large (max 5MB)" });
  }

  next();
};
