# 🖼️ Image Management & Transformation API

A **image management and transformation API** built with **Node.js, Express, MongoDB, AWS S3, Redis, and Sharp**.  
This project allows authenticated users to **upload, fetch, transform, and delete images** with support for advanced image operations like **resize, crop, rotate, filters, and format conversion**.

---

## ✨ Features

- 🔐 **Authentication & Authorization** – Secure JWT-based user system  
- ☁️ **Cloud Storage** – Store images in AWS S3 with unique keys  
- 🛠 **Image Transformations** – Resize, crop, rotate, grayscale, sepia, and format conversion (JPEG, PNG, WebP, etc.)  
- ⚡ **Caching Layer** – Redis caching for faster responses & reduced S3 calls  
- 🔗 **Presigned URLs** – Time-limited secure access to images in S3  
- 📑 **Pagination** – Efficient image listing with `page` and `limit` queries  
- 🗑 **Deletion** – Remove images from both MongoDB and S3  

---

## 🛠 Tech Stack

- **Backend:** Node.js, Express  
- **Database:** MongoDB + Mongoose  
- **Cache:** Redis (ioredis)  
- **Cloud Storage:** AWS S3  
- **Image Processing:** Sharp  
- **Auth:** JWT + Bcrypt  

---

## 🚀 Getting Started

### 1. Clone the repository
```
git clone https://github.com/your-username/image-processor.git
cd image-processor
```

### 2. Install dependencies
```
npm install
```

### 3. Set up environment variables
```
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
ACCESS_KEY=your_aws_access_key
SECRET_ACCESS_KEY=your_aws_secret_key
BUCKET_NAME=your_s3_bucket_name
BUCKET_REGION=your_s3_region
NODE_ENV=development
```

### 4. Run the server
```bash
nmp run dev
```
Server will start at:
👉 http://localhost:5000

## 📡 API Endpoints
### Authentication

 - POST /api/users – Register a new user

 - POST /api/users/login – Login user and get JWT

 - GET /api/users/me – Get logged-in user info (protected)

### Images

 - POST /api/images – Upload a new image (protected)

 - GET /api/images – Get all user images with pagination (protected)

 - GET /api/images/:id – Get a single image by ID (protected)

 - POST /api/images/:id/transform – Transform an image (resize, crop, filters, etc.) (protected)

 - DELETE /api/images/:id – Delete an image (protected)

## 🧪 Example Transformation Request
```
POST /api/images/:id/transform
Content-Type: application/json
Authorization: Bearer <token>

{
  "transformations": {
    "resize": { "width": 300, "height": 300 },
    "crop": { "x": 50, "y": 50, "width": 200, "height": 200 },
    "rotate": 90,
    "filters": { "grayscale": true },
    "format": "png"
  }
}
```

### ✅ Response:
``` 
{
  "imageUrl": "https://your-s3-url.com/transformed-image.png",
  "metadata": {
    "format": "png",
    "width": 300,
    "height": 300
  },
  "message": "Image transformed successfully"
}
```
## ⚡ Caching with Redis
 - Image lists and transformation results are cached for 1 hour

 - Reduces redundant S3 calls & improves performance

 - Cache keys are generated per user, page, and transformation request
