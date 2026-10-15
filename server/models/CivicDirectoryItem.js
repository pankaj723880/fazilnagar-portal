import mongoose from "mongoose";

const civicDirectoryItemSchema = new mongoose.Schema(
  {
    itemId: {
      type: String,
      trim: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    subtitle: {
      type: String,
      default: "",
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      default: "general",
      index: true,
    },
    categoryLabel: {
      type: String,
      default: "📍 Civic",
      trim: true,
    },
    phone: {
      type: String,
      default: "",
      trim: true,
    },
    lat: {
      type: Number,
      default: null,
    },
    lng: {
      type: Number,
      default: null,
    },
    directionsUrl: {
      type: String,
      default: "",
      trim: true,
    },
    image: {
      type: String,
      default: "",
      trim: true,
    },
    verified: {
      type: Boolean,
      default: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

civicDirectoryItemSchema.index({ displayOrder: 1, createdAt: 1 });

const CivicDirectoryItem = mongoose.model("CivicDirectoryItem", civicDirectoryItemSchema);
export default CivicDirectoryItem;
