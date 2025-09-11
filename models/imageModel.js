import mongoose from "mongoose";

const imageSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
      index: true,
    },

    title: {
      type: String,
      required: [true, "Add the title"],
      trim: true,
    },

    imageName: {
      type: String,
      required: [true, "add image"],
    },
  },
  { timestamps: true }
);

export default mongoose.model("Image", imageSchema);
