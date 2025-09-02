import mongoose from "mongoose";

const imageSchema = mongoose.Schema(
  {
    title: {
      type: String,
      requered: [true, "Add the title"],
    },
  },
  { timestamps: true }
);

export default mongoose.model("Image", imageSchema);
