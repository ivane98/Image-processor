import mongoose from "mongoose";

const imageSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    title: {
      type: String,
      required: [true, "Add the title"],
    },

    imageName: {
      type: String,
      required: [true, "add image"],
    },
  },
  { timestamps: true }
);

export default mongoose.model("Image", imageSchema);
