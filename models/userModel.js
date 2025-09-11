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
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: [true, "Add a password"],
      minlength: [6, "Password must be at least 6 characters"],
    },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
