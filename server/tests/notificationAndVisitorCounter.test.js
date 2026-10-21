import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import SiteSettings from "../models/SiteSettings.js";
import VisitorSession from "../models/VisitorSession.js";
import notificationRoutes from "../routes/notifications.js";
import visitorsRoutes, {
  calculateSimulatedCount,
  getRealActiveVisitorCount,
  isNightTime,
  clampNightCount,
} from "../routes/visitors.js";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_key";

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
      { id: String(user._id || user.id), email: user.email, role: user.role || "user" },
      JWT_SECRET
    );
    reqHeaders.authorization = `Bearer ${token}`;
  }

  const req = {
    method,
    url,
    originalUrl: url,
    params,
    query,
    body,
    headers: reqHeaders,
    ip: "127.0.0.1",
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

function getRouteHandler(router, path, method) {
  for (const layer of router.stack) {
    if (layer.route && layer.route.path === path) {
      const matchMethod = layer.route.methods[method.toLowerCase()];
      if (matchMethod) {
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
                  maybePromise
                    .then(() => {
                      setTimeout(finish, 10);
                    })
                    .catch((e) => {
                      errorPassed = e;
                      finish();
                    });
                }
              } catch (e) {
                errorPassed = e;
                finish();
              }
            });

            if (errorPassed) {
              res.status(500).json({ error: errorPassed.message });
              break;
            }
            if (!nextCalled && res.getData() !== null) {
              break;
            }
          }
        };
      }
    }
  }
  return null;
}

test("Focused Regression: Notifications & Live Visitor Counter Suite", async (t) => {
  const notifGetHandler = getRouteHandler(notificationRoutes, "/", "GET");
  const notifReadHandler = getRouteHandler(notificationRoutes, "/:id/read", "PATCH");
  const notifMarkAllHandler = getRouteHandler(notificationRoutes, "/mark-all-read", "POST");

  const visitorHeartbeatHandler = getRouteHandler(visitorsRoutes, "/heartbeat", "POST");
  const visitorCountHandler = getRouteHandler(visitorsRoutes, "/count", "GET");
  const visitorSettingsGetHandler = getRouteHandler(visitorsRoutes, "/settings", "GET");
  const visitorSettingsPutHandler = getRouteHandler(visitorsRoutes, "/settings", "PUT");

  assert.ok(notifGetHandler, "GET /api/notifications must exist");
  assert.ok(notifReadHandler, "PATCH /api/notifications/:id/read must exist");
  assert.ok(notifMarkAllHandler, "POST /api/notifications/mark-all-read must exist");
  assert.ok(visitorHeartbeatHandler, "POST /api/visitors/heartbeat must exist");
  assert.ok(visitorCountHandler, "GET /api/visitors/count must exist");
  assert.ok(visitorSettingsGetHandler, "GET /api/visitors/settings must exist");
  assert.ok(visitorSettingsPutHandler, "PUT /api/visitors/settings must exist");

  let isConnected = false;
  if (mongoose.connection.readyState !== 1) {
    const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/fazilnagar_test";
    try {
      await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 2000 });
      isConnected = true;
    } catch (_) {
      console.log("[Test] Running tests with in-memory validation fallback where DB is offline");
    }
  } else {
    isConnected = true;
  }

  const createdNotifIds = [];
  const createdUserIds = [];

  t.after(async () => {
    if (isConnected) {
      if (createdNotifIds.length > 0) {
        await Notification.deleteMany({ _id: { $in: createdNotifIds } });
      }
      if (createdUserIds.length > 0) {
        await User.deleteMany({ _id: { $in: createdUserIds } });
      }
      await VisitorSession.deleteMany({ visitorId: { $regex: /^test_vis_/ } });
    }
  });

  // -------------------------------------------------------------
  // PART 1: Notification Badge & Unread Logic Tests
  // -------------------------------------------------------------
  await t.test("1.1 Unauthenticated guest receives unreadCount: 0 (No 9+ badge on visits)", async () => {
    const { req, res } = createMockReqRes({
      method: "GET",
      url: "/",
      headers: { "x-client-id": "guest_device_" + Date.now() },
    });

    await notifGetHandler(req, res);
    assert.equal(res.getStatusCode(), 200);
    const data = res.getData();
    assert.ok(data.success);
    assert.equal(data.unreadCount, 0, "Unauthenticated visitors MUST receive unreadCount = 0 to prevent 9+ badge");
  });

  await t.test("1.2 Badge rendering logic hides badge on 0, displays number on 1-9, and 9+ on 10+", () => {
    const renderBadgeText = (count) => {
      if (!count || count <= 0) return null;
      return count > 9 ? "9+" : String(count);
    };

    assert.equal(renderBadgeText(0), null, "0 unread count must render NO badge");
    assert.equal(renderBadgeText(-1), null, "Negative unread count must render NO badge");
    assert.equal(renderBadgeText(1), "1", "1 unread must display '1'");
    assert.equal(renderBadgeText(5), "5", "5 unread must display '5'");
    assert.equal(renderBadgeText(9), "9", "9 unread must display '9'");
    assert.equal(renderBadgeText(10), "9+", "10 unread must display '9+'");
    assert.equal(renderBadgeText(12), "9+", "12 unread must display '9+'");
  });

  if (isConnected) {
    await t.test("1.3 Authenticated user sees genuine unread count and marking as read decrements badge & persists in MongoDB", async () => {
      try {
        const authUser = new User({
          name: "Test Citizen",
          email: `citizen_${Date.now()}@example.com`,
          password: "hashed_dummy_password",
          role: "user",
        });
        await authUser.save();
        createdUserIds.push(authUser._id);

        // Create 2 test notifications where user is not in readBy
        const notif1 = new Notification({
          type: "system",
          title: "Test Alert 1",
          message: "Message 1",
          targetAudience: "all",
          readBy: [],
        });
        const notif2 = new Notification({
          type: "system",
          title: "Test Alert 2",
          message: "Message 2",
          targetAudience: "all",
          readBy: [],
        });
        await notif1.save();
        await notif2.save();
        createdNotifIds.push(notif1._id, notif2._id);

        // Fetch as authenticated user
        const { req: getReq1, res: getRes1 } = createMockReqRes({
          method: "GET",
          url: "/",
          user: authUser,
        });
        await notifGetHandler(getReq1, getRes1);
        const data1 = getRes1.getData();
        assert.ok(data1, "Response data must exist");
        assert.ok(data1.unreadCount >= 2, `Authenticated user must receive genuine unread count (got ${data1?.unreadCount})`);

        // Mark notif1 as read
        const { req: readReq, res: readRes } = createMockReqRes({
          method: "PATCH",
          url: `/${notif1._id}/read`,
          params: { id: String(notif1._id) },
          user: authUser,
        });
        await notifReadHandler(readReq, readRes);
        assert.equal(readRes.getStatusCode(), 200);

        // Verify notif1 persisted in MongoDB
        const updatedNotif1 = await Notification.findById(notif1._id);
        assert.ok(
          updatedNotif1.readBy.includes(String(authUser._id)),
          "MongoDB must persist user ID in readBy array"
        );

        // Subsequent fetch for authenticated user must show decremented unreadCount
        const { req: getReq2, res: getRes2 } = createMockReqRes({
          method: "GET",
          url: "/",
          user: authUser,
        });
        await notifGetHandler(getReq2, getRes2);
        const data2 = getRes2.getData();
        assert.equal(
          data2.unreadCount,
          data1.unreadCount - 1,
          "Subsequent fetch must decrement unreadCount by exactly 1"
        );
      } catch (err) {
        console.error("1.3 Failure details:", err);
        throw err;
      }
    });
  }

  // -------------------------------------------------------------
  // PART 2: Live Visitor Counter & Multi-tab Deduplication Tests
  // -------------------------------------------------------------
  await t.test("2.1 Heartbeat with duplicate tabs from the same visitorId counts as exactly 1 visitor", async () => {
    const multiTabVisitorId = "test_vis_multitab_" + Date.now();

    // Simulate 4 distinct tabs pinging the same visitorId
    for (let tab = 1; tab <= 4; tab++) {
      const { req, res } = createMockReqRes({
        method: "POST",
        url: "/heartbeat",
        body: { visitorId: multiTabVisitorId },
      });
      await visitorHeartbeatHandler(req, res);
      assert.equal(res.getStatusCode(), 200);
      assert.ok(res.getData().success);
    }

    if (isConnected) {
      const sessions = await VisitorSession.find({ visitorId: multiTabVisitorId });
      assert.equal(
        sessions.length,
        1,
        "Multiple tabs from same visitor MUST deduplicate to exactly 1 record in shared storage"
      );
    }
  });

  await t.test("2.2 Public GET /count returns current active visitor count and active mode", async () => {
    const { req, res } = createMockReqRes({ method: "GET", url: "/count" });
    await visitorCountHandler(req, res);
    assert.equal(res.getStatusCode(), 200);
    const data = res.getData();
    assert.ok(data.success);
    assert.equal(typeof data.count, "number");
    assert.ok(data.mode === "real" || data.mode === "simulated");
  });

  // -------------------------------------------------------------
  // PART 3: Admin Modes & 0–1500 Server-Side Enforcement Tests
  // -------------------------------------------------------------
  await t.test("3.1 Non-admin or unauthenticated requests to update settings are rejected (401/403)", async () => {
    // Unauthenticated
    const { req: req1, res: res1 } = createMockReqRes({
      method: "PUT",
      url: "/settings",
      body: { mode: "simulated", simulatedCount: 200 },
    });
    await visitorSettingsPutHandler(req1, res1);
    assert.ok([401, 403].includes(res1.getStatusCode()), "Unauthenticated request must be rejected");

    // Regular citizen user
    const citizenUser = { id: new mongoose.Types.ObjectId(), email: "citizen@test.com", role: "citizen" };
    const { req: req2, res: res2 } = createMockReqRes({
      method: "PUT",
      url: "/settings",
      body: { mode: "simulated", simulatedCount: 200 },
      user: citizenUser,
    });
    await visitorSettingsPutHandler(req2, res2);
    assert.equal(res2.getStatusCode(), 403, "Citizen request must be rejected with 403 Forbidden");
  });

  await t.test("3.2 Enforces 0–1500 server-side bounds strictly", async () => {
    let adminUser = null;
    if (isConnected) {
      adminUser = await User.findOne({ role: "admin", status: { $ne: "suspended" } });
      if (!adminUser) {
        adminUser = new User({
          name: "Admin User",
          email: `admin_tester_${Date.now()}@example.com`,
          password: "hashed_dummy_password",
          role: "admin",
          status: "active",
        });
        await adminUser.save();
        createdUserIds.push(adminUser._id);
      }
    } else {
      adminUser = { id: new mongoose.Types.ObjectId(), email: "admin@test.com", role: "admin" };
    }

    // Test simulatedCount > 1500 rejected
    const { req: reqOver, res: resOver } = createMockReqRes({
      method: "PUT",
      url: "/settings",
      body: { mode: "simulated", simulatedCount: 1501 },
      user: adminUser,
    });
    await visitorSettingsPutHandler(reqOver, resOver);
    assert.equal(resOver.getStatusCode(), 400, "Counts over 1500 must be rejected with 400 Bad Request");

    // Test simulatedCount < 0 rejected
    const { req: reqUnder, res: resUnder } = createMockReqRes({
      method: "PUT",
      url: "/settings",
      body: { mode: "simulated", simulatedCount: -5 },
      user: adminUser,
    });
    await visitorSettingsPutHandler(reqUnder, resUnder);
    assert.equal(resUnder.getStatusCode(), 400, "Counts under 0 must be rejected with 400 Bad Request");

    // Test varianceMin > varianceMax rejected
    const { req: reqMinMax, res: resMinMax } = createMockReqRes({
      method: "PUT",
      url: "/settings",
      body: { mode: "simulated", simulatedCount: 300, varianceMin: 400, varianceMax: 200 },
      user: adminUser,
    });
    await visitorSettingsPutHandler(reqMinMax, resMinMax);
    assert.equal(resMinMax.getStatusCode(), 400, "varianceMin > varianceMax must be rejected");
  });

  await t.test("3.3 Simulated count formula guarantees 0–1500 bounds and all visitors see identical value", () => {
    const config = {
      simulatedCount: 350,
      randomVariance: true,
      varianceMin: 300,
      varianceMax: 400,
    };

    const count1 = calculateSimulatedCount(config);
    const count2 = calculateSimulatedCount(config);
    assert.equal(count1, count2, "All visitors querying within the same time window MUST receive identical simulated count");
    assert.ok(count1 >= 300 && count1 <= 400, "Simulated count must stay within configured variance bounds");
    assert.ok(count1 >= 0 && count1 <= 1500, "Simulated count must stay within 0-1500");

    // Boundary edge cases
    assert.equal(calculateSimulatedCount({ simulatedCount: 0, randomVariance: false }), 0);
    assert.equal(calculateSimulatedCount({ simulatedCount: 1500, randomVariance: false }), 1500);
    assert.equal(calculateSimulatedCount({ simulatedCount: 9999, randomVariance: false }), 1500);
    assert.equal(calculateSimulatedCount({ simulatedCount: -100, randomVariance: false }), 0);
  });

  await t.test("3.4 Nighttime simulated live count logic (11:30 PM - 6:59 AM strictly 1-9, day preserved)", () => {
    // 1. Verify local time nighttime window and midnight crossover
    const createDate = (hours, minutes) => {
      const d = new Date(2026, 9, 21, hours, minutes, 0, 0);
      return d;
    };

    // Daytime: 7:00 AM through 11:29 PM
    assert.equal(isNightTime(createDate(7, 0)), false, "7:00 AM should be day");
    assert.equal(isNightTime(createDate(12, 0)), false, "12:00 PM should be day");
    assert.equal(isNightTime(createDate(23, 29)), false, "11:29 PM should be day");

    // Nighttime: 11:30 PM through 6:59 AM (handles midnight crossover)
    assert.equal(isNightTime(createDate(23, 30)), true, "11:30 PM should be night");
    assert.equal(isNightTime(createDate(23, 59)), true, "11:59 PM should be night");
    assert.equal(isNightTime(createDate(0, 0)), true, "12:00 AM midnight should be night");
    assert.equal(isNightTime(createDate(3, 30)), true, "3:30 AM should be night");
    assert.equal(isNightTime(createDate(6, 59)), true, "6:59 AM should be night");

    // 2. Verify nighttime count clamping strictly between 1 and 9 (never 10 or higher)
    for (let c = 0; c <= 1500; c++) {
      const clamped = clampNightCount(c);
      assert.ok(clamped >= 1 && clamped <= 9, `Count ${c} clamped to ${clamped} must be between 1 and 9`);
    }

    // 3. Verify calculateSimulatedCount preserves daytime count and enforces night count
    const config = { simulatedCount: 120, randomVariance: false };
    const dayCount = calculateSimulatedCount(config);
    assert.equal(dayCount, 120, "Daytime simulated count must preserve original count");

    const nightCount = calculateSimulatedCount(config, { isNight: true });
    assert.ok(nightCount >= 1 && nightCount <= 9, "Nighttime count must be between 1 and 9");
  });
});
