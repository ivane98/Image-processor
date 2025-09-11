// middleware/validators/imageValidator.js
import { body, param, query } from "express-validator";

export const validateUpload = [
  body("title").notEmpty().withMessage("Title is required"),
];

export const validateGetImages = [
  query("page").optional().isInt({ min: 1 }).withMessage("Page must be >= 1"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
];

export const validateGetImage = [
  param("id").isMongoId().withMessage("Invalid image ID"),
];

export const validateDeleteImage = [
  param("id").isMongoId().withMessage("Invalid image ID"),
];

export const validateTransform = [
  param("id").isMongoId().withMessage("Invalid image ID"),

  body("transformations")
    .notEmpty()
    .withMessage("Transformations are required"),
  body("transformations.resize.width").optional().isInt({ min: 1 }),
  body("transformations.resize.height").optional().isInt({ min: 1 }),
  body("transformations.crop.width").optional().isInt({ min: 1 }),
  body("transformations.crop.height").optional().isInt({ min: 1 }),
  body("transformations.crop.x").optional().isInt({ min: 0 }),
  body("transformations.crop.y").optional().isInt({ min: 0 }),
  body("transformations.rotate").optional().isInt(),
  body("transformations.format")
    .optional()
    .isIn(["jpeg", "png", "webp"])
    .withMessage("Format must be jpeg, png, or webp"),
  body("transformations.filters.grayscale").optional().isBoolean(),
  body("transformations.filters.sepia").optional().isBoolean(),
];
