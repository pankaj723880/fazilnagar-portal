import mongoose from "mongoose";

const heritageSiteSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    nameHindi: {
      type: String,
      default: "",
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    category: {
      type: String,
      enum: [
        "Jain Heritage",
        "Buddhist Heritage",
        "Hindu Temples",
        "Historical Monument",
        "Cultural Landmark",
      ],
      default: "Jain Heritage",
      index: true,
    },
    historicalSignificance: {
      type: String,
      required: true,
    },
    narrative: {
      type: String,
      required: true,
    },
    distanceFromFazilnagarCenter: {
      type: String,
      default: "Within town area / 0 km",
    },
    locationAddress: {
      type: String,
      default: "Fazilnagar, Kushinagar, UP",
    },
    latitude: {
      type: Number,
      default: 26.6827,
    },
    longitude: {
      type: Number,
      default: 84.0498,
    },
    visitingHours: {
      type: String,
      default: "06:00 AM – 07:00 PM",
    },
    entryFee: {
      type: String,
      default: "Free Admission",
    },
    primaryImage: {
      type: String,
      default: "",
    },
    galleryImages: [
      {
        url: { type: String, required: true },
        caption: { type: String, default: "" },
        credit: { type: String, default: "" },
      },
    ],
    isTwinHeritageHighlight: {
      type: Boolean,
      default: true,
    },
    isPublished: {
      type: Boolean,
      default: true,
      index: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const HeritageSite = mongoose.model("HeritageSite", heritageSiteSchema);
export default HeritageSite;
