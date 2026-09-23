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
    { expiresIn: "2h" }
  );
}

async function runTests() {
  console.log("\n========================================================");
  console.log("   SKILLNEST LOCATION & ADMIN DOCUMENT SECURITY TESTS   ");
  console.log("========================================================\n");

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
    }
  }

  // 1. Fetch real users from Supabase
  const { data: allUsers, error: uErr } = await supabase
    .from("users")
    .select("*")
    .order("created_at", { ascending: false });

  if (uErr || !allUsers || allUsers.length < 2) {
    throw new Error("Unable to fetch users from Supabase: " + (uErr?.message || "Not enough users"));
  }

  // Find or designate provider, customer, admin
  let providerUser = allUsers.find((u) => u.role?.toLowerCase() === "provider") || allUsers[0];
  let customerUser = allUsers.find((u) => u.role?.toLowerCase() === "customer" && u.user_id !== providerUser.user_id) || allUsers[1];
  let adminUser = allUsers.find((u) => u.role?.toLowerCase() === "admin");

  if (!adminUser) {
    // If no admin user yet, update an extra user or customer to admin
    const extraUser = allUsers.find((u) => u.user_id !== providerUser.user_id && u.user_id !== customerUser.user_id) || allUsers[2];
    if (extraUser) {
      await supabase.from("users").update({ role: "admin" }).eq("user_id", extraUser.user_id);
      extraUser.role = "admin";
      adminUser = extraUser;
    } else {
      // Pick a user to be admin for tests
      adminUser = { ...customerUser, role: "admin" };
    }
  }

  // Ensure roles are consistent
  await supabase.from("users").update({ role: "provider" }).eq("user_id", providerUser.user_id);
  providerUser.role = "provider";
  await supabase.from("users").update({ role: "customer" }).eq("user_id", customerUser.user_id);
  customerUser.role = "customer";
  if (adminUser.user_id !== customerUser.user_id) {
    await supabase.from("users").update({ role: "admin" }).eq("user_id", adminUser.user_id);
    adminUser.role = "admin";
  }

  const providerToken = generateToken(providerUser);
  const customerToken = generateToken(customerUser);
  const adminToken = generateToken(adminUser);

  console.log(`👤 Customer: ${customerUser.full_name} (${customerUser.email})`);
  console.log(`🛠️ Provider: ${providerUser.full_name} (${providerUser.email})`);
  console.log(`👑 Admin:    ${adminUser.full_name} (${adminUser.email})\n`);

  console.log("--- PHASE 1: USER STRUCTURED LOCATIONS ---");

  // 1. Set Provider home location to Kottayam, Kerala
  const setProvLocRes = await fetch(`${BASE_URL}/api/location/user`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${providerToken}`
    },
    body: JSON.stringify({
      city: "Kottayam",
      state: "Kerala",
      country: "India",
      pincode: "686001",
      area: "Baker Junction"
    })
  });
  const setProvLocData = await setProvLocRes.json();
  assert(setProvLocRes.ok && setProvLocData.success, "Provider sets structured home location to Kottayam, Kerala");
  assert(setProvLocData.location?.city === "Kottayam", "Provider location object city is Kottayam");

  // 2. Set Customer home location to Kottayam, Kerala
  const setCustLocRes = await fetch(`${BASE_URL}/api/location/user`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${customerToken}`
    },
    body: JSON.stringify({
      city: "Kottayam",
      state: "Kerala",
      country: "India",
      pincode: "686002",
      area: "Collectorate"
    })
  });
  const setCustLocData = await setCustLocRes.json();
  assert(setCustLocRes.ok && setCustLocData.success, "Customer sets structured location to Kottayam, Kerala");

  // 3. Fetch user location via GET /api/location/user
  const getCustLocRes = await fetch(`${BASE_URL}/api/location/user`, {
    headers: { Authorization: `Bearer ${customerToken}` }
  });
  const getCustLocData = await getCustLocRes.json();
  assert(getCustLocData.data?.city === "Kottayam", "GET /api/location/user returns saved city");

  console.log("\n--- PHASE 2: PROVIDER SERVICE AREAS ---");

  // 4. Provider adds service area: Changanassery
  const addAreaRes = await fetch(`${BASE_URL}/api/location/service-areas`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${providerToken}`
    },
    body: JSON.stringify({
      city: "Changanassery",
      state: "Kerala",
      pincode: "686101"
    })
  });
  const addAreaData = await addAreaRes.json();
  assert(addAreaRes.status === 201 && addAreaData.success, "Provider adds service area Changanassery");

  // 5. Fetch provider service areas
  const getAreasRes = await fetch(`${BASE_URL}/api/location/service-areas`, {
    headers: { Authorization: `Bearer ${providerToken}` }
  });
  const getAreasData = await getAreasRes.json();
  assert(getAreasData.areas?.some((a) => a.city === "Changanassery"), "Provider service areas list contains Changanassery");
  assert(getAreasData.summary?.display_string?.includes("Changanassery"), "Provider location summary includes service area");

  console.log("\n--- PHASE 3 & 4: LOCATION-AWARE SERVICE DISCOVERY ---");

  // Fetch category
  const catRes = await fetch(`${BASE_URL}/api/categories`);
  const catData = await catRes.json();
  const categoryId = catData.categories?.[0]?.category_id;

  // Create service by provider
  const createServiceRes = await fetch(`${BASE_URL}/api/services`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${providerToken}`
    },
    body: JSON.stringify({
      service_name: `Tailoring & Alteration ${Date.now()}`,
      category_id: categoryId,
      description: "Custom stitching and alterations in Kottayam and Changanassery",
      price: 850,
      duration_minutes: 60
    })
  });
  const createServiceData = await createServiceRes.json();
  const serviceId = createServiceData.service?.service_id;
  assert(createServiceRes.status === 201 && Boolean(serviceId), "Provider creates service with location support");

  // Test 1: Provider Kottayam + Customer search Kottayam -> Service visible
  const searchKottayamRes = await fetch(`${BASE_URL}/api/services?city=Kottayam`);
  const searchKottayamData = await searchKottayamRes.json();
  const foundInKottayam = searchKottayamData.services?.some((s) => s.service_id === serviceId);
  assert(foundInKottayam, "Test 1: Provider Kottayam + Customer searching Kottayam -> Service visible");

  // Test 1b: Search in configured service area Changanassery -> Service visible
  const searchChanganasseryRes = await fetch(`${BASE_URL}/api/services?city=Changanassery`);
  const searchChanganasseryData = await searchChanganasseryRes.json();
  const foundInChanganassery = searchChanganasseryData.services?.some((s) => s.service_id === serviceId);
  assert(foundInChanganassery, "Test 1b: Service visible when searching provider's service area (Changanassery)");

  // Test 2: Provider Kottayam + Customer search Hyderabad -> Service NOT visible
  const searchHyderabadRes = await fetch(`${BASE_URL}/api/services?city=Hyderabad`);
  const searchHyderabadData = await searchHyderabadRes.json();
  const foundInHyderabad = searchHyderabadData.services?.some((s) => s.service_id === serviceId);
  assert(!foundInHyderabad, "Test 2: Provider Kottayam + Customer searching Hyderabad -> Service NOT visible");

  // Test 3: Provider explicitly adds Hyderabad to service area -> Service visible in both
  const addHydRes = await fetch(`${BASE_URL}/api/location/service-areas`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${providerToken}`
    },
    body: JSON.stringify({
      city: "Hyderabad",
      state: "Telangana",
      pincode: "500001"
    })
  });
  const addHydData = await addHydRes.json();
  const hydAreaId = addHydData.area?.id;

  const searchHydAfterRes = await fetch(`${BASE_URL}/api/services?city=Hyderabad`);
  const searchHydAfterData = await searchHydAfterRes.json();
  const foundInHydAfter = searchHydAfterData.services?.some((s) => s.service_id === serviceId);
  assert(foundInHydAfter, "Test 3: Provider adds Hyderabad to service areas -> Service appears in Hyderabad");

  // Test 7: Provider removes Hyderabad service area -> Hyderabad search updates immediately
  if (hydAreaId) {
    const delAreaRes = await fetch(`${BASE_URL}/api/location/service-areas/${hydAreaId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${providerToken}` }
    });
    assert(delAreaRes.ok, "Test 7a: Provider removes Hyderabad from service areas");

    const searchHydAfterDelRes = await fetch(`${BASE_URL}/api/services?city=Hyderabad`);
    const searchHydAfterDelData = await searchHydAfterDelRes.json();
    const foundAfterDel = searchHydAfterDelData.services?.some((s) => s.service_id === serviceId);
    assert(!foundAfterDel, "Test 7b: Service no longer appears in Hyderabad after service area removal");
  }

  console.log("\n--- PHASE 5: LOCATION-AWARE BOOKING VALIDATION ---");

  // Test 5: Customer tries direct API booking from unsupported location (e.g. Bangalore / Hyderabad)
  const unsupportedBookingRes = await fetch(`${BASE_URL}/api/bookings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${customerToken}`
    },
    body: JSON.stringify({
      service_id: serviceId,
      booking_date: "2026-10-15",
      booking_time: "10:00 AM",
      address: "Indiranagar, Bangalore, Karnataka - 560038",
      city: "Bangalore"
    })
  });
  const unsupportedBookingData = await unsupportedBookingRes.json();
  assert(
    unsupportedBookingRes.status === 400 &&
    unsupportedBookingData.message === "This provider does not currently provide services in this location.",
    "Test 5: Direct API booking from unsupported location (Bangalore) rejected with exact message"
  );

  // Valid booking in Kottayam succeeds
  const validBookingRes = await fetch(`${BASE_URL}/api/bookings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${customerToken}`
    },
    body: JSON.stringify({
      service_id: serviceId,
      booking_date: "2026-10-15",
      booking_time: "10:00 AM",
      address: "Baker Junction, Kottayam, Kerala - 686001",
      city: "Kottayam"
    })
  });
  const validBookingData = await validBookingRes.json();
  assert(validBookingRes.status === 201 && validBookingData.success, "Booking within supported location (Kottayam) succeeds");

  console.log("\n--- PHASE 6: CUSTOM SERVICE REQUESTS WITH LOCATION ---");

  // Test 6: Custom service request with location
  const customReqRes = await fetch(`${BASE_URL}/api/service-requests`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${customerToken}`
    },
    body: JSON.stringify({
      title: "Bridal Blouse Custom Tailoring",
      category: "Tailoring",
      description: "Need hand-stitched bridal blouse alteration in 5 days",
      budget: 1500,
      deadline: "2026-10-20",
      city: "Kottayam",
      state: "Kerala",
      pincode: "686001"
    })
  });
  const customReqData = await customReqRes.json();
  const customReqId = customReqData.request?.id;
  assert(customReqRes.status === 201 && Boolean(customReqId), "Test 6a: Custom service request created with location Kottayam");

  // Provider in Kottayam queries open requests
  const provReqsRes = await fetch(`${BASE_URL}/api/service-requests`, {
    headers: { Authorization: `Bearer ${providerToken}` }
  });
  const provReqsData = await provReqsRes.json();
  const provCanSee = provReqsData.requests?.some((r) => r.id === customReqId);
  assert(provCanSee, "Test 6b: Provider serving Kottayam sees custom service request in Kottayam");

  console.log("\n--- FEATURE 2: ADMIN DOCUMENT VIEW & SECURITY TESTS ---");

  // 1. Provider starts verification session
  const startVerRes = await fetch(`${BASE_URL}/api/verification/start`, {
    method: "POST",
    headers: { Authorization: `Bearer ${providerToken}` }
  });
  const startVerData = await startVerRes.json();
  assert(startVerRes.status === 201 && startVerData.success, "Provider starts identity verification session");

  // 2. Provider uploads Government ID document (secure multipart upload)
  const testDocBuffer = Buffer.from("FAKE_MOCK_IMAGE_DATA_HEADER_BYTES_12345");
  const boundary = "----SkillNestSecTest" + Date.now();
  const bodyBuffer = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="document_type"\r\n\r\nGovernment ID\r\n` +
      `--${boundary}\r\nContent-Disposition: form-data; name="document"; filename="aadhaar_mock.png"\r\nContent-Type: image/png\r\n\r\n`
    ),
    testDocBuffer,
    Buffer.from(`\r\n--${boundary}--\r\n`)
  ]);

  const uploadDocRes = await fetch(`${BASE_URL}/api/verification/upload-document`, {
    method: "POST",
    headers: {
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
      Authorization: `Bearer ${providerToken}`
    },
    body: bodyBuffer
  });
  const uploadDocData = await uploadDocRes.json();
  const uploadedDocId = uploadDocData.document?.id;
  assert(uploadDocRes.status === 201 && Boolean(uploadedDocId), "Provider uploads Government ID document to private storage");

  // Get verification ID
  const verStatusRes = await fetch(`${BASE_URL}/api/verification/status`, {
    headers: { Authorization: `Bearer ${providerToken}` }
  });
  const verStatusData = await verStatusRes.json();
  const verificationId = verStatusData.data?.id;
  assert(Boolean(verificationId), "Verification record retrieved with ID");

  // Security Test 4: Unauthenticated user cannot access document endpoint
  const unauthDocRes = await fetch(`${BASE_URL}/api/admin/verifications/${verificationId}/document/${uploadedDocId}`);
  assert(unauthDocRes.status === 401, "Doc Sec Test 4: Unauthenticated access returns HTTP 401");

  // Security Test 2: Customer cannot access document endpoint
  const custDocRes = await fetch(`${BASE_URL}/api/admin/verifications/${verificationId}/document/${uploadedDocId}`, {
    headers: { Authorization: `Bearer ${customerToken}` }
  });
  assert(custDocRes.status === 403, "Doc Sec Test 2: Customer access to document returns HTTP 403 Forbidden");

  // Security Test 5: Direct public storage URL cannot be used (not in public /uploads)
  const publicDocRes = await fetch(`${BASE_URL}/uploads/documents/doc_${uploadedDocId}.png`);
  assert(publicDocRes.status === 404, "Doc Sec Test 5: Direct public static URL access returns HTTP 404 (private storage)");

  // Security Test 8: Invalid document ID returns 404
  const invalidDocRes = await fetch(`${BASE_URL}/api/admin/verifications/${verificationId}/document/non_existent_doc_id`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert(invalidDocRes.status === 404, "Doc Sec Test 8: Invalid document ID returns HTTP 404");

  // Security Test 1: Admin can view authorized provider document
  const adminDocRes = await fetch(`${BASE_URL}/api/admin/verifications/${verificationId}/document/${uploadedDocId}`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert(adminDocRes.status === 200, "Doc Sec Test 1: Admin accesses provider document (HTTP 200)");
  assert(adminDocRes.headers.get("content-type")?.includes("image/png"), "Admin receives image/png content stream");

  // Security Test 7: Admin document access creates audit log
  const auditLogsRes = await fetch(`${BASE_URL}/api/admin/verifications/audit-logs`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const auditLogsData = await auditLogsRes.json();
  const foundAudit = auditLogsData.logs?.some(
    (l) => l.document_id === uploadedDocId && l.action === "ADMIN_DOCUMENT_VIEWED"
  );
  assert(foundAudit, "Doc Sec Test 7: Audit log ADMIN_DOCUMENT_VIEWED recorded successfully");

  // Security Test 10: Document metadata does NOT store raw Aadhaar or sensitive text
  const docMeta = verStatusData.data?.documents?.[0];
  assert(
    docMeta && !docMeta.raw_aadhaar && !docMeta.ocr_text && !docMeta.storage_path,
    "Doc Sec Test 10: Metadata strictly excludes raw Aadhaar, OCR text, or absolute storage path"
  );

  // Admin Actions: Reject verification with reason
  const rejectRes = await fetch(`${BASE_URL}/api/admin/verifications/${verificationId}/reject`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({ reason: "Document is unclear and edges are cropped." })
  });
  const rejectData = await rejectRes.json();
  assert(rejectRes.ok && rejectData.record?.status === "FAILED", "Admin rejects verification with reason");

  // Check provider in-app notification
  const provNotifsRes = await fetch(`${BASE_URL}/api/notifications`, {
    headers: { Authorization: `Bearer ${providerToken}` }
  });
  const provNotifsData = await provNotifsRes.json();
  const hasRejectNotice = provNotifsData.notifications?.some(
    (n) => n.title?.includes("Identity") && n.message?.includes("Document is unclear")
  );
  assert(hasRejectNotice, "Provider receives notification with rejection reason");

  // Admin Actions: Approve verification
  const approveRes = await fetch(`${BASE_URL}/api/admin/verifications/${verificationId}/approve`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`
    }
  });
  const approveData = await approveRes.json();
  assert(approveRes.ok && approveData.record?.status === "VERIFIED", "Admin approves provider verification");

  // Verify provider user is_verified in Supabase
  const { data: updatedProv } = await supabase
    .from("users")
    .select("is_verified")
    .eq("user_id", providerUser.user_id)
    .single();
  assert(updatedProv?.is_verified === true, "Provider is_verified flag set to true upon approval");

  console.log("\n========================================================");
  console.log(`  SUMMARY: ${passed} / ${total} ASSERTIONS PASSED`);
  console.log("========================================================\n");

  if (passed === total) {
    console.log("🎉 ALL TESTS PASSED WITH 100% SUCCESS!\n");
    process.exit(0);
  } else {
    console.error("❌ SOME TESTS FAILED!\n");
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
