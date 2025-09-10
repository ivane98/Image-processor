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
import redis from "../utils/redis.js";

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
  const cacheKey = `transform:${userId}:${id}:${JSON.stringify(
    transformations
  )}`;

  const cachedUrl = await redis.get(cacheKey);

  if (cachedUrl) {
    console.log("cache hit for ", cacheKey);
    return cachedUrl;
  }

  console.log("Cache miss for", cacheKey);

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

  let sharpInstance = sharp(originalBuffer);

  // ✅ Resize
  if (transformations.resize) {
    sharpInstance = sharpInstance.resize({
      width: Number(transformations.resize.width),
      height: Number(transformations.resize.height),
      fit: "cover",
    });
  }

  // ✅ Crop
  if (transformations.crop) {
    const metadata = await sharpInstance.metadata();

    const cropWidth = Number(transformations.crop.width);
    const cropHeight = Number(transformations.crop.height);
    const cropX = Number(transformations.crop.x);
    const cropY = Number(transformations.crop.y);

    if (
      cropX + cropWidth <= metadata.width &&
      cropY + cropHeight <= metadata.height
    ) {
      sharpInstance = sharpInstance.extract({
        left: cropX,
        top: cropY,
        width: cropWidth,
        height: cropHeight,
      });
    } else {
      throw new Error("Invalid crop dimensions – outside image bounds");
    }
  }

  // ✅ Rotate
  if (transformations.rotate) {
    sharpInstance = sharpInstance.rotate(Number(transformations.rotate));
  }

  // ✅ Filters
  if (transformations.filters?.grayscale) {
    sharpInstance = sharpInstance.grayscale();
  }
  if (transformations.filters?.sepia) {
    sharpInstance = sharpInstance.modulate({
      saturation: 0.3,
      hue: 30,
    });
  }

  // ✅ Format
  if (transformations.format) {
    sharpInstance = sharpInstance.toFormat(transformations.format);
  }

  // 3. Get transformed buffer
  const transformedImageBuffer = await sharpInstance.toBuffer();

  const finalMetadata = await sharp(transformedImageBuffer).metadata();

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

  await redis.set(cacheKey, transformedImageUrl, "EX", 60 * 60);

  return { imageUrl: transformedImageUrl, metadata: finalMetadata };
};

export const getImages = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const cacheKey = `images:${req.user.id}:page=${page}:limit=${limit}`;

  const cached = await redis.get(cacheKey);
  if (cached) {
    console.log("Cache hit for", cacheKey);
    return res.send(JSON.parse(cached));
  }

  console.log("Cache miss for", cacheKey);

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

  await redis.set(cacheKey, JSON.stringify(images), "EX", 60 * 60);

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

  const imageName = randomImageName();

  const params = {
    Bucket: process.env.BUCKET_NAME,
    Key: imageName,
    Body: req.file.buffer,
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
  const mimetype = req.file?.mimetype || "image/jpeg";

  if (!id || !transformations) {
    return res
      .status(400)
      .json({ message: "Id and transformations are required" });
  }

  try {
    const { imageUrl, metadata } = await transform(
      id,
      userId,
      transformations,
      mimetype
    );
    res
      .status(200)
      .json({ imageUrl, metadata, message: "Image transformed successfully" });
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
