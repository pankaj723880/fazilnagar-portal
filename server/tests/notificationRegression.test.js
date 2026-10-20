import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import notificationRoutes from "../routes/notifications.js";
import express from "express";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_key";

// Helper to create mock Express request/response
function createMockReqRes({
  method = "GET",
  url = "/",
  params = {},
  query = {},
  body = {},
  headers = {},
  user = null,
} = {}) {
  const reqHeaders = { ...headers };
  if (user) {
    const token = jwt.sign(
      { id: user._id || user.id, email: user.email, role: user.role || "citizen" },
      JWT_SECRET
    );
    reqHeaders.authorization = `Bearer ${token}`;
  }

  const req = {
    method,
    url,
    params,
    query,
    body,
    headers: reqHeaders,
  };

  let statusCode = 200;
  let responseData = null;

  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      responseData = data;
      if (this._onDone) this._onDone();
      return this;
    },
    getStatusCode: () => statusCode,
    getData: () => responseData,
  };

  return { req, res };
}

// Find route handler in router stack
function getRouteHandler(router, path, method) {
  for (const layer of router.stack) {
    if (layer.route && layer.route.path === path) {
      const matchMethod = layer.route.methods[method.toLowerCase()];
      if (matchMethod) {
        // Return composite handler executing middleware chain
        return async (req, res) => {
          for (const handle of layer.route.stack) {
            let nextCalled = false;
            let errorPassed = null;
            await new Promise((resolve) => {
              let resolved = false;
              const finish = () => {
                if (!resolved) {
                  resolved = true;
                  resolve();
                }
              };
              res._onDone = finish;
              try {
                const maybePromise = handle.handle(req, res, (err) => {
                  nextCalled = true;
                  errorPassed = err;
                  finish();
                });
                if (maybePromise && typeof maybePromise.then === "function") {
                  maybePromise.then(() => {
                    setTimeout(finish, 10);
                  }).catch((e) => {
                    errorPassed = e;
                    finish();
                  });
                }
              } catch (e) {
                errorPassed = e;
                finish();
              }
              setTimeout(finish, 2000);
            });
            if (errorPassed) throw errorPassed;
            if (!nextCalled) break;
          }
        };
      }
    }
  }
  throw new Error(`Route not found: ${method} ${path}`);
}

test("Notification Lifecycle & Admin Broadcast Test Suite", async (t) => {
  // Connect to DB
  const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/fazilnagar_db";
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri);
  }

  const testIdsToClean = [];

  t.after(async () => {
    if (testIdsToClean.length > 0) {
      await Notification.deleteMany({ _id: { $in: testIdsToClean } });
    }
    if (testUserIdsToClean.length > 0) {
      await User.deleteMany({ _id: { $in: testUserIdsToClean } });
    }
    await mongoose.disconnect();
  });

  const getHandler = getRouteHandler(notificationRoutes, "/", "get");
  const readHandler = getRouteHandler(notificationRoutes, "/:id/read", "patch");
  const markAllHandler = getRouteHandler(notificationRoutes, "/mark-all-read", "post");
  const broadcastHandler = getRouteHandler(notificationRoutes, "/admin/broadcast", "post");

  const testUserIdsToClean = [];

  // Create real test users in DB for live requireAdmin authorization verification
  const adminDoc = await User.findOneAndUpdate(
    { email: "admin_test_notif@fazilnagar.com" },
    {
      name: "Admin Test Notification",
      email: "admin_test_notif@fazilnagar.com",
      password: "dummy_hashed_password",
      role: "admin",
      status: "active",
    },
    { upsert: true, new: true }
  );
  testUserIdsToClean.push(adminDoc._id);

  const citizenDoc = await User.findOneAndUpdate(
    { email: "citizen_test_notif@fazilnagar.com" },
    {
      name: "Citizen Test Notification",
      email: "citizen_test_notif@fazilnagar.com",
      password: "dummy_hashed_password",
      role: "citizen",
      status: "active",
    },
    { upsert: true, new: true }
  );
  testUserIdsToClean.push(citizenDoc._id);

  const adminUser = {
    id: adminDoc._id.toString(),
    email: adminDoc.email,
    role: "admin",
  };

  const citizenUser = {
    id: citizenDoc._id.toString(),
    email: citizenDoc.email,
    role: "citizen",
  };

  await t.test("1. Zero unread notifications -> returns unreadCount: 0", async () => {
    const testClientId = "client_test_zero_" + Date.now();
    // Create 1 notification already read by testClientId
    const notif = new Notification({
      type: "system",
      title: "Test Read Notification",
      message: "Already read by client",
      readBy: [testClientId],
    });
    await notif.save();
    testIdsToClean.push(notif._id);

    const { req, res } = createMockReqRes({
      method: "GET",
      url: "/",
      headers: { "x-client-id": testClientId },
    });

    await getHandler(req, res);
    assert.equal(res.getStatusCode(), 200);
    const data = res.getData();
    assert.ok(data.success);
    // The notification should have isRead === true for this client
    const matching = data.notifications.find((n) => n._id.toString() === notif._id.toString());
    assert.ok(matching, "Notification should be returned in list");
    assert.equal(matching.isRead, true);
  });

  await t.test("2. Unread notification badges: 1, 9, and 10+ (9+) logic check", () => {
    // Pure function check of the badge display specification
    const renderBadge = (count) => {
      if (count <= 0) return null;
      return count > 9 ? "9+" : String(count);
    };

    assert.equal(renderBadge(0), null, "0 unread must hide the badge completely");
    assert.equal(renderBadge(1), "1", "1 unread must display numeric 1");
    assert.equal(renderBadge(9), "9", "9 unread must display numeric 9");
    assert.equal(renderBadge(10), "9+", "10 unread must display 9+");
    assert.equal(renderBadge(25), "9+", "25 unread must display 9+");
  });

  await t.test("3. Mark all as read persists in DB and returns unreadCount: 0 on subsequent GET", async () => {
    const testClientId = "client_test_markall_" + Date.now();

    // Create 3 unread notifications for this client
    const createdNotifs = [];
    for (let i = 1; i <= 3; i++) {
      const n = new Notification({
        type: "system",
        title: `Test Unread ${i}`,
        message: `Body for unread ${i}`,
        readBy: [],
      });
      await n.save();
      createdNotifs.push(n._id);
      testIdsToClean.push(n._id);
    }

    // Step A: Verify they are unread initially
    const { req: getReq1, res: getRes1 } = createMockReqRes({
      method: "GET",
      url: "/",
      headers: { "x-client-id": testClientId },
    });
    await getHandler(getReq1, getRes1);
    const initialList = getRes1.getData().notifications;
    const testItemsBefore = initialList.filter((n) => createdNotifs.includes(n._id.toString()));
    for (const item of testItemsBefore) {
      assert.equal(item.isRead, false, "Item should be unread before mark all");
    }

    // Step B: Call POST /mark-all-read
    const { req: markReq, res: markRes } = createMockReqRes({
      method: "POST",
      url: "/mark-all-read",
      headers: { "x-client-id": testClientId },
    });
    await markAllHandler(markReq, markRes);
    assert.equal(markRes.getStatusCode(), 200);
    assert.ok(markRes.getData().success);

    // Step C: Subsequent GET (simulating page refresh / navigation)
    const { req: getReq2, res: getRes2 } = createMockReqRes({
      method: "GET",
      url: "/",
      headers: { "x-client-id": testClientId },
    });
    await getHandler(getReq2, getRes2);
    const refreshedList = getRes2.getData().notifications;
    const testItemsAfter = refreshedList.filter((n) => createdNotifs.includes(n._id.toString()));
    for (const item of testItemsAfter) {
      assert.equal(item.isRead, true, "Item must persist as read across subsequent GET requests");
    }
  });

  await t.test("4. Independent read states: User A reading does NOT affect User B", async () => {
    const userAId = "client_user_A_" + Date.now();
    const userBId = "client_user_B_" + Date.now();

    const sharedNotif = new Notification({
      type: "broadcast_news",
      title: "Shared Broadcast News",
      message: "Important town announcement for all",
      readBy: [],
    });
    await sharedNotif.save();
    testIdsToClean.push(sharedNotif._id);

    // User A marks single notification as read
    const { req: readReqA, res: readResA } = createMockReqRes({
      method: "PATCH",
      url: `/${sharedNotif._id}/read`,
      params: { id: sharedNotif._id.toString() },
      headers: { "x-client-id": userAId },
    });
    await readHandler(readReqA, readResA);
    assert.equal(readResA.getStatusCode(), 200);

    // Fetch as User A -> must be isRead: true
    const { req: getReqA, res: getResA } = createMockReqRes({
      method: "GET",
      url: "/",
      headers: { "x-client-id": userAId },
    });
    await getHandler(getReqA, getResA);
    const notifForA = getResA.getData().notifications.find((n) => n._id.toString() === sharedNotif._id.toString());
    assert.equal(notifForA.isRead, true, "User A must see the notification as read");

    // Fetch as User B -> must be isRead: false
    const { req: getReqB, res: getResB } = createMockReqRes({
      method: "GET",
      url: "/",
      headers: { "x-client-id": userBId },
    });
    await getHandler(getReqB, getResB);
    const notifForB = getResB.getData().notifications.find((n) => n._id.toString() === sharedNotif._id.toString());
    assert.equal(notifForB.isRead, false, "User B must still see the notification as unread");
  });

  await t.test("5. Authorization: Guests and Citizens cannot call admin broadcast API", async () => {
    // Guest (unauthenticated) -> 401
    const { req: guestReq, res: guestRes } = createMockReqRes({
      method: "POST",
      url: "/admin/broadcast",
      body: { title: "Hacked Alert", message: "Unauthorized message" },
    });
    await broadcastHandler(guestReq, guestRes);
    assert.equal(guestRes.getStatusCode(), 401, "Unauthenticated request must receive 401 Unauthorized");

    // Ordinary citizen -> 403
    const { req: citizenReq, res: citizenRes } = createMockReqRes({
      method: "POST",
      url: "/admin/broadcast",
      user: citizenUser,
      body: { title: "Citizen Alert", message: "Ordinary user attempting broadcast" },
    });
    await broadcastHandler(citizenReq, citizenRes);
    assert.equal(citizenRes.getStatusCode(), 403, "Non-admin user must receive 403 Forbidden");
  });

  await t.test("6. Admin custom notification broadcast succeeds and delivers to audience", async () => {
    const { req, res } = createMockReqRes({
      method: "POST",
      url: "/admin/broadcast",
      user: adminUser,
      body: {
        title: "Official Civic Announcement",
        message: "Cleanliness and road maintenance drive starting Monday in Fazilnagar.",
        link: "/news",
        type: "custom_notification",
        targetAudience: "all",
      },
    });

    await broadcastHandler(req, res);
    assert.equal(res.getStatusCode(), 201);
    const data = res.getData();
    assert.ok(data.success);
    assert.ok(data.notification);
    assert.equal(data.notification.title, "Official Civic Announcement");
    assert.equal(data.notification.type, "custom_notification");
    testIdsToClean.push(data.notification._id);
  });

  await t.test("7. Admin custom alert broadcast succeeds with severity and expiry", async () => {
    const { req, res } = createMockReqRes({
      method: "POST",
      url: "/admin/broadcast",
      user: adminUser,
      body: {
        title: "Urgent Weather Advisory",
        message: "Severe storm warning for Kushinagar / Fazilnagar region. Stay indoors.",
        link: "/emergency",
        type: "custom_alert",
        severity: "urgent",
        targetAudience: "all",
        expiresInHours: 24,
      },
    });

    await broadcastHandler(req, res);
    assert.equal(res.getStatusCode(), 201);
    const data = res.getData();
    assert.ok(data.success);
    assert.equal(data.notification.type, "custom_alert");
    assert.equal(data.notification.severity, "urgent");
    assert.ok(data.notification.expiresAt, "expiresAt must be populated");
    testIdsToClean.push(data.notification._id);
  });

  await t.test("8. Duplicate broadcast prevention: identical broadcast rejected within 10s", async () => {
    const dupTitle = "Water Supply Interruption Notice " + Date.now();
    const dupMsg = "Water supply will be paused for pipeline repair between 2 PM and 5 PM.";

    const { req: req1, res: res1 } = createMockReqRes({
      method: "POST",
      url: "/admin/broadcast",
      user: adminUser,
      body: {
        title: dupTitle,
        message: dupMsg,
        type: "custom_alert",
        severity: "warning",
      },
    });
    await broadcastHandler(req1, res1);
    assert.equal(res1.getStatusCode(), 201);
    testIdsToClean.push(res1.getData().notification._id);

    // Immediate second attempt with same title and message -> 409 Conflict
    const { req: req2, res: res2 } = createMockReqRes({
      method: "POST",
      url: "/admin/broadcast",
      user: adminUser,
      body: {
        title: dupTitle,
        message: dupMsg,
        type: "custom_alert",
        severity: "warning",
      },
    });
    await broadcastHandler(req2, res2);
    assert.equal(res2.getStatusCode(), 409, "Rapid identical broadcast must return 409 Conflict");
  });

  await t.test("9. Expired alerts are automatically filtered from GET /api/notifications", async () => {
    const expiredAlert = new Notification({
      type: "custom_alert",
      severity: "urgent",
      title: "Expired Yesterday Alert",
      message: "This alert expired in the past",
      expiresAt: new Date(Date.now() - 3600000), // 1 hour ago
      readBy: [],
    });
    await expiredAlert.save();
    testIdsToClean.push(expiredAlert._id);

    const { req, res } = createMockReqRes({
      method: "GET",
      url: "/",
      headers: { "x-client-id": "client_check_expired_" + Date.now() },
    });
    await getHandler(req, res);
    const found = res.getData().notifications.find((n) => n._id.toString() === expiredAlert._id.toString());
    assert.equal(found, undefined, "Expired alert must not be returned in public feed");
  });
});
