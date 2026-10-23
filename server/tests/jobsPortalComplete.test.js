import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import express from "express";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

import jobsRoutes from "../routes/jobs.js";
import messagesRoutes from "../routes/messages.js";
import User from "../models/User.js";
import JobListing from "../models/JobListing.js";
import JobApplication from "../models/JobApplication.js";
import Conversation from "../models/Conversation.js";
import ConversationMember from "../models/ConversationMember.js";
import Message from "../models/Message.js";
import Report from "../models/Report.js";
import { initSocket } from "../socket.js";

const TEST_PORT = 5098;
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_key";
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/fazilnagar_db";

describe("Fazilnagar Jobs Portal: Complete End-to-End Test Suite", () => {
  let server;
  let employerUser;
  let jobSeekerUser;
  let otherCitizen;
  let adminUser;
  let employerToken;
  let seekerToken;
  let otherToken;
  let adminToken;

  let testJobVacancy;
  let testCandidateProfile;

  const makeRequest = ({ path, method = "GET", token, body = null }) => {
    return new Promise((resolve, reject) => {
      const headers = { "Content-Type": "application/json", Connection: "close" };
      if (token) headers.Authorization = `Bearer ${token}`;

      const payload = body ? JSON.stringify(body) : null;
      if (payload) headers["Content-Length"] = Buffer.byteLength(payload);

      const req = http.request(
        {
          hostname: "127.0.0.1",
          port: TEST_PORT,
          path,
          method,
          headers,
          agent: false,
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            let parsed = {};
            try {
              parsed = JSON.parse(data);
            } catch {
              parsed = { raw: data };
            }
            resolve({ status: res.statusCode, data: parsed });
          });
        }
      );

      req.on("error", reject);
      if (payload) req.write(payload);
      req.end();
    });
  };

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGO_URI);
    }

    const app = express();
    app.use(express.json());
    app.use("/api/jobs", jobsRoutes);
    app.use("/api/messages", messagesRoutes);

    server = http.createServer(app);
    initSocket(server);
    await new Promise((resolve) => server.listen(TEST_PORT, resolve));

    // Clean up test data
    const testEmails = [
      "test_employer_jobs@fazilnagar.com",
      "test_seeker_jobs@fazilnagar.com",
      "test_other_jobs@fazilnagar.com",
    ];
    await User.deleteMany({ email: { $in: testEmails } });

    // Create test accounts
    employerUser = await User.create({
      name: "Pawa Hardware & Tools",
      email: "test_employer_jobs@fazilnagar.com",
      username: "pawahardware",
      password: "HashedPassword123",
      role: "user",
      area: "Main Market",
      isEmailVerified: true,
    });

    jobSeekerUser = await User.create({
      name: "Vikram Kumar Sharma",
      email: "test_seeker_jobs@fazilnagar.com",
      username: "vikramsharma",
      password: "HashedPassword123",
      role: "user",
      area: "NH-27 Highway",
      phone: "+91 98380 99999",
      isEmailVerified: true,
    });

    otherCitizen = await User.create({
      name: "Suresh Gupta",
      email: "test_other_jobs@fazilnagar.com",
      username: "sureshgupta",
      password: "HashedPassword123",
      role: "user",
      area: "Hospital Road",
      isEmailVerified: true,
    });

    adminUser = await User.create({
      name: "Chief Admin Officer",
      email: "test_admin_jobs@fazilnagar.com",
      username: "chiefadmin",
      password: "HashedPassword123",
      role: "admin",
      area: "Administrative Block",
      isEmailVerified: true,
    });

    employerToken = jwt.sign(
      { id: employerUser._id.toString(), role: "user", email: employerUser.email },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    seekerToken = jwt.sign(
      { id: jobSeekerUser._id.toString(), role: "user", email: jobSeekerUser.email },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    otherToken = jwt.sign(
      { id: otherCitizen._id.toString(), role: "user", email: otherCitizen.email },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    adminToken = jwt.sign(
      { id: adminUser._id.toString(), role: "admin", email: adminUser.email },
      JWT_SECRET,
      { expiresIn: "1h" }
    );
  });

  after(async () => {
    if (employerUser) {
      await JobListing.deleteMany({
        owner: { $in: [employerUser._id, jobSeekerUser._id, otherCitizen._id] },
      });
      await JobApplication.deleteMany({
        $or: [
          { applicant: { $in: [employerUser._id, jobSeekerUser._id, otherCitizen._id] } },
          { employer: { $in: [employerUser._id, jobSeekerUser._id, otherCitizen._id] } },
        ],
      });
      await User.deleteMany({
        _id: { $in: [employerUser._id, jobSeekerUser._id, otherCitizen._id] },
      });
    }

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // -------------------------------------------------------------
  // Test Suite 1: Listing Creation & Validation
  // -------------------------------------------------------------
  describe("1. Listing Creation & Validation", () => {
    it("1.1 Rejects unauthenticated requests to create listings with 401", async () => {
      const res = await makeRequest({
        path: "/api/jobs",
        method: "POST",
        body: { title: "Cashier" },
      });
      assert.strictEqual(res.status, 401);
    });

    it("1.2 Validates required fields when publishing a job vacancy", async () => {
      const res = await makeRequest({
        path: "/api/jobs",
        method: "POST",
        token: employerToken,
        body: { type: "job", title: "Ab" }, // Too short
      });
      assert.strictEqual(res.status, 400);
      assert.ok(res.data.message.includes("Job title is required"));
    });

    it("1.3 Successfully creates a job vacancy (Category A: Find a Job)", async () => {
      const res = await makeRequest({
        path: "/api/jobs",
        method: "POST",
        token: employerToken,
        body: {
          type: "job",
          title: "Hardware Sales Executive & Counter Assistant",
          company: "Pawa Hardware & Tools",
          category: "Retail",
          employmentType: "Full-time",
          location: "Main Market, Fazilnagar",
          salaryMin: 10000,
          salaryMax: 14000,
          salaryPeriod: "month",
          experience: "Fresher friendly",
          isFresherFriendly: true,
          qualifications: "Intermediate / 12th Pass",
          skills: ["Counter Sales", "Customer Handling", "Inventory Check"],
          responsibilities: "Assist walk-in customers, manage hardware stock, and handle daily cash counter.",
          workingHours: "9:00 AM - 7:00 PM",
          openings: 2,
          description: "Leading hardware store at Main Market Fazilnagar is looking for energetic sales staff.",
        },
      });

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.data.success, true);
      assert.strictEqual(res.data.listing.title, "Hardware Sales Executive & Counter Assistant");
      assert.strictEqual(res.data.listing.status, "open");
      assert.strictEqual(res.data.listing.isFresherFriendly, true);
      testJobVacancy = res.data.listing;
    });

    it("1.4 Successfully creates a job-seeker profile (Category B: Find Talent)", async () => {
      const res = await makeRequest({
        path: "/api/jobs",
        method: "POST",
        token: seekerToken,
        body: {
          type: "job_seeker",
          displayName: "Vikram Sharma",
          desiredRole: "Computer Operator & Data Entry Specialist",
          category: "Computer & IT",
          education: "Graduate in Science, CCC Certified",
          experienceLevel: "1 Year",
          preferredLocation: "NH-27 Highway corridor",
          expectedSalary: "₹12,000 / month",
          employmentPreference: "Full-time",
          availability: "Immediately",
          languages: "Hindi, English, Bhojpuri",
          skills: ["Hindi Typing", "English Typing", "MS Excel", "Tally Prime"],
          bio: "Skilled computer operator with fast typing speed and thorough knowledge of MS Office and online government portal filing.",
          showPhone: false,
          phone: "+91 98380 99999",
        },
      });

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.data.success, true);
      assert.strictEqual(res.data.listing.desiredRole, "Computer Operator & Data Entry Specialist");
      assert.strictEqual(res.data.listing.status, "looking_for_work");
      testCandidateProfile = res.data.listing;
    });
  });

  // -------------------------------------------------------------
  // Test Suite 2: Public Search, Filtering, and Privacy Protection
  // -------------------------------------------------------------
  describe("2. Public Search, Filtering, and Privacy Protection", () => {
    it("2.1 GET /api/jobs lists open vacancies by default", async () => {
      const res = await makeRequest({
        path: "/api/jobs?type=job",
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.ok(Array.isArray(res.data.listings));
      const found = res.data.listings.find((j) => j._id === testJobVacancy._id);
      assert.ok(found, "Newly created vacancy should appear in public list");
    });

    it("2.2 GET /api/jobs?type=job_seeker lists candidates looking for work", async () => {
      const res = await makeRequest({
        path: "/api/jobs?type=job_seeker",
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      const found = res.data.listings.find((s) => s._id === testCandidateProfile._id);
      assert.ok(found, "Newly created seeker profile should appear in talent list");
      // Critical Privacy check: Candidate phone MUST be masked when showPhone === false
      assert.strictEqual(found.phone, "", "Phone must be blanked when showPhone is false");
    });

    it("2.3 Filters listings by category and location accurately", async () => {
      const res = await makeRequest({
        path: "/api/jobs?type=job&category=Retail&location=Main%20Market",
      });
      assert.strictEqual(res.status, 200);
      assert.ok(res.data.listings.some((j) => j._id === testJobVacancy._id));
    });

    it("2.4 Filters listings by fresher friendly flag", async () => {
      const res = await makeRequest({
        path: "/api/jobs?type=job&fresherOnly=true",
      });
      assert.strictEqual(res.status, 200);
      assert.ok(res.data.listings.every((j) => j.isFresherFriendly === true));
    });

    it("2.5 GET /api/jobs/:id retrieves details and increments view count", async () => {
      const initialViews = testJobVacancy.views || 0;
      const res = await makeRequest({
        path: `/api/jobs/${testJobVacancy._id}`,
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.listing._id, testJobVacancy._id);
      assert.strictEqual(res.data.listing.views, initialViews + 1);
    });

    it("2.6 GET /api/jobs/categories returns aggregate category breakdown", async () => {
      const res = await makeRequest({
        path: "/api/jobs/categories",
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.ok(typeof res.data.totalOpenJobs === "number");
      assert.ok(typeof res.data.totalSeekers === "number");
    });
  });

  // -------------------------------------------------------------
  // Test Suite 3: Critical Requirement 5 - Chat System & Apply Now
  // -------------------------------------------------------------
  describe("3. Chat Integration: Apply Now Flow", () => {
    let applicationConvId;

    it("3.1 Rejects unauthenticated user attempting to Apply Now with 401", async () => {
      const res = await makeRequest({
        path: `/api/jobs/${testJobVacancy._id}/apply`,
        method: "POST",
      });
      assert.strictEqual(res.status, 401);
    });

    it("3.2 Prevents employer from applying to their own job vacancy", async () => {
      const res = await makeRequest({
        path: `/api/jobs/${testJobVacancy._id}/apply`,
        method: "POST",
        token: employerToken,
      });
      assert.strictEqual(res.status, 400);
      assert.ok(res.data.message.includes("own job listing"));
    });

    it("3.3 Successfully applies to vacancy: creates conversation and sends real message", async () => {
      const res = await makeRequest({
        path: `/api/jobs/${testJobVacancy._id}/apply`,
        method: "POST",
        token: seekerToken,
      });

      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.data.success, true);
      assert.ok(res.data.conversationId, "Must return active conversation ID");
      applicationConvId = res.data.conversationId;

      // Verify that a real conversation was created in the database
      const conv = await Conversation.findById(applicationConvId);
      assert.ok(conv, "Conversation record must exist");

      // Verify the contextual message text matches requirement 5
      const expectedMessage = `Hello, I am interested in applying for ${testJobVacancy.title} at ${testJobVacancy.company}. Please share more details about the role and the application process.`;
      const msg = await Message.findOne({ conversation: applicationConvId });
      assert.ok(msg, "Message document must exist in database");
      assert.strictEqual(msg.sender.toString(), jobSeekerUser._id.toString());
      assert.strictEqual(msg.body, expectedMessage);

      // Verify conversation lastMessage was updated
      assert.strictEqual(conv.lastMessage.text, expectedMessage);

      // Verify JobApplication was recorded
      const appRecord = await JobApplication.findOne({
        listing: testJobVacancy._id,
        applicant: jobSeekerUser._id,
      });
      assert.ok(appRecord, "JobApplication record must be persisted");
      assert.strictEqual(appRecord.employer.toString(), employerUser._id.toString());
    });

    it("3.4 Prevents duplicate applications to the same vacancy (returns 409 & alreadyApplied)", async () => {
      const res = await makeRequest({
        path: `/api/jobs/${testJobVacancy._id}/apply`,
        method: "POST",
        token: seekerToken,
      });

      assert.strictEqual(res.status, 409);
      assert.strictEqual(res.data.alreadyApplied, true);
      assert.strictEqual(res.data.conversationId.toString(), applicationConvId.toString());
    });

    it("3.5 GET /api/jobs/:id/application-status returns hasApplied=true for applicant", async () => {
      const res = await makeRequest({
        path: `/api/jobs/${testJobVacancy._id}/application-status`,
        token: seekerToken,
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.hasApplied, true);
      assert.ok(res.data.application);
    });

    it("3.6 GET /api/jobs/:id/application-status returns hasApplied=false for non-applicant", async () => {
      const res = await makeRequest({
        path: `/api/jobs/${testJobVacancy._id}/application-status`,
        token: otherToken,
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.hasApplied, false);
    });
  });

  // -------------------------------------------------------------
  // Test Suite 4: Critical Requirement 5 - Contact Candidate Flow
  // -------------------------------------------------------------
  describe("4. Chat Integration: Contact Candidate Flow", () => {
    it("4.1 Rejects candidate attempting to contact themselves", async () => {
      const res = await makeRequest({
        path: `/api/jobs/${testCandidateProfile._id}/contact`,
        method: "POST",
        token: seekerToken,
      });
      assert.strictEqual(res.status, 400);
      assert.ok(res.data.message.includes("own candidate profile"));
    });

    it("4.2 Successfully contacts candidate: creates conversation and sends invite message", async () => {
      const res = await makeRequest({
        path: `/api/jobs/${testCandidateProfile._id}/contact`,
        method: "POST",
        token: employerToken,
        body: {
          jobTitle: "Computer Operator",
          companyName: "Pawa Hardware & Tools",
        },
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.ok(res.data.conversationId, "Must return active conversation ID");

      // Verify that message exists in chat with candidate name and employer org
      const expectedMessage = `Hello ${testCandidateProfile.displayName}, I saw your profile on Fazilnagar Jobs. I have an opportunity for Computer Operator at Pawa Hardware & Tools. Are you interested in discussing this opportunity?`;

      const msg = await Message.findOne({
        conversation: res.data.conversationId,
        sender: employerUser._id,
      });
      assert.ok(msg, "Invitation message must be recorded in messages collection");
      assert.strictEqual(msg.body, expectedMessage);

      // Verify candidate's listing inquiries count incremented
      const updatedCandidate = await JobListing.findById(testCandidateProfile._id);
      assert.strictEqual(updatedCandidate.inquiriesCount, 1);
    });
  });

  // -------------------------------------------------------------
  // Test Suite 5: Listing Management & User Dashboard (Requirement 8)
  // -------------------------------------------------------------
  describe("5. Listing Management & User Dashboard", () => {
    it("5.1 GET /api/jobs/my returns user's listings and applications", async () => {
      const res = await makeRequest({
        path: "/api/jobs/my",
        token: employerToken,
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.ok(Array.isArray(res.data.myListings));
      assert.ok(Array.isArray(res.data.receivedApplications));

      // Employer should see the application submitted by seeker
      const received = res.data.receivedApplications.find(
        (a) => a.listing?._id?.toString() === testJobVacancy._id.toString()
      );
      assert.ok(received, "Employer must receive application record in dashboard");
      assert.strictEqual(received.applicant.name, "Vikram Kumar Sharma");
    });

    it("5.2 Unauthorized citizen cannot update another user's listing", async () => {
      const res = await makeRequest({
        path: `/api/jobs/${testJobVacancy._id}`,
        method: "PUT",
        token: otherToken,
        body: { title: "Hacked Title" },
      });
      assert.strictEqual(res.status, 403);
    });

    it("5.3 Owner can update listing details", async () => {
      const res = await makeRequest({
        path: `/api/jobs/${testJobVacancy._id}`,
        method: "PUT",
        token: employerToken,
        body: {
          title: "Senior Hardware Sales Executive & Counter Incharge",
          openings: 3,
        },
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.listing.title, "Senior Hardware Sales Executive & Counter Incharge");
      assert.strictEqual(res.data.listing.openings, 3);
    });

    it("5.4 Owner can change status (mark filled)", async () => {
      const res = await makeRequest({
        path: `/api/jobs/${testJobVacancy._id}/status`,
        method: "PATCH",
        token: employerToken,
        body: { status: "filled" },
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.status, "filled");

      const check = await JobListing.findById(testJobVacancy._id);
      assert.strictEqual(check.status, "filled");
    });

    it("5.5 Owner can delete their listing with automatic application cleanup", async () => {
      const res = await makeRequest({
        path: `/api/jobs/${testJobVacancy._id}`,
        method: "DELETE",
        token: employerToken,
      });

      assert.strictEqual(res.status, 200);
      const checkListing = await JobListing.findById(testJobVacancy._id);
      assert.strictEqual(checkListing, null);

      const checkApps = await JobApplication.find({ listing: testJobVacancy._id });
      assert.strictEqual(checkApps.length, 0, "Applications must be cleaned up on listing delete");
    });
  });

  // -------------------------------------------------------------
  // Test Suite 6: Moderation & Trust (Requirement 10)
  // -------------------------------------------------------------
  describe("6. Moderation & Trust", () => {
    it("6.1 POST /api/jobs/:id/report records report for admin review", async () => {
      const res = await makeRequest({
        path: `/api/jobs/${testCandidateProfile._id}/report`,
        method: "POST",
        token: otherToken,
        body: {
          reason: "fake_job",
          details: "Suspicious profile details.",
        },
      });

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);

      const reportDoc = await Report.findOne({
        targetJobListing: testCandidateProfile._id,
        reporter: otherCitizen._id,
      });
      assert.ok(reportDoc, "Report must be saved in database");
      assert.strictEqual(reportDoc.reason, "fake_job");
    });
  });

  // -------------------------------------------------------------
  // Test Suite 7: Administrator Management & Oversight (Requirement 4)
  // -------------------------------------------------------------
  describe("7. Administrator Management & Oversight", () => {
    it("7.1 Rejects non-admin requests to /api/jobs/admin/all with 403", async () => {
      const res = await makeRequest({
        path: "/api/jobs/admin/all",
        token: seekerToken,
      });
      assert.strictEqual(res.status, 403);
    });

    it("7.2 Admin can retrieve marketplace stats (/api/jobs/admin/stats)", async () => {
      const res = await makeRequest({
        path: "/api/jobs/admin/stats",
        token: adminToken,
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.ok(typeof res.data.stats.totalListings === "number");
      assert.ok(typeof res.data.stats.openCount === "number");
      assert.ok(typeof res.data.stats.totalApplications === "number");
    });

    it("7.3 Admin can list all listings with filters (/api/jobs/admin/all)", async () => {
      const res = await makeRequest({
        path: "/api/jobs/admin/all?status=all",
        token: adminToken,
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.ok(Array.isArray(res.data.listings));
      assert.ok(res.data.total >= 1);
    });

    it("7.4 Admin can toggle listing verification (/api/jobs/admin/:id/verify)", async () => {
      const res = await makeRequest({
        path: `/api/jobs/admin/${testCandidateProfile._id}/verify`,
        method: "PATCH",
        token: adminToken,
        body: { isVerified: true },
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.strictEqual(res.data.listing.isVerified, true);
    });

    it("7.5 Admin can update listing status (/api/jobs/admin/:id/status)", async () => {
      const res = await makeRequest({
        path: `/api/jobs/admin/${testCandidateProfile._id}/status`,
        method: "PATCH",
        token: adminToken,
        body: { status: "paused" },
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.strictEqual(res.data.listing.status, "paused");
    });

    it("7.6 Admin can retrieve submitted applications (/api/jobs/admin/applications)", async () => {
      const res = await makeRequest({
        path: "/api/jobs/admin/applications",
        token: adminToken,
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);
      assert.ok(Array.isArray(res.data.applications));
    });

    it("7.7 Admin can delete any listing (/api/jobs/admin/:id)", async () => {
      const res = await makeRequest({
        path: `/api/jobs/admin/${testCandidateProfile._id}`,
        method: "DELETE",
        token: adminToken,
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.success, true);

      const check = await JobListing.findById(testCandidateProfile._id);
      assert.strictEqual(check, null);
    });
  });
});
