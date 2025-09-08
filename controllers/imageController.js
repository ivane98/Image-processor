import Image from "../models/imageModel.js";
import User from "../models/userModel.js";
import {
  PutObjectCommand,
  S3Client,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import crypto from "crypto";
import sharp from "sharp";

const s3 = new S3Client({
  credentials: {
    accessKeyId: process.env.ACCESS_KEY,
    secretAccessKey: process.env.SECRET_ACCESS_KEY,
  },
  region: process.env.BUCKET_REGION,
});

const randomImageName = (bytes = 32) =>
  crypto.randomBytes(bytes).toString("hex");

export const getImages = async (req, res) => {
  const images = await Image.find({ userId: req.user.id });

  for (const image of images) {
    const getObjectParams = {
      Bucket: process.env.BUCKET_NAME,
      Key: image.imageName,
    };
    const command = new GetObjectCommand(getObjectParams);
    const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
    image.imageUrl = url;
  }

  res.send(images);
};

export const createImage = async (req, res) => {
  if (!req.body?.title) {
    res.status(400);
    throw new Error("add title");
  }

  // console.log("req.file", req.file);
  // console.log("req.body", req.body);

  const buffer = await sharp(req.file.buffer)
    .resize({ height: 1920, width: 1080, fit: "contain" })
    .toBuffer();

  const imageName = randomImageName();

  const params = {
    Bucket: process.env.BUCKET_NAME,
    Key: imageName,
    Body: buffer,
    ContentType: req.file.mimetype,
  };

  const command = new PutObjectCommand(params);

  await s3.send(command);

  console.log(req.user);

  const image = await Image.create({
    title: req.body?.title,
    userId: req.user._id,
    imageName,
  });

  res.send(image);
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
