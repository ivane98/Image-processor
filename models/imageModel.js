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
      requered: [true, "Add the title"],
    },
  },
  { timestamps: true }
);

export default mongoose.model("Image", imageSchema);
