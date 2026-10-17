import express from "express";
import PublicService from "../models/PublicService.js";
import verifyToken, { requireAdmin } from "../middleware/auth.js";
import { logAdminAction } from "../models/AuditLog.js";

const router = express.Router();

const DEFAULT_SERVICES = [
  {
    title: "Domicile & Residence Certificate (निवास प्रमाण पत्र)",
    titleHindi: "निवास प्रमाण पत्र",
    category: "Certificates & Revenue",
    description: "Official certificate proving residency in Fazilnagar Nagar Panchayat or Kushinagar district for educational admissions, government jobs, and welfare schemes.",
    eligibility: "Permanent resident of Fazilnagar or living continuously for more than 3 years.",
    requiredDocuments: ["Aadhaar Card", "Ration Card or Parivar Register Nakal", "Self-declaration affidavit", "Passport size photo"],
    instructions: "Apply online through UP e-District or visit the nearest CSC / Jan Seva Kendra in Fazilnagar.",
    officeName: "Tehsil Office / e-District Center, Fazilnagar",
    officeAddress: "Tehsil Complex, Fazilnagar, Kushinagar",
    contactPhone: "+91 5564 222102",
    applicationUrl: "https://edistrict.up.gov.in",
    feeStructure: "Rs. 30 (Govt CSC Portal fee)",
    processingTimeDays: "7 to 10 working days",
    isFeatured: true,
    isPublished: true,
    displayOrder: 1,
  },
  {
    title: "Income Certificate (आय प्रमाण पत्र)",
    titleHindi: "आय प्रमाण पत्र",
    category: "Certificates & Revenue",
    description: "Document certifying annual household income issued by the revenue authority for scholarships, fee concessions, and government welfare benefits.",
    eligibility: "Any citizen or family residing in Fazilnagar needing income verification.",
    requiredDocuments: ["Aadhaar Card", "Salary slip or Income Affidavit", "Ration Card copy", "Passport photo"],
    instructions: "Submit via CSC Jan Seva Kendra or apply directly through UP e-District portal.",
    officeName: "Revenue Inspector / Lekhpal Bureau, Fazilnagar",
    officeAddress: "Main Road, Fazilnagar, Kushinagar",
    contactPhone: "+91 5564 222102",
    applicationUrl: "https://edistrict.up.gov.in",
    feeStructure: "Rs. 30",
    processingTimeDays: "7 to 15 working days",
    isFeatured: true,
    isPublished: true,
    displayOrder: 2,
  },
  {
    title: "Birth & Death Registration (जन्म एवं मृत्यु पंजीकरण)",
    titleHindi: "जन्म एवं मृत्यु प्रमाण पत्र",
    category: "Panchayat & Municipal",
    description: "Official municipal birth or death certificate recording vital statistics under Nagar Panchayat Fazilnagar.",
    eligibility: "Births and deaths occurring within the municipal boundary of Fazilnagar.",
    requiredDocuments: ["Hospital discharge / birth slip (CHC Fazilnagar)", "Aadhaar Card of parents / informant", "Address proof of Fazilnagar"],
    instructions: "Apply within 21 days at the Nagar Panchayat Office or via the National Civil Registration System (CRS).",
    officeName: "Nagar Panchayat Office, Fazilnagar",
    officeAddress: "Nagar Panchayat Bhawan, Main Road, Fazilnagar",
    contactPhone: "+91 5564 222102",
    applicationUrl: "https://crsorgi.gov.in",
    feeStructure: "Free within 21 days; nominal late fee after 21 days",
    processingTimeDays: "3 to 7 working days",
    isFeatured: true,
    isPublished: true,
    displayOrder: 3,
  },
  {
    title: "Old Age, Widow & Divyang Pension Schemes (पेंशन योजनाएं)",
    titleHindi: "सामाजिक सुरक्षा पेंशन योजना",
    category: "Welfare Schemes & Pensions",
    description: "Monthly financial assistance schemes under Social Welfare Department UP for elderly citizens (60+), destitute widows, and specially-abled individuals.",
    eligibility: "BPL / rural income criteria, senior citizens (60+), destitute widows, or 40%+ disability certificate.",
    requiredDocuments: ["Aadhaar Card", "Bank Passbook (Aadhaar linked)", "Income Certificate", "Age Proof or Disability Certificate"],
    instructions: "Register online via SSPY portal or visit Block Development Office / CSC Center.",
    officeName: "Social Welfare Desk, Fazilnagar Block Office",
    officeAddress: "Block Campus, Fazilnagar",
    contactPhone: "+91 5564 222102",
    applicationUrl: "https://sspy-up.gov.in",
    feeStructure: "Free Government Application",
    processingTimeDays: "20 to 30 working days",
    isFeatured: true,
    isPublished: true,
    displayOrder: 4,
  },
];

let hasCheckedServicesSeed = false;
async function seedDefaultServicesIfEmpty() {
  if (hasCheckedServicesSeed) return;
  hasCheckedServicesSeed = true;
  try {
    const count = await PublicService.countDocuments();
    if (count === 0) {
      await PublicService.insertMany(DEFAULT_SERVICES);
    }
  } catch (err) {
    console.warn("[Services] Seed check skipped:", err.message);
  }
}

// @route   GET /api/services
// @desc    Get published public services for citizen portal
// @access  Public
router.get("/", async (req, res) => {
  try {
    await seedDefaultServicesIfEmpty();
    const { category, search } = req.query;
    const filter = { isPublished: true };

    if (category && category !== "All") {
      filter.category = category;
    }
    if (search && search.trim()) {
      const reg = new RegExp(search.trim(), "i");
      filter.$or = [{ title: reg }, { titleHindi: reg }, { description: reg }, { officeName: reg }];
    }

    const services = await PublicService.find(filter).sort({ displayOrder: 1, createdAt: -1 });
    res.status(200).json({ success: true, count: services.length, services });
  } catch (err) {
    console.error("[Services] Fetch error:", err);
    res.status(500).json({ message: "Failed to fetch public services." });
  }
});

// @route   GET /api/services/admin
// @desc    Get all services including drafts for admin dashboard
// @access  Private (Admin)
router.get("/admin", verifyToken, requireAdmin, async (req, res) => {
  try {
    await seedDefaultServicesIfEmpty();
    const services = await PublicService.find().sort({ displayOrder: 1, createdAt: -1 });
    res.status(200).json({ success: true, count: services.length, services });
  } catch (err) {
    console.error("[Services] Admin fetch error:", err);
    res.status(500).json({ message: "Failed to fetch administrative services." });
  }
});

// @route   POST /api/services
// @desc    Create a new public service entry
// @access  Private (Admin)
router.post("/", verifyToken, requireAdmin, async (req, res) => {
  try {
    const {
      title,
      titleHindi,
      category,
      description,
      eligibility,
      requiredDocuments,
      instructions,
      officeName,
      officeAddress,
      contactPhone,
      contactEmail,
      applicationUrl,
      feeStructure,
      processingTimeDays,
      isFeatured,
      isPublished,
      displayOrder,
    } = req.body;

    if (!title || !description || !category) {
      return res.status(400).json({ message: "Title, category, and description are required." });
    }

    const docs = Array.isArray(requiredDocuments)
      ? requiredDocuments
      : typeof requiredDocuments === "string"
      ? requiredDocuments.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    const newService = await PublicService.create({
      title: title.trim(),
      titleHindi: (titleHindi || "").trim(),
      category,
      description: description.trim(),
      eligibility: (eligibility || "").trim(),
      requiredDocuments: docs,
      instructions: (instructions || "").trim(),
      officeName: (officeName || "Nagar Panchayat / Tehsil Fazilnagar").trim(),
      officeAddress: (officeAddress || "Fazilnagar, Kushinagar, UP").trim(),
      contactPhone: (contactPhone || "").trim(),
      contactEmail: (contactEmail || "").trim(),
      applicationUrl: (applicationUrl || "").trim(),
      feeStructure: (feeStructure || "").trim(),
      processingTimeDays: (processingTimeDays || "7-15 days").trim(),
      isFeatured: isFeatured === true,
      isPublished: isPublished !== false,
      displayOrder: displayOrder || 0,
    });

    await logAdminAction({
      adminUser: req.user.id,
      adminEmail: req.user.email,
      action: "CREATE",
      entityType: "PublicService",
      entityId: newService._id,
      entityTitle: newService.title,
      changesSummary: `Created public service "${newService.title}"`,
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, message: "Public service added successfully.", service: newService });
  } catch (err) {
    console.error("[Services] Create error:", err);
    res.status(500).json({ message: "Failed to create public service." });
  }
});

// @route   PUT /api/services/:id
// @desc    Update a public service entry
// @access  Private (Admin)
router.put("/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const service = await PublicService.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ message: "Service not found." });
    }

    const {
      title,
      titleHindi,
      category,
      description,
      eligibility,
      requiredDocuments,
      instructions,
      officeName,
      officeAddress,
      contactPhone,
      contactEmail,
      applicationUrl,
      feeStructure,
      processingTimeDays,
      isFeatured,
      isPublished,
      displayOrder,
    } = req.body;

    if (title) service.title = title.trim();
    if (titleHindi !== undefined) service.titleHindi = titleHindi.trim();
    if (category) service.category = category;
    if (description) service.description = description.trim();
    if (eligibility !== undefined) service.eligibility = eligibility.trim();
    if (instructions !== undefined) service.instructions = instructions.trim();
    if (officeName !== undefined) service.officeName = officeName.trim();
    if (officeAddress !== undefined) service.officeAddress = officeAddress.trim();
    if (contactPhone !== undefined) service.contactPhone = contactPhone.trim();
    if (contactEmail !== undefined) service.contactEmail = contactEmail.trim();
    if (applicationUrl !== undefined) service.applicationUrl = applicationUrl.trim();
    if (feeStructure !== undefined) service.feeStructure = feeStructure.trim();
    if (processingTimeDays !== undefined) service.processingTimeDays = processingTimeDays.trim();
    if (isFeatured !== undefined) service.isFeatured = isFeatured;
    if (isPublished !== undefined) service.isPublished = isPublished;
    if (displayOrder !== undefined) service.displayOrder = displayOrder;

    if (requiredDocuments !== undefined) {
      service.requiredDocuments = Array.isArray(requiredDocuments)
        ? requiredDocuments
        : typeof requiredDocuments === "string"
        ? requiredDocuments.split(",").map((s) => s.trim()).filter(Boolean)
        : service.requiredDocuments;
    }

    await service.save();

    await logAdminAction({
      adminUser: req.user.id,
      adminEmail: req.user.email,
      action: "UPDATE",
      entityType: "PublicService",
      entityId: service._id,
      entityTitle: service.title,
      changesSummary: `Updated public service "${service.title}"`,
      ipAddress: req.ip,
    });

    res.status(200).json({ success: true, message: "Public service updated successfully.", service });
  } catch (err) {
    console.error("[Services] Update error:", err);
    res.status(500).json({ message: "Failed to update public service." });
  }
});

// @route   PATCH /api/services/:id/publish
// @desc    Toggle publication of a service
// @access  Private (Admin)
router.patch("/:id/publish", verifyToken, requireAdmin, async (req, res) => {
  try {
    const service = await PublicService.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ message: "Service not found." });
    }

    service.isPublished = req.body.isPublished !== undefined ? req.body.isPublished : !service.isPublished;
    await service.save();

    res.status(200).json({
      success: true,
      message: `Service ${service.isPublished ? "published" : "unpublished"}.`,
      isPublished: service.isPublished,
      service,
    });
  } catch (err) {
    console.error("[Services] Publish toggle error:", err);
    res.status(500).json({ message: "Failed to update publication status." });
  }
});

// @route   DELETE /api/services/:id
// @desc    Delete a public service entry
// @access  Private (Admin)
router.delete("/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const service = await PublicService.findByIdAndDelete(req.params.id);
    if (!service) {
      return res.status(404).json({ message: "Service not found." });
    }

    await logAdminAction({
      adminUser: req.user.id,
      adminEmail: req.user.email,
      action: "DELETE",
      entityType: "PublicService",
      entityId: req.params.id,
      entityTitle: service.title,
      changesSummary: `Deleted public service "${service.title}"`,
      ipAddress: req.ip,
    });

    res.status(200).json({ success: true, message: "Public service removed successfully." });
  } catch (err) {
    console.error("[Services] Delete error:", err);
    res.status(500).json({ message: "Failed to delete public service." });
  }
});

export default router;
