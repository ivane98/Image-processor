import express from "express";
import ImageRouter from "./routes/imageRoutes.js";
import UserRouter from "./routes/userRoutes.js";
import { errorHandle } from "./middleware/errorHandler.js";
import { connectDb } from "./config/db.js";

const port = process.env.PORT || 5000;
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use("/api/images", ImageRouter);
app.use("/api/users", UserRouter);

app.use(errorHandle);

connectDb()
  .then(() => {
    app.listen(port, () => console.log(`✅ Server listening on port ${port}`));
  })
  .catch((err) => {
    console.error("❌ Failed to connect to DB. Server not started.");
  });
