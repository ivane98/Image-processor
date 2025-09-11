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

const REDIS_EXPIRE = 3600; // 1 hour

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

const uploadToS3 = async (buffer, key, mimetype) => {
  const params = {
    Bucket: process.env.BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: mimetype,
  };
  await s3.send(new PutObjectCommand(params));
};

const getSignedUrlForKey = async (key, expiresIn = 3600) => {
  const command = new GetObjectCommand({
    Bucket: process.env.BUCKET_NAME,
    Key: key,
  });
  return getSignedUrl(s3, command, { expiresIn });
};

const deleteFromS3 = async (key) => {
  await s3.send(
    new DeleteObjectCommand({ Bucket: process.env.BUCKET_NAME, Key: key })
  );
};

const transform = async (id, userId, transformations, mimetype) => {
  if (!transformations || typeof transformations !== "object") {
    throw new Error("Invalid transformations object");
  }

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

  const { Body } = await s3.send(
    new GetObjectCommand({
      Bucket: process.env.BUCKET_NAME,
      Key: image.imageName,
    })
  );
  const originalBuffer = await streamToBuffer(Body);

  let sharpInstance = sharp(originalBuffer);

  if (transformations.resize) {
    const width = Number(transformations.resize.width);
    const height = Number(transformations.resize.height);
    if (width > 0 && height > 0) {
      sharpInstance = sharpInstance.resize({ width, height, fit: "cover" });
    }
  }

  if (transformations.crop) {
    const { width, height, x, y } = transformations.crop;
    const metadata = await sharpInstance.metadata();
    if (
      x >= 0 &&
      y >= 0 &&
      width > 0 &&
      height > 0 &&
      x + width <= metadata.width &&
      y + height <= metadata.height
    ) {
      sharpInstance = sharpInstance.extract({ left: x, top: y, width, height });
    } else {
      throw new Error("Invalid crop dimensions – outside image bounds");
    }
  }

  if (transformations.rotate) {
    sharpInstance = sharpInstance.rotate(Number(transformations.rotate));
  }

  if (transformations.filters?.grayscale) {
    sharpInstance = sharpInstance.grayscale();
  }
  if (transformations.filters?.sepia) {
    sharpInstance = sharpInstance.modulate({
      saturation: 0.3,
      hue: 30,
    });
  }

  const format = transformations.format || "jpeg";

  sharpInstance = sharpInstance.toFormat(format);

  const transformedImageBuffer = await sharpInstance.toBuffer();

  const finalMetadata = await sharp(transformedImageBuffer).metadata();

  const transformedKey = `${image.imageName}-transformed-${crypto
    .createHash("md5")
    .update(JSON.stringify(transformations))
    .digest("hex")}`;

  await uploadToS3(transformedImageBuffer, transformedKey, mimetype);

  const imageUrl = await getSignedUrlForKey(transformedKey);

  await redis.set(
    cacheKey,
    JSON.stringify({ imageUrl, finalMetadata }),
    "EX",
    REDIS_EXPIRE
  );

  return { imageUrl, finalMetadata };
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

  // for (const image of images) {
  //   const getObjectParams = {
  //     Bucket: process.env.BUCKET_NAME,
  //     Key: image.imageName,
  //   };
  //   const command = new GetObjectCommand(getObjectParams);
  //   const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
  //   image.imageUrl = url;
  // }

  await Promise.all(
    images.map(
      async (img) => (img.imageUrl = await getSignedUrlForKey(img.imageName))
    )
  );

  await redis.set(cacheKey, JSON.stringify(images), "EX", 60 * 60);

  res.send(images);
};

export const getImage = async (req, res) => {
  const cacheKey = `image:${req.user.id}:${req.params.id}`;

  const cached = await redis.get(cacheKey);
  if (cached) {
    console.log("Cache hit for", cacheKey);
    return res.send(JSON.parse(cached));
  }

  console.log("Cache miss for", cacheKey);

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

  // const getObjectParams = {
  //   Bucket: process.env.BUCKET_NAME,
  //   Key: image.imageName,
  // };

  // const command = new GetObjectCommand(getObjectParams);
  // const url = await getSignedUrl(s3, command, { expiresIn: 3600 });

  image.imageUrl = await getSignedUrlForKey(image.imageName);

  await redis.set(cacheKey, JSON.stringify(image), "EX", 60 * 60);

  res.send(image);
};

export const uploadImage = async (req, res) => {
  if (!req.body?.title) {
    res.status(400).json({ message: "Title missing" });
  }

  const imageName = randomImageName();

  await uploadToS3(req.file.buffer, imageName, req.file.mimetype);

  // const params = {
  //   Bucket: process.env.BUCKET_NAME,
  //   Key: imageName,
  //   Body: req.file.buffer,
  //   ContentType: req.file.mimetype,
  // };

  // const command = new PutObjectCommand(params);

  // await s3.send(command);

  const image = await Image.create({
    title: req.body?.title,
    userId: req.user._id,
    imageName,
  });

  res.status(201).send(image);
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
    res.status(400).json({ message: "Image not found" });
  }
  const user = await User.findById(req.user.id);

  if (!user) {
    res.status(401).json({ message: "User not found" });
  }

  if (image.userId.toString() !== user.id) {
    res.status(401).json({ message: "User not authorized" });
  }

  // const params = {
  //   Bucket: process.env.BUCKET_NAME,
  //   Key: image.imageName,
  // };

  // const command = new DeleteObjectCommand(params);

  // await s3.send(command);

  await deleteFromS3(image.imageName);
  await image.deleteOne();

  res.status(200).send(image);
};
