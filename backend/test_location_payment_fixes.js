/**
 * Verification Test Suite: Location Matching, Booking Confirmation, Payment & Notifications
 */
const { execSync } = require("child_process");

async function runTests() {
  console.log("==================================================");
  console.log("RUNNING LOCATION, PAYMENT & NOTIFICATION TEST SUITE");
  console.log("==================================================");

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`  ✓ PASS [${total}]: ${message}`);
      passed++;
    } else {
      console.error(`  ✕ FAIL [${total}]: ${message}`);
    }
  }

  // Test 1: Location Service matching
  const locationService = require("./src/modules/location/location.service");
  
  // Test with peswika (tailoring in Bengaluru)
  const peswikaId = "c91f39a9-4fd2-4a83-9e14-2c65daf5d1e9";
  
  const servesBengaluru = await locationService.isProviderServingLocation(peswikaId, {
    city: "Bengaluru",
    address: "Bengaluru, India",
    serviceLocation: "Bengaluru"
  });
  assert(servesBengaluru === true, "peswika serves Bengaluru when address is 'Bengaluru, India'");

  const servesBangaloreAlias = await locationService.isProviderServingLocation(peswikaId, {
    city: "Bangalore",
    address: "Indiranagar, Bangalore",
    serviceLocation: "Bengaluru"
  });
  assert(servesBangaloreAlias === true, "peswika serves Bangalore (alias matching Bengaluru)");

  const servesHyderabad = await locationService.isProviderServingLocation(peswikaId, {
    city: "Hyderabad",
    address: "Banjara Hills, Hyderabad",
    serviceLocation: "Bengaluru"
  });
  assert(servesHyderabad === false, "peswika does NOT serve Hyderabad");

  // Test 2: City filtering on services
  const resServices = await fetch("http://localhost:5000/api/services?city=Bengaluru");
  const dataServices = await resServices.json();
  assert(dataServices.success === true, "GET /api/services?city=Bengaluru succeeds");
  const tailoringFound = dataServices.services?.some(s => s.service_name.toLowerCase().includes("tailoring"));
  assert(tailoringFound === true, "Tailoring service included when filtering by city=Bengaluru");

  // Test 3: Notification Service Customer Confirmation
  const notificationService = require("./src/modules/payments-notifications/notification.service");
  const testCustomerUuid = "9bc724c4-76d5-437a-b813-0ea0819f25f9"; // peswika bavagni (customer)
  
  const bookingNotif = await notificationService.notifyBookingCreated({
    customerId: testCustomerUuid,
    serviceName: "tailoring",
    bookingDate: "2026-09-22",
    bookingTime: "10:00 AM",
    totalAmount: 300
  });
  assert(bookingNotif !== null && bookingNotif.notification_id, "Customer booking confirmation notification created in DB");

  // Test 4: Payment simulation & notification
  const paymentService = require("./src/modules/payments-notifications/payment.service");
  assert(paymentService.isValidStatus("SUCCESS"), "Payment status SUCCESS is valid");
  assert(paymentService.isValidStatus("PENDING"), "Payment status PENDING is valid");

  console.log("==================================================");
  console.log(`TEST SUMMARY: ${passed}/${total} assertions passed`);
  console.log("==================================================");

  if (passed === total) {
    console.log("ALL LOCATION, PAYMENT & NOTIFICATION TESTS PASSED!");
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
