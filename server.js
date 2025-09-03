import express from "express";
import ImageRouter from "./router/imageRoutes.js";
import UserRouter from "./router/userRoutes.js";
import { errorHandle } from "./middleware/errorHandler.js";
import { connectDb } from "./config/db.js";
const port = process.env.PORT || 5000;
connectDb();
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use("/api/images", ImageRouter);
app.use("/api/users", UserRouter);

app.use(errorHandle);

app.listen(port, () => console.log(`server listening on port ${port}`));
