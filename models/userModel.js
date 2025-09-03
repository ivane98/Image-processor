import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Add a name"],
    },
    email: {
      type: String,
      required: [true, "Add an email"],
      unique: true,
    },
    password: {
      type: String,
      required: [true, "Add a password"],
    },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
