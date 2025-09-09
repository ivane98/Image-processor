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
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const router = express.Router();

router.get("/", protect, getImages);

router.get("/:id", protect, getImage);

router.post("/", protect, upload.single("image"), uploadImage);

router.post("/:id/transform", protect, transformImage);

router.delete("/:id", protect, deleteImage);

export default router;
