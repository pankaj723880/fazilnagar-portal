import mongoose from "mongoose";

const jobApplicationSchema = new mongoose.Schema(
  {
    listing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobListing",
      required: true,
      index: true,
    },
    applicant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    employer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      default: null,
      index: true,
    },
    message: {
      type: String,
      trim: true,
      maxLength: 2000,
      default: "",
    },
    status: {
      type: String,
      enum: ["applied", "contacted", "interviewing", "rejected", "hired"],
      default: "applied",
      index: true,
    },
    appliedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Prevent duplicate applications by the same user to the same job listing
jobApplicationSchema.index({ listing: 1, applicant: 1 }, { unique: true });
jobApplicationSchema.index({ employer: 1, createdAt: -1 });
jobApplicationSchema.index({ applicant: 1, createdAt: -1 });

const JobApplication = mongoose.model("JobApplication", jobApplicationSchema);

export default JobApplication;
