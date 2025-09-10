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
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const router = express.Router();

const transformLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { message: "Too many image transformations, slow down!" },
});

router.get("/", protect, getImages);

router.get("/:id", protect, getImage);

router.post("/", protect, upload.single("image"), uploadImage);

router.post("/:id/transform", protect, transformLimiter, transformImage);

router.delete("/:id", protect, deleteImage);

export default router;
