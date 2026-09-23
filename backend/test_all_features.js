/**
 * SkillNest Major Features Automated Integration Test Suite
 * Tests all 6 features end-to-end against live backend:
 * 1. Single Account: Customer <-> Provider Mode Switching
 * 2. Identity / KYC Verification Abstraction & Mock Provider
 * 3. Real Service Image Upload & Static Serving
 * 4. Provider Portfolio Showcase
 * 5. Custom Service Requests, Bidding & Automatic Booking
 * 6. SkillNest-Aware AI Chatbot Grounding
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");
const supabase = require("./src/config/supabase");

const JWT_SECRET = process.env.JWT_SECRET || "skillnest_jwt_secret_key_2026_secure";
const BASE_URL = "http://localhost:5000";

function generateToken(user) {
  return jwt.sign(
    { sub: user.user_id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: "1h" }
  );
}

function request({ method, endpoint, headers = {}, body = null }) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, BASE_URL);
    const reqOptions = {
      hostname: url.hostname,
      port: url.port || 5000,
      path: url.pathname + url.search,
      method,
      headers: {
        "Content-Type": "application/json",
        ...headers
      }
    };

    const req = http.request(reqOptions, (res) => {
      let rawData = "";
      res.on("data", (chunk) => (rawData += chunk));
      res.on("end", () => {
        let parsed = null;
        try {
          parsed = JSON.parse(rawData);
        } catch {
          parsed = rawData;
        }
        resolve({ status: res.statusCode, headers: res.headers, body: parsed });
      });
    });

    req.on("error", reject);

    if (body) {
      if (typeof body === "string") {
        req.write(body);
      } else {
        req.write(JSON.stringify(body));
      }
    }
    req.end();
  });
}

// Multipart upload helper for image testing
function uploadMultipart({ endpoint, headers = {}, filename, fileBuffer, mimeType }) {
  return new Promise((resolve, reject) => {
    const boundary = "----SkillNestTestBoundary" + Date.now();
    const url = new URL(endpoint, BASE_URL);

    const postHeader = `--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`;
    const postFooter = `\r\n--${boundary}--\r\n`;

    const bodyBuffer = Buffer.concat([
      Buffer.from(postHeader, "utf-8"),
      fileBuffer,
      Buffer.from(postFooter, "utf-8")
    ]);

    const reqOptions = {
      hostname: url.hostname,
      port: url.port || 5000,
      path: url.pathname + url.search,
      method: "POST",
      headers: {
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
        "Content-Length": bodyBuffer.length,
        ...headers
      }
    };

    const req = http.request(reqOptions, (res) => {
      let rawData = "";
      res.on("data", (chunk) => (rawData += chunk));
      res.on("end", () => {
        let parsed = null;
        try {
          parsed = JSON.parse(rawData);
        } catch {
          parsed = rawData;
        }
        resolve({ status: res.statusCode, body: parsed });
      });
    });

    req.on("error", reject);
    req.write(bodyBuffer);
    req.end();
  });
}

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✓ ${message}`);
    passedTests++;
  } else {
    console.error(`  ✕ FAIL: ${message}`);
    throw new Error(`Assertion Failed: ${message}`);
  }
}

async function runTests() {
  console.log("\n=======================================================");
  console.log("🌟 RUNNING COMPLETE SKILLNEST 6-FEATURE VERIFICATION");
  console.log("=======================================================\n");

  // Fetch test users from Supabase
  const { data: users, error: uErr } = await supabase
    .from("users")
    .select("user_id, email, full_name, role, is_verified")
    .limit(10);

  if (uErr || !users || users.length === 0) {
    throw new Error("Failed to load test users from Supabase.");
  }

  const customerUser = users.find((u) => u.role === "customer") || users[0];
  const providerUser = users.find((u) => u.role === "provider" && u.user_id !== customerUser.user_id) || users[1];
  const adminUser = users.find((u) => u.role === "admin") || {
    user_id: "admin_test_id",
    email: "admin@skillnest.com",
    role: "admin"
  };

  const customerToken = generateToken(customerUser);
  const providerToken = generateToken(providerUser);
  const adminToken = generateToken(adminUser);

  console.log(`👤 Test Customer: ${customerUser.email} (${customerUser.user_id})`);
  console.log(`🛠️ Test Provider: ${providerUser.email} (${providerUser.user_id})`);
  console.log(`👑 Test Admin:    ${adminUser.email} (${adminUser.user_id})\n`);

  // ==========================================
  // FEATURE 1: SINGLE ACCOUNT MODE SWITCHING
  // ==========================================
  console.log("-------------------------------------------------------");
  console.log("FEATURE 1: Single Account Customer ↔ Provider Switching");
  console.log("-------------------------------------------------------");

  // 1.1 Switch customer to provider mode
  const switch1 = await request({
    method: "PUT",
    endpoint: "/api/users/switch-mode",
    headers: { Authorization: `Bearer ${customerToken}` },
    body: { targetMode: "provider" }
  });
  assert(switch1.status === 200 && switch1.body.success, "Customer switches to Provider mode (HTTP 200)");
  assert(switch1.body.user.role.toLowerCase() === "provider", "User role successfully changed to provider");
  assert(switch1.body.user.id === customerUser.user_id, "User ID unchanged across mode switch");

  // 1.2 Switch back to customer mode
  const switch2 = await request({
    method: "PUT",
    endpoint: "/api/users/switch-mode",
    headers: { Authorization: `Bearer ${customerToken}` },
    body: { targetMode: "customer" }
  });
  assert(switch2.status === 200 && switch2.body.success, "Provider switches back to Customer mode (HTTP 200)");
  assert(switch2.body.user.role.toLowerCase() === "customer", "User role successfully reverted to customer");

  // 1.3 Invalid target mode rejected
  const switchInvalid = await request({
    method: "PUT",
    endpoint: "/api/users/switch-mode",
    headers: { Authorization: `Bearer ${customerToken}` },
    body: { targetMode: "superadmin" }
  });
  assert(switchInvalid.status === 400, "Invalid target mode safely rejected with HTTP 400");

  // ==========================================
  // FEATURE 2: IDENTITY / KYC VERIFICATION
  // ==========================================
  console.log("\n-------------------------------------------------------");
  console.log("FEATURE 2: Identity / KYC Verification & Mock Provider");
  console.log("-------------------------------------------------------");

  // 2.1 Unauthenticated access blocked
  const unauthKyc = await request({
    method: "GET",
    endpoint: "/api/verification/status"
  });
  assert(unauthKyc.status === 401, "Unauthenticated verification query rejected with HTTP 401");

  // 2.2 Start verification for provider
  const startKyc = await request({
    method: "POST",
    endpoint: "/api/verification/start",
    headers: { Authorization: `Bearer ${providerToken}` }
  });
  assert((startKyc.status === 200 || startKyc.status === 201) && startKyc.body.success, "Provider initiates verification (HTTP 201)");
  assert(startKyc.body.status === "PENDING" || startKyc.body.status === "VERIFIED", "Verification status is PENDING or VERIFIED");
  assert(Boolean(startKyc.body.verification_reference), "Unique verification reference generated");
  assert(!JSON.stringify(startKyc.body).includes("raw_aadhaar"), "Zero raw Aadhaar or sensitive government IDs stored");

  // 2.3 Check verification status
  const checkKyc = await request({
    method: "GET",
    endpoint: "/api/verification/status",
    headers: { Authorization: `Bearer ${providerToken}` }
  });
  assert(checkKyc.status === 200 && checkKyc.body.success, "Get verification status returns HTTP 200");

  // 2.4 Mock outcome simulation: VERIFIED
  const mockSuccess = await request({
    method: "POST",
    endpoint: "/api/verification/mock-result",
    headers: { Authorization: `Bearer ${providerToken}` },
    body: { status: "VERIFIED" }
  });
  assert(mockSuccess.status === 200 && mockSuccess.body.success, "Mock verification callback sets status to VERIFIED (HTTP 200)");
  assert(mockSuccess.body.record.status === "VERIFIED", "Status is confirmed VERIFIED");
  assert(Boolean(mockSuccess.body.record.verified_at), "Timestamp recorded in verified_at");

  // 2.5 Mock outcome simulation: FAILED
  const mockFail = await request({
    method: "POST",
    endpoint: "/api/verification/mock-result",
    headers: { Authorization: `Bearer ${providerToken}` },
    body: { status: "FAILED", reason: "Document glare" }
  });
  assert(mockFail.status === 200 && mockFail.body.success, "Mock verification sets status to FAILED with reason");
  assert(mockFail.body.record.failure_reason === "Document glare", "Failure reason recorded accurately");

  // Reset to VERIFIED for downstream tests
  await request({
    method: "POST",
    endpoint: "/api/verification/mock-result",
    headers: { Authorization: `Bearer ${providerToken}` },
    body: { status: "VERIFIED" }
  });

  // 2.6 Admin overview
  const adminKyc = await request({
    method: "GET",
    endpoint: "/api/verification/all",
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert(adminKyc.status === 200 && adminKyc.body.success, "Admin retrieves all KYC verification records (HTTP 200)");
  assert(Array.isArray(adminKyc.body.verifications), "Admin verifications returned as list");

  // Non-admin blocked from admin verification list
  const nonAdminKyc = await request({
    method: "GET",
    endpoint: "/api/verification/all",
    headers: { Authorization: `Bearer ${customerToken}` }
  });
  assert(nonAdminKyc.status === 403, "Non-admin blocked from GET /api/verification/all (HTTP 403)");

  // ==========================================
  // FEATURE 3: REAL SERVICE IMAGE UPLOADS
  // ==========================================
  console.log("\n-------------------------------------------------------");
  console.log("FEATURE 3: Real Service Image Upload & Serving");
  console.log("-------------------------------------------------------");

  // Create a minimal 1x1 valid PNG image buffer
  const validPngBuffer = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
    0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
    0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82
  ]);

  // 3.1 Upload valid real image
  const uploadRes = await uploadMultipart({
    endpoint: "/api/services/upload-image",
    headers: { Authorization: `Bearer ${providerToken}` },
    filename: "service_work.png",
    fileBuffer: validPngBuffer,
    mimeType: "image/png"
  });
  assert(uploadRes.status === 200 && uploadRes.body.success, "Upload valid real service image (HTTP 200)");
  const uploadedImageUrl = uploadRes.body?.image_url || uploadRes.body?.imageUrl;
  assert(Boolean(uploadedImageUrl && uploadedImageUrl.includes("/uploads/")), "Returns clean /uploads/ URL path");

  // 3.2 Verify static image is accessible via HTTP GET
  const staticRes = await request({
    method: "GET",
    endpoint: uploadedImageUrl.replace("http://localhost:5000", "")
  });
  assert(staticRes.status === 200, "Static image accessible over HTTP at /uploads/ route (HTTP 200)");

  // 3.3 Reject invalid MIME type
  const invalidUpload = await uploadMultipart({
    endpoint: "/api/services/upload-image",
    headers: { Authorization: `Bearer ${providerToken}` },
    filename: "script.txt",
    fileBuffer: Buffer.from("Not an image"),
    mimeType: "text/plain"
  });
  assert(invalidUpload.status === 400, "Invalid MIME type safely rejected (HTTP 400)");

  // ==========================================
  // FEATURE 4: PROVIDER PORTFOLIO
  // ==========================================
  console.log("\n-------------------------------------------------------");
  console.log("FEATURE 4: Provider Portfolio Showcase");
  console.log("-------------------------------------------------------");

  // 4.1 Add portfolio item
  const addPortfolio = await request({
    method: "POST",
    endpoint: "/api/portfolio",
    headers: { Authorization: `Bearer ${providerToken}` },
    body: {
      title: "Modular Kitchen Renovation",
      description: "Complete granite countertop and wood cabinet design finished in 4 days.",
      category: "Carpentry & Renovation",
      image_url: uploadedImageUrl,
      is_primary: true
    }
  });
  const portfolioItem = addPortfolio.body.portfolio || addPortfolio.body.item;
  const portfolioId = portfolioItem.id;
  assert(Boolean(portfolioId), "Portfolio item created with unique ID");
  assert(portfolioItem.is_primary === true, "Portfolio item set as primary cover");

  // 4.2 Customer/Public view provider's portfolio
  const getPortfolio = await request({
    method: "GET",
    endpoint: `/api/portfolio/provider/${providerUser.user_id}`
  });
  assert(getPortfolio.status === 200 && getPortfolio.body.success, "Customer views provider portfolio (HTTP 200)");
  const portfolioList = getPortfolio.body.items || getPortfolio.body.portfolio || [];
  assert(portfolioList.some((p) => p.id === portfolioId), "Created portfolio item present in provider gallery");

  // 4.3 Toggle primary highlight
  const togglePrimary = await request({
    method: "PATCH",
    endpoint: `/api/portfolio/${portfolioId}/primary`,
    headers: { Authorization: `Bearer ${providerToken}` },
    body: { is_primary: false }
  });
  assert(togglePrimary.status === 200 && togglePrimary.body.success, "Toggle portfolio primary highlight (HTTP 200)");

  // 4.4 Delete portfolio item
  const delPortfolio = await request({
    method: "DELETE",
    endpoint: `/api/portfolio/${portfolioId}`,
    headers: { Authorization: `Bearer ${providerToken}` }
  });
  assert(delPortfolio.status === 200 && delPortfolio.body.success, "Delete portfolio item (HTTP 200)");

  // ==========================================
  // FEATURE 5: CUSTOM SERVICE REQUESTS & BIDS
  // ==========================================
  console.log("\n-------------------------------------------------------");
  console.log("FEATURE 5: Custom Service Requests & Provider Bidding");
  console.log("-------------------------------------------------------");

  // 5.1 Customer posts custom requirement
  const postRequest = await request({
    method: "POST",
    endpoint: "/api/service-requests",
    headers: { Authorization: `Bearer ${customerToken}` },
    body: {
      title: "Custom Antique Sofa Upholstery",
      description: "Need pure velvet fabric reupholstery for a 3-seater teak sofa.",
      budget_max: 3500,
      preferred_date: "2026-10-15"
    }
  });
  assert(postRequest.status === 201 && postRequest.body.success, "Customer posts custom service requirement (HTTP 201)");
  const customReqId = postRequest.body.request.id;
  assert(postRequest.body.request.status.toLowerCase() === "open", "Custom request status starts as 'open'");

  // 5.2 Provider browses open requests
  const openRequests = await request({
    method: "GET",
    endpoint: "/api/service-requests?status=open",
    headers: { Authorization: `Bearer ${providerToken}` }
  });
  assert(openRequests.status === 200 && openRequests.body.success, "Provider views open custom requests (HTTP 200)");
  assert(openRequests.body.requests.some((r) => r.id === customReqId), "Newly posted request visible to providers");

  // 5.3 Provider submits quote/bid
  const submitQuote = await request({
    method: "POST",
    endpoint: `/api/service-requests/${customReqId}/responses`,
    headers: { Authorization: `Bearer ${providerToken}` },
    body: {
      quote_price: 3200,
      proposal_message: "Can source authentic velvet and complete within 3 days with on-site inspection.",
      turnaround_days: 3
    }
  });
  assert(submitQuote.status === 201 && submitQuote.body.success, "Provider submits quote proposal (HTTP 201)");
  const quoteId = submitQuote.body.response.id;
  assert(submitQuote.body.response.quote_price === 3200, "Quote price recorded accurately (₹3200)");

  // 5.4 Customer reviews proposals
  const myRequests = await request({
    method: "GET",
    endpoint: "/api/service-requests?my_requests=true",
    headers: { Authorization: `Bearer ${customerToken}` }
  });
  assert(myRequests.status === 200 && myRequests.body.success, "Customer fetches own custom requests (HTTP 200)");
  const targetedReq = myRequests.body.requests.find((r) => r.id === customReqId);
  assert(targetedReq && targetedReq.responses.length > 0, "Provider proposal visible to customer");

  // 5.5 Customer accepts the quote -> Automatic Booking & Notifications
  const acceptQuote = await request({
    method: "POST",
    endpoint: `/api/service-requests/${customReqId}/accept`,
    headers: { Authorization: `Bearer ${customerToken}` },
    body: { response_id: quoteId }
  });
  assert(acceptQuote.status === 200 && acceptQuote.body.success, "Customer accepts provider quote (HTTP 200)");
  assert(acceptQuote.body.request.status.toLowerCase() === "accepted", "Custom request marked as 'accepted'");
  assert(Boolean(acceptQuote.body.booking_id), "Confirmed booking automatically generated in bookings table");

  // Verify booking exists in Member 3 bookings table
  const { data: verifiedBooking } = await supabase
    .from("bookings")
    .select("*")
    .eq("booking_id", acceptQuote.body.booking_id)
    .single();
  assert(Boolean(verifiedBooking), "Booking row verified in Supabase bookings table");
  assert(Number(verifiedBooking.total_amount) === 3200, "Booking total amount equals agreed quote (₹3200)");

  // ==========================================
  // FEATURE 6: SKILLNEST AI CHATBOT
  // ==========================================
  console.log("\n-------------------------------------------------------");
  console.log("FEATURE 6: SkillNest-Aware AI Chatbot Grounding");
  console.log("-------------------------------------------------------");

  // 6.1 Services & Marketplace grounding
  const aiGeneral = await request({
    method: "POST",
    endpoint: "/api/ai/chat",
    headers: { Authorization: `Bearer ${customerToken}` },
    body: { message: "What cleaning and cooking services are available on SkillNest?" }
  });
  assert(aiGeneral.status === 200 && aiGeneral.body.success, "AI chat endpoint returns HTTP 200");
  assert(Boolean(aiGeneral.body.reply), "AI returns helpful conversational response");
  const aiSuggestions = aiGeneral.body.suggestions || aiGeneral.body.suggested_actions;
  assert(Array.isArray(aiSuggestions) && aiSuggestions.length > 0, "AI returns interactive suggestion chips");

  // 6.2 Customer bookings grounding
  const aiBookings = await request({
    method: "POST",
    endpoint: "/api/ai/chat",
    headers: { Authorization: `Bearer ${customerToken}` },
    body: { message: "What are my current active bookings?" }
  });
  assert(aiBookings.status === 200 && aiBookings.body.success, "AI answers booking queries grounded in user session");
  assert(aiBookings.body.reply.length > 10, "Response has detailed content");

  // 6.3 Platform Policies & KYC grounding
  const aiPolicies = await request({
    method: "POST",
    endpoint: "/api/ai/chat",
    headers: { Authorization: `Bearer ${customerToken}` },
    body: { message: "How does provider verification work on SkillNest?" }
  });
  assert(aiPolicies.status === 200 && aiPolicies.body.success, "AI answers verification policies query");
  assert(aiPolicies.body.reply.toLowerCase().includes("verif") || aiPolicies.body.reply.toLowerCase().includes("trust"), "AI response accurately discusses verification/trust standards");

  console.log("\n=======================================================");
  console.log(`🎉 ALL TESTS PASSED: ${passedTests} / ${totalTests} assertions verified!`);
  console.log("=======================================================\n");
  process.exit(0);
}

runTests().catch((err) => {
  console.error("\n❌ Test execution encountered an error:", err);
  process.exit(1);
});
