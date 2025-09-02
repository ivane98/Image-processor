import express from "express";
import {
  createImage,
  deleteImage,
  getImages,
  updateImage,
} from "../controllers/imageController.js";
const router = express.Router();

router.get("/images", getImages);

router.post("/images", createImage);

router.put("/images/:id", updateImage);

router.delete("/images/:id", deleteImage);

export default router;
