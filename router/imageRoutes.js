import express from "express";
import {
  createImage,
  deleteImage,
  getImages,
  updateImage,
} from "../controllers/imageController.js";
import { protect } from "../middleware/authMiddleware.js";
import multer from "multer";
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const router = express.Router();

router.get("/", protect, getImages);

router.post("/", protect, upload.single("image"), createImage);

router.put("/:id", protect, updateImage);

router.delete("/:id", protect, deleteImage);

export default router;
