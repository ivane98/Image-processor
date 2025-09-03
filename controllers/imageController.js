import Image from "../models/imageModel.js";
import User from "../models/userModel.js";

export const getImages = async (req, res) => {
  const images = await Image.find({ userId: req.user.id });
  return res.status(200).json(images);
};

export const createImage = async (req, res) => {
  if (!req.body?.title) {
    res.status(400);
    throw new Error("add title");
  }

  const image = await Image.create({
    title: req.body?.title,
    userId: req.user.id,
  });
  res.status(201).json(image);
};

export const updateImage = async (req, res) => {
  const image = await Image.findById(req.params.id);
  if (!image) {
    res.status(400);
    throw new Error("Provide id");
  }

  const user = await User.findById(req.user.id);

  if (!user) {
    res.status(401);
    throw new Error("User not found");
  }

  if (image.userId.toString() !== user.id) {
    res.status(401);
    throw new Error("Not authorized");
  }

  const updatedImage = await Image.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });
  res.status(201).json(updatedImage);
};

export const deleteImage = async (req, res) => {
  const image = await Image.findById(req.params.id);
  if (!image) {
    res.status(400);
    throw new Error("Provide id");
  }
  const user = await User.findById(req.user.id);

  if (!user) {
    res.status(401);
    throw new Error("User not found");
  }

  if (image.userId.toString() !== user.id) {
    res.status(401);
    throw new Error("User Not authorized");
  }

  await image.deleteOne();

  res.status(200).json({ id: req.params.id });
};
