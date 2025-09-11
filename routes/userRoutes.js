import express from "express";
import {
  registerUser,
  loginUser,
  getUser,
} from "../controllers/userController.js";
import { protect } from "../middleware/authMiddleware.js";
import {
  validateLogin,
  validateRegister,
} from "../middleware/validators/userValidator.js";
import { validateRequest } from "../middleware/validators/validateRequest.js";

const router = express.Router();

router.get("/me", protect, getUser);

router.post("/", validateRegister, validateRequest, registerUser);

router.post("/login", validateLogin, validateRequest, loginUser);

export default router;
