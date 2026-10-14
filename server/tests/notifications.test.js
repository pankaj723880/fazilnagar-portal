import { describe, it } from "node:test";
import assert from "node:assert/strict";
import Notification from "../models/Notification.js";
import { createBroadcastNotification, createSubmissionNotification } from "../utils/notify.js";

describe("Notifications System Verification", () => {
  it("Notification model has required fields and valid defaults", () => {
    const notif = new Notification({
      title: "Test Alert",
      message: "Testing notification delivery.",
      type: "broadcast_news",
      link: "/news",
    });

    assert.equal(notif.title, "Test Alert");
    assert.equal(notif.message, "Testing notification delivery.");
    assert.equal(notif.type, "broadcast_news");
    assert.equal(notif.link, "/news");
    assert.equal(notif.isRead, false);
    assert.deepEqual(notif.readBy, []);
  });

  it("Notification supports submission approvals and rejections", () => {
    const approved = new Notification({
      recipientPhone: "9876543210",
      referenceId: "FZ-SUB-ABC123",
      type: "submission_approved",
      title: "Place Approved! 🎉",
      message: "Your establishment was approved.",
      link: "/directory",
    });

    assert.equal(approved.type, "submission_approved");
    assert.equal(approved.recipientPhone, "9876543210");
    assert.equal(approved.referenceId, "FZ-SUB-ABC123");

    const rejected = new Notification({
      recipientPhone: "9876543210",
      referenceId: "FZ-SUB-ABC123",
      type: "submission_rejected",
      title: "Submission Rejected",
      message: "Location outside town boundaries.",
      link: "/directory",
    });

    assert.equal(rejected.type, "submission_rejected");
  });
});
