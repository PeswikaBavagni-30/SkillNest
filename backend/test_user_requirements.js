const supabase = require("./src/config/supabase");
const dualRoleService = require("./src/modules/auth/dualRole.service");

async function runVerification() {
  console.log("=== SkillNest Verification Suite ===");

  // 1. Check database counts
  const { data: services, count: servCount } = await supabase.from("services").select("*", { count: "exact" });
  const { data: bookings, count: bookCount } = await supabase.from("bookings").select("*", { count: "exact" });
  const { data: payments, count: payCount } = await supabase.from("payments").select("*", { count: "exact" });

  console.log(`[Database State] Services: ${services?.length || 0}, Bookings: ${bookings?.length || 0}, Payments: ${payments?.length || 0}`);
  if ((services?.length || 0) !== 0 || (bookings?.length || 0) !== 0 || (payments?.length || 0) !== 0) {
    console.error("FAIL: Expected clean slate with 0 services, 0 bookings, 0 payments.");
  } else {
    console.log("PASS: Clean slate confirmed! User can now add their own services & bookings.");
  }

  // 2. Dual Role Test: Single customer registration
  const testEmail = `test_dual_${Date.now()}@example.com`;
  
  const regCustomerRes = await fetch("http://localhost:5000/api/auth/register/customer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Alice Tester",
      email: testEmail,
      password: "Password123!",
      city: "Bangalore"
    })
  });
  const regCustomerData = await regCustomerRes.json();
  console.log(`[Customer Register] Status: ${regCustomerRes.status}, can_switch_mode: ${regCustomerData.user?.can_switch_mode}`);

  if (regCustomerData.user?.can_switch_mode !== false) {
    console.error("FAIL: Pure customer should NOT have can_switch_mode = true");
  } else {
    console.log("PASS: Pure customer has can_switch_mode = false (ModeSwitcher hidden).");
  }

  // 3. Dual Role Test: Register with SAME email as Provider
  const regProviderRes = await fetch("http://localhost:5000/api/auth/register/provider", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Alice Tester",
      email: testEmail,
      password: "Password123!",
      profession: "Tailoring & Boutique",
      experience: "5 years",
      city: "Bangalore"
    })
  });
  const regProviderData = await regProviderRes.json();
  console.log(`[Same-Email Provider Register] Status: ${regProviderRes.status}, message: ${regProviderData.message}, can_switch_mode: ${regProviderData.user?.can_switch_mode}`);

  if (regProviderData.user?.can_switch_mode !== true) {
    console.error("FAIL: Dual-registered user should have can_switch_mode = true");
  } else {
    console.log("PASS: Same-email dual registration enabled can_switch_mode = true!");
  }

  // 4. Test Login for Dual User
  const loginRes = await fetch("http://localhost:5000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: testEmail,
      password: "Password123!"
    })
  });
  const loginData = await loginRes.json();
  console.log(`[Dual User Login] Status: ${loginRes.status}, can_switch_mode: ${loginData.user?.can_switch_mode}`);

  if (loginData.user?.can_switch_mode !== true) {
    console.error("FAIL: Dual user login should return can_switch_mode = true");
  } else {
    console.log("PASS: Dual user login returned can_switch_mode = true!");
  }

  // 5. Test Mode Switch Endpoint for Dual User
  const token = loginData.session?.access_token;
  const switchRes = await fetch("http://localhost:5000/api/users/switch-mode", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ mode: "provider" })
  });
  const switchData = await switchRes.json();
  console.log(`[Switch Mode Result] Status: ${switchRes.status}, active_role: ${switchData.active_role}`);

  if (switchRes.status !== 200) {
    console.error("FAIL: Mode switch failed for dual user");
  } else {
    console.log("PASS: Mode switch successfully executed for dual user!");
  }

  // 6. Test Mode Switch Rejected for Single-Role User
  const singleEmail = `single_cust_${Date.now()}@example.com`;
  const regSingleRes = await fetch("http://localhost:5000/api/auth/register/customer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Single User",
      email: singleEmail,
      password: "Password123!",
      city: "Mumbai"
    })
  });
  const regSingleData = await regSingleRes.json();
  const singleLoginRes = await fetch("http://localhost:5000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: singleEmail,
      password: "Password123!"
    })
  });
  const singleLoginData = await singleLoginRes.json();
  const singleToken = singleLoginData.session?.access_token;

  const forbiddenSwitchRes = await fetch("http://localhost:5000/api/users/switch-mode", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${singleToken}`
    },
    body: JSON.stringify({ mode: "provider" })
  });
  const forbiddenSwitchData = await forbiddenSwitchRes.json();
  console.log(`[Single User Mode Switch Prevention] Status: ${forbiddenSwitchRes.status}, message: ${forbiddenSwitchData.message}`);

  if (forbiddenSwitchRes.status === 403) {
    console.log("PASS: Single-role user is strictly forbidden from switching modes!");
  } else {
    console.error("FAIL: Expected 403 Forbidden for single-role user");
  }

  console.log("\n=== ALL VERIFICATION CHECKS COMPLETED ===");
  process.exit(0);
}

runVerification().catch(err => {
  console.error("Verification failed:", err);
  process.exit(1);
});
