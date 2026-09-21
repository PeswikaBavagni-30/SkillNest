const http = require("http");
const jwt = require("jsonwebtoken");
const app = require("./server");
const supabase = require("./src/config/supabase");

const JWT_SECRET = process.env.JWT_SECRET || "skillnest_jwt_secret_key_2026_secure";

// Helper to generate test JWT token
function generateToken(user) {
  return jwt.sign(
    { sub: user.user_id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: "1h" }
  );
}

// Helper to make HTTP requests
function request(server, { method, path, headers = {}, body = null }) {
  return new Promise((resolve, reject) => {
    const { port } = server.address();
    const reqOptions = {
      hostname: "127.0.0.1",
      port,
      path,
      method,
      headers: {
        "Content-Type": "application/json",
        ...headers
      }
    };

    const req = http.request(reqOptions, (res) => {
      let rawData = "";
      res.on("data", (chunk) => {
        rawData += chunk;
      });
      res.on("end", () => {
        let parsed = null;
        try {
          parsed = JSON.parse(rawData);
        } catch {
          parsed = rawData;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: parsed
        });
      });
    });

    req.on("error", reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTestSuite() {
  console.log("==================================================");
  console.log("🚀 STARTING MEMBER 4 AUTOMATED TEST SUITE");
  console.log("==================================================");

  // 1. Fetch test users from Supabase
  const { data: customers, error: cErr } = await supabase
    .from("users")
    .select("user_id, email, full_name, role")
    .eq("role", "customer")
    .limit(2);

  if (cErr || !customers || customers.length < 2) {
    throw new Error("Could not find 2 customers in database for testing.");
  }

  const customerA = customers[0];
  const customerB = customers[1];

  console.log(`✓ Test Customer A: ${customerA.email} (${customerA.user_id})`);
  console.log(`✓ Test Customer B: ${customerB.email} (${customerB.user_id})`);

  // 2. Fetch or create a test booking for Customer A
  let { data: bookingA } = await supabase
    .from("bookings")
    .select("*, services(*)")
    .eq("customer_id", customerA.user_id)
    .limit(1)
    .maybeSingle();

  if (!bookingA) {
    // Find any service
    const { data: anyService } = await supabase.from("services").select("*").limit(1).single();
    const { data: newB } = await supabase
      .from("bookings")
      .insert({
        customer_id: customerA.user_id,
        service_id: anyService.service_id,
        booking_date: "2026-10-10",
        booking_time: "10:00:00",
        address: "123 Test Street",
        status: "pending",
        total_amount: anyService.price || 999
      })
      .select("*, services(*)")
      .single();
    bookingA = newB;
  }

  console.log(`✓ Test Booking for Customer A: ${bookingA.booking_id} (₹${bookingA.total_amount})`);

  const tokenA = generateToken(customerA);
  const tokenB = generateToken(customerB);

  // Start ephemeral server
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();
  console.log(`✓ Test server running on port ${port}`);
  console.log("--------------------------------------------------");

  let passed = 0;
  let failed = 0;

  async function assertCase(name, fn) {
    try {
      await fn();
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ [FAIL] ${name}`);
      console.error(`   Error: ${err.message}`);
      failed++;
    }
  }

  // TEST 1: Create payment for valid booking
  await assertCase("Test 1: Create payment for valid booking", async () => {
    const res = await request(server, {
      method: "POST",
      path: "/api/payments",
      headers: { Authorization: `Bearer ${tokenA}` },
      body: {
        booking_id: bookingA.booking_id,
        amount: bookingA.total_amount,
        simulate_status: "PENDING"
      }
    });

    if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}: ${JSON.stringify(res.body)}`);
    if (!res.body.success) throw new Error("Expected res.body.success to be true");
    if (res.body.payment.payment_status !== "pending") {
      throw new Error(`Expected payment_status 'pending', got '${res.body.payment.payment_status}'`);
    }
  });

  // TEST 2: Create payment for invalid booking
  await assertCase("Test 2: Create payment for invalid booking", async () => {
    const res = await request(server, {
      method: "POST",
      path: "/api/payments",
      headers: { Authorization: `Bearer ${tokenA}` },
      body: {
        booking_id: "00000000-0000-0000-0000-000000000000",
        amount: 500,
        simulate_status: "PENDING"
      }
    });

    if (res.status !== 404) throw new Error(`Expected 404, got ${res.status}: ${JSON.stringify(res.body)}`);
    if (res.body.success !== false) throw new Error("Expected success: false");
  });

  // TEST 3: Create payment without authentication
  await assertCase("Test 3: Create payment without authentication", async () => {
    const res = await request(server, {
      method: "POST",
      path: "/api/payments",
      body: {
        booking_id: bookingA.booking_id,
        amount: 500
      }
    });

    if (res.status !== 401) throw new Error(`Expected 401 Unauthorized, got ${res.status}`);
  });

  // TEST 4: Successful mock payment
  await assertCase("Test 4: Successful mock payment", async () => {
    const res = await request(server, {
      method: "POST",
      path: "/api/payments",
      headers: { Authorization: `Bearer ${tokenA}` },
      body: {
        booking_id: bookingA.booking_id,
        simulate_status: "SUCCESS"
      }
    });

    if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}: ${JSON.stringify(res.body)}`);
    if (res.body.payment.payment_status !== "success") {
      throw new Error(`Expected status 'success', got '${res.body.payment.payment_status}'`);
    }
    if (!res.body.payment.transaction_id || !res.body.payment.transaction_id.startsWith("txn_mock_")) {
      throw new Error(`Invalid transaction_id format: ${res.body.payment.transaction_id}`);
    }
    if (!res.body.payment.payment_date) {
      throw new Error("Expected payment_date to be recorded");
    }
  });

  // TEST 5: Failed mock payment
  await assertCase("Test 5: Failed mock payment", async () => {
    const res = await request(server, {
      method: "POST",
      path: "/api/payments",
      headers: { Authorization: `Bearer ${tokenA}` },
      body: {
        booking_id: bookingA.booking_id,
        simulate_status: "FAILED"
      }
    });

    if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}: ${JSON.stringify(res.body)}`);
    if (res.body.payment.payment_status !== "failed") {
      throw new Error(`Expected status 'failed', got '${res.body.payment.payment_status}'`);
    }
  });

  // TEST 6: Invalid payment status
  await assertCase("Test 6: Invalid payment status", async () => {
    const res = await request(server, {
      method: "POST",
      path: "/api/payments",
      headers: { Authorization: `Bearer ${tokenA}` },
      body: {
        booking_id: bookingA.booking_id,
        simulate_status: "NON_EXISTENT_STATUS"
      }
    });

    if (res.status !== 400) throw new Error(`Expected 400 Bad Request, got ${res.status}`);
    if (res.body.success !== false) throw new Error("Expected success: false");
  });

  // TEST 7: Get payment for existing booking
  await assertCase("Test 7: Get payment for existing booking", async () => {
    const res = await request(server, {
      method: "GET",
      path: `/api/payments/${bookingA.booking_id}`,
      headers: { Authorization: `Bearer ${tokenA}` }
    });

    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
    if (!res.body.payment || res.body.payment.booking_id !== bookingA.booking_id) {
      throw new Error("Returned payment does not match booking_id");
    }
  });

  // TEST 8: Unauthorized payment access
  await assertCase("Test 8: Unauthorized payment access", async () => {
    // Customer B attempts to pay for Customer A's booking
    const res = await request(server, {
      method: "POST",
      path: "/api/payments",
      headers: { Authorization: `Bearer ${tokenB}` },
      body: {
        booking_id: bookingA.booking_id,
        simulate_status: "SUCCESS"
      }
    });

    if (res.status !== 403) throw new Error(`Expected 403 Forbidden, got ${res.status}: ${JSON.stringify(res.body)}`);

    // Customer B attempts to view Customer A's booking payment
    const getRes = await request(server, {
      method: "GET",
      path: `/api/payments/${bookingA.booking_id}`,
      headers: { Authorization: `Bearer ${tokenB}` }
    });

    if (getRes.status !== 403) throw new Error(`Expected 403 Forbidden on GET, got ${getRes.status}`);
  });

  // TEST 9: Get notifications
  await assertCase("Test 9: Get notifications", async () => {
    const res = await request(server, {
      method: "GET",
      path: "/api/notifications",
      headers: { Authorization: `Bearer ${tokenA}` }
    });

    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (!Array.isArray(res.body.notifications)) throw new Error("Expected notifications array");
    if (typeof res.body.unread_count !== "number") throw new Error("Expected unread_count number");
  });

  // TEST 10: Mark notification as read
  await assertCase("Test 10: Mark notification as read", async () => {
    // Insert a test unread notification for Customer A
    const { data: newNotif, error } = await supabase
      .from("notifications")
      .insert({
        user_id: customerA.user_id,
        title: "Test Unread Notification",
        message: "This is a test notification to mark read.",
        is_read: false
      })
      .select()
      .single();

    if (error) throw error;

    const res = await request(server, {
      method: "PUT",
      path: `/api/notifications/${newNotif.notification_id}/read`,
      headers: { Authorization: `Bearer ${tokenA}` }
    });

    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
    if (res.body.notification.is_read !== true) {
      throw new Error(`Expected is_read: true, got ${res.body.notification.is_read}`);
    }
  });

  // TEST 11: Invalid notification ID
  await assertCase("Test 11: Invalid notification ID", async () => {
    // Malformed UUID
    const resMalformed = await request(server, {
      method: "PUT",
      path: "/api/notifications/not-a-valid-uuid/read",
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    if (resMalformed.status !== 400) throw new Error(`Expected 400 for malformed UUID, got ${resMalformed.status}`);

    // Nonexistent UUID
    const resNonexistent = await request(server, {
      method: "PUT",
      path: "/api/notifications/00000000-0000-0000-0000-000000000000/read",
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    if (resNonexistent.status !== 404) throw new Error(`Expected 404 for nonexistent UUID, got ${resNonexistent.status}`);
  });

  // TEST 12: Verify booking/payment notifications are generated correctly
  await assertCase("Test 12: Verify booking/payment notifications are generated correctly", async () => {
    // Re-simulate successful payment for Customer A
    await request(server, {
      method: "POST",
      path: "/api/payments",
      headers: { Authorization: `Bearer ${tokenA}` },
      body: {
        booking_id: bookingA.booking_id,
        simulate_status: "SUCCESS"
      }
    });

    // Check notifications table for Customer A
    const { data: notifs } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", customerA.user_id)
      .eq("title", "Payment Successful")
      .order("created_at", { ascending: false })
      .limit(1);

    if (!notifs || notifs.length === 0) {
      throw new Error("Expected 'Payment Successful' notification in database for Customer A");
    }

    // Also check provider notification if booking has a provider
    const providerId = bookingA.services?.provider_id;
    if (providerId) {
      const { data: pNotifs } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", providerId)
        .eq("title", "Payment Received")
        .order("created_at", { ascending: false })
        .limit(1);

      if (!pNotifs || pNotifs.length === 0) {
        throw new Error("Expected 'Payment Received' notification in database for Provider");
      }
    }
  });

  server.close();

  console.log("--------------------------------------------------");
  console.log(`🏁 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTestSuite().catch((err) => {
  console.error("FATAL SUITE ERROR:", err);
  process.exit(1);
});
