import express from "express";
import {
  uploadImage,
  deleteImage,
  getImages,
  transformImage,
  getImage,
} from "../controllers/imageController.js";
import { protect } from "../middleware/authMiddleware.js";
import multer from "multer";
import rateLimit from "express-rate-limit";
import {
  validateUpload,
  validateGetImages,
  validateGetImage,
  validateDeleteImage,
  validateTransform,
} from "../middleware/validators/imageValidator.js";

import { validateRequest } from "../middleware/validators/validateRequest.js";
import { validateFile } from "../middleware/validators/fileValidator.js";

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, //5mb max
});

const router = express.Router();

const transformLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { message: "Too many image transformations, slow down!" },
  keyGenerator: (req) => req.user.id, // per user instead of IP
});

router.get("/", protect, validateGetImages, validateRequest, getImages);

router.get("/:id", protect, validateGetImage, validateRequest, getImage);

router.post(
  "/",
  protect,
  upload.single("image"),
  validateFile,
  validateUpload,
  validateRequest,
  uploadImage
);

router.post(
  "/:id/transform",
  protect,
  transformLimiter,
  validateTransform,
  validateRequest,
  transformImage
);

router.delete(
  "/:id",
  protect,
  validateDeleteImage,
  validateRequest,
  deleteImage
);

export default router;
