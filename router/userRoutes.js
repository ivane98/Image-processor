import express from "express";
import {
  registerUser,
  loginUser,
  getUser,
} from "../controllers/userController.js";
import { protect } from "../middleware/authMiddleware.js";
const router = express.Router();

router.get("/me", protect, getUser);

router.post("/", registerUser);

router.post("/login", loginUser);

export default router;
