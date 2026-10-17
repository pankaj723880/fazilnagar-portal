import mongoose from "mongoose";

const fieldConfigSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: [
        "text",
        "textarea",
        "number",
        "select",
        "checkbox",
        "phone",
        "url",
        "latitude",
        "longitude",
        "address",
        "image",
      ],
      default: "text",
    },
    description: {
      type: String,
      default: "",
    },
    required: {
      type: Boolean,
      default: false,
    },
    defaultValue: {
      type: mongoose.Schema.Types.Mixed,
      default: "",
    },
    options: {
      type: [String],
      default: [],
    },
    validation: {
      min: { type: Number, default: null },
      max: { type: Number, default: null },
      pattern: { type: String, default: "" },
      customError: { type: String, default: "" },
    },
    order: {
      type: Number,
      default: 0,
    },
    isEditableInCorrection: {
      type: Boolean,
      default: true,
    },
  },
  { _id: true }
);

const contributionFormSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      default: "",
    },
    instructions: {
      type: String,
      default: "",
    },
    targetModule: {
      type: String,
      enum: ["map", "directory"],
      required: true,
      index: true,
    },
    entityType: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    purpose: {
      type: String,
      enum: ["correction", "new_entity", "both"],
      default: "both",
      index: true,
    },
    targetEntityId: {
      type: String,
      default: null,
      index: true,
    },
    targetEntityName: {
      type: String,
      default: "",
    },
    fields: [fieldConfigSchema],
    attachmentsConfig: {
      enabled: {
        type: Boolean,
        default: false,
      },
      maxFiles: {
        type: Number,
        default: 3,
      },
      maxSizeMb: {
        type: Number,
        default: 5,
      },
      allowedTypes: {
        type: [String],
        default: ["image/jpeg", "image/png", "image/webp"],
      },
    },
    status: {
      type: String,
      enum: ["draft", "published", "disabled", "closed"],
      default: "published",
      index: true,
    },
    submissionCount: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

contributionFormSchema.index({ targetModule: 1, status: 1 });
contributionFormSchema.index({ entityType: 1, status: 1 });

const ContributionForm = mongoose.model("ContributionForm", contributionFormSchema);
export default ContributionForm;
