import mongoose from "mongoose";

const publicServiceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    titleHindi: {
      type: String,
      default: "",
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: [
        "Certificates & Revenue",
        "Aadhaar & Ration Card",
        "Electricity & Utilities",
        "Panchayat & Municipal",
        "Welfare Schemes & Pensions",
        "Police & Administration",
        "Other Civic Services",
      ],
      default: "Certificates & Revenue",
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    eligibility: {
      type: String,
      default: "All eligible residents of Fazilnagar and surrounding rural areas.",
      trim: true,
    },
    requiredDocuments: {
      type: [String],
      default: ["Aadhaar Card", "Proof of Residence / Ration Card", "Passport Photo"],
    },
    instructions: {
      type: String,
      default: "Visit the designated office during working hours or apply online via the official UP e-District portal.",
    },
    officeName: {
      type: String,
      default: "Tehsil / Nagar Panchayat Office, Fazilnagar",
    },
    officeAddress: {
      type: String,
      default: "Fazilnagar, Kushinagar, UP - 274401",
    },
    contactPhone: {
      type: String,
      default: "+91 5564 222102",
    },
    contactEmail: {
      type: String,
      default: "",
    },
    applicationUrl: {
      type: String,
      default: "https://edistrict.up.gov.in",
    },
    feeStructure: {
      type: String,
      default: "Government prescribed fee as per CSC / e-District rates.",
    },
    processingTimeDays: {
      type: String,
      default: "7 to 15 working days",
    },
    isFeatured: {
      type: Boolean,
      default: false,
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

const PublicService = mongoose.model("PublicService", publicServiceSchema);
export default PublicService;
