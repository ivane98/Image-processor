import Image from "../models/imageModel.js";
import User from "../models/userModel.js";
import {
  PutObjectCommand,
  S3Client,
  GetObjectCommand,
  DeleteObjectCommand,
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

const streamToBuffer = async (stream) => {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
};

const transform = async (id, userId, transformations, mimetype) => {
  const image = await Image.findOne({
    userId,
    _id: id,
  });

  if (!image) throw new Error("Image not found");

  const getObjectParams = {
    Bucket: process.env.BUCKET_NAME,
    Key: image.imageName,
  };
  const { Body } = await s3.send(new GetObjectCommand(getObjectParams));
  const originalBuffer = await streamToBuffer(Body);

  const transformedImageBuffer = await sharp(originalBuffer)
    .resize(transformations.resize)
    .rotate(transformations.rotate)
    .toBuffer();

  const putParams = {
    Bucket: process.env.BUCKET_NAME,
    Key: image.imageName,
    Body: transformedImageBuffer,
    ContentType: mimetype,
  };

  await s3.send(new PutObjectCommand(putParams));

  const command = new GetObjectCommand({
    Bucket: process.env.BUCKET_NAME,
    Key: image.imageName,
  });
  const transformedImageUrl = await getSignedUrl(s3, command, {
    expiresIn: 3600,
  });

  return transformedImageUrl;
};

export const getImages = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const images = await Image.find({ userId: req.user.id })
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

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

export const getImage = async (req, res) => {
  const image = await Image.findOne({
    userId: req.user.id,
    _id: req.params.id,
  });

  if (!image) {
    return res.status(404).json({ message: "Image not found" });
  }

  if (!image.imageName) {
    return res
      .status(400)
      .json({ message: "No S3 key (imageName) stored for this image" });
  }

  const getObjectParams = {
    Bucket: process.env.BUCKET_NAME,
    Key: image.imageName,
  };

  const command = new GetObjectCommand(getObjectParams);
  const url = await getSignedUrl(s3, command, { expiresIn: 3600 });

  image.imageUrl = url;

  res.json(image);
};

export const uploadImage = async (req, res) => {
  if (!req.body?.title) {
    res.status(400);
    throw new Error("add title");
  }

  // const buffer = await sharp(req.file.buffer)
  //   .resize({ height: 1920, width: 1080, fit: "contain" })
  //   .toBuffer();

  const imageName = randomImageName();

  const params = {
    Bucket: process.env.BUCKET_NAME,
    Key: imageName,
    Body: buffer,
    ContentType: req.file.mimetype,
  };

  const command = new PutObjectCommand(params);

  await s3.send(command);

  const image = await Image.create({
    title: req.body?.title,
    userId: req.user._id,
    imageName,
  });

  res.send(image);
};

export const transformImage = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const { transformations } = req.body;
  const mimetype = req.file?.mimetype || "image/jpeg"; // fallback

  if (!id || !transformations) {
    return res
      .status(400)
      .json({ message: "Id and transformations are required" });
  }

  try {
    const imageUrl = await transform(id, userId, transformations, mimetype);
    res
      .status(200)
      .json({ imageUrl, message: "Image transformed successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
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

  const params = {
    Bucket: process.env.BUCKET_NAME,
    Key: image.imageName,
  };

  const command = new DeleteObjectCommand(params);

  await s3.send(command);

  await image.deleteOne();

  res.send(image);
};
