import express from "express";
import {
  createImage,
  deleteImage,
  getImages,
  updateImage,
} from "../controllers/imageController.js";
import { protect } from "../middleware/authMiddleware.js";
const router = express.Router();

router.get("/", protect, getImages);

router.post("/", protect, createImage);

router.put("/:id", protect, updateImage);

router.delete("/:id", protect, deleteImage);

export default router;
