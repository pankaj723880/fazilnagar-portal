import mongoose from "mongoose";

const jobListingSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["job", "job_seeker"],
      default: "job",
      required: true,
      index: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: [
        "open",
        "filled",
        "paused",
        "expired",
        "looking_for_work",
        "hired",
        "inactive",
      ],
      default: function () {
        return this.type === "job_seeker" ? "looking_for_work" : "open";
      },
      index: true,
    },

    // ----------------------------------------------------
    // Category A: Employer Job Vacancy Fields
    // ----------------------------------------------------
    title: {
      type: String,
      trim: true,
      maxLength: 140,
      default: "",
    },
    company: {
      type: String,
      trim: true,
      maxLength: 140,
      default: "",
    },
    category: {
      type: String,
      trim: true,
      required: true,
      index: true,
      default: "Other",
    },
    employmentType: {
      type: String,
      enum: ["Full-time", "Part-time", "Contract", "Daily-wage", "Internship"],
      default: "Full-time",
      index: true,
    },
    salaryMin: {
      type: Number,
      default: 0,
      min: 0,
      index: true,
    },
    salaryMax: {
      type: Number,
      default: 0,
      min: 0,
    },
    salaryPeriod: {
      type: String,
      enum: ["month", "day", "hour", "year", "negotiable"],
      default: "month",
    },
    salaryText: {
      type: String,
      trim: true,
      default: "",
    },
    isNegotiable: {
      type: Boolean,
      default: false,
    },
    location: {
      type: String,
      trim: true,
      maxLength: 140,
      default: "Fazilnagar Town",
      index: true,
    },
    experience: {
      type: String,
      trim: true,
      default: "Fresher friendly",
    },
    isFresherFriendly: {
      type: Boolean,
      default: false,
      index: true,
    },
    qualifications: {
      type: String,
      trim: true,
      maxLength: 500,
      default: "",
    },
    skills: {
      type: [String],
      default: [],
      index: true,
    },
    responsibilities: {
      type: String,
      trim: true,
      maxLength: 3000,
      default: "",
    },
    workingHours: {
      type: String,
      trim: true,
      maxLength: 100,
      default: "",
    },
    openings: {
      type: Number,
      default: 1,
      min: 1,
      max: 100,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxLength: 8000,
    },
    deadline: {
      type: Date,
      default: null,
    },
    companyLogo: {
      type: String,
      default: "",
    },

    // ----------------------------------------------------
    // Category B: Job-Seeker Profile Fields
    // ----------------------------------------------------
    displayName: {
      type: String,
      trim: true,
      maxLength: 100,
      default: "",
    },
    desiredRole: {
      type: String,
      trim: true,
      maxLength: 140,
      default: "",
      index: true,
    },
    education: {
      type: String,
      trim: true,
      maxLength: 300,
      default: "",
    },
    experienceLevel: {
      type: String,
      trim: true,
      default: "Fresher",
    },
    preferredLocation: {
      type: String,
      trim: true,
      maxLength: 140,
      default: "Fazilnagar Town",
      index: true,
    },
    expectedSalary: {
      type: String,
      trim: true,
      maxLength: 100,
      default: "",
    },
    employmentPreference: {
      type: String,
      enum: ["Full-time", "Part-time", "Contract", "Daily-wage", "Any"],
      default: "Full-time",
    },
    availability: {
      type: String,
      trim: true,
      default: "Immediately",
    },
    languages: {
      type: [String],
      default: ["Hindi"],
    },
    bio: {
      type: String,
      trim: true,
      maxLength: 4000,
      default: "",
    },
    showPhone: {
      type: Boolean,
      default: false,
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    avatar: {
      type: String,
      default: "",
    },

    // ----------------------------------------------------
    // Moderation, Verification & Metrics
    // ----------------------------------------------------
    views: {
      type: Number,
      default: 0,
      min: 0,
    },
    applicationsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    inquiriesCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    reportsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    isReported: {
      type: Boolean,
      default: false,
      index: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Compound performance indexes for query filters
jobListingSchema.index({ type: 1, status: 1, createdAt: -1 });
jobListingSchema.index({ type: 1, category: 1, status: 1, createdAt: -1 });
jobListingSchema.index({ type: 1, employmentType: 1, status: 1 });
jobListingSchema.index({ owner: 1, createdAt: -1 });
jobListingSchema.index({ isFresherFriendly: 1, status: 1 });

// Text index for keyword searches
jobListingSchema.index(
  {
    title: "text",
    company: "text",
    desiredRole: "text",
    skills: "text",
    description: "text",
    location: "text",
    preferredLocation: "text",
    displayName: "text",
  },
  {
    weights: {
      title: 10,
      desiredRole: 10,
      company: 5,
      skills: 5,
      displayName: 3,
      location: 3,
      description: 1,
    },
    name: "job_listing_text_search",
  }
);

const JobListing = mongoose.model("JobListing", jobListingSchema);

export default JobListing;
