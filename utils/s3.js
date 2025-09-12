import {
  PutObjectCommand,
  S3Client,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const s3 = new S3Client({
  credentials: {
    accessKeyId: process.env.ACCESS_KEY,
    secretAccessKey: process.env.SECRET_ACCESS_KEY,
  },
  region: process.env.BUCKET_REGION,
});

export const uploadToS3 = async (buffer, key, mimetype) => {
  const params = {
    Bucket: process.env.BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: mimetype,
  };
  await s3.send(new PutObjectCommand(params));
};

export const getObjectFromS3 = async (key) => {
  try {
    const { Body } = await s3.send(
      new GetObjectCommand({
        Bucket: process.env.BUCKET_NAME,
        Key: key,
      })
    );

    return Body;
  } catch (error) {
    console.error("Error fetching object from S3:", error);
    throw new Error("Unable to fetch object from S3");
  }
};

export const getSignedUrlForKey = async (key, expiresIn = 3600) => {
  const command = new GetObjectCommand({
    Bucket: process.env.BUCKET_NAME,
    Key: key,
  });
  return getSignedUrl(s3, command, { expiresIn });
};

export const deleteFromS3 = async (key) => {
  await s3.send(
    new DeleteObjectCommand({ Bucket: process.env.BUCKET_NAME, Key: key })
  );
};
