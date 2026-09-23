const supabase = require("../../config/supabase");

/**
 * SkillNest-Aware AI Assistant & RAG Engine
 * Supplies contextualized responses using live catalog data,
 * user bookings, and verified platform knowledge.
 */
class AIService {
  /**
   * Main chat query handler
   * @param {Object} params
   * @param {string} params.message - User prompt
   * @param {Array} params.history - Conversation history
   * @param {Object} [params.user] - Authenticated user context (if any)
   */
  async handleChat({ message, history = [], user = null }) {
    if (!message || !message.trim()) {
      throw new Error("Message cannot be empty.");
    }

    const query = message.trim().toLowerCase();

    // 1. Fetch live platform context
    const { data: categories } = await supabase
      .from("service_categories")
      .select("category_id, category_name, description");

    const { data: services } = await supabase
      .from("services")
      .select("service_id, service_name, description, price, duration_minutes, location, availability, provider_id, service_categories(category_name)")
      .eq("availability", true)
      .limit(20);

    // 2. Fetch user context if authenticated
    let userBookings = [];
    if (user?.id) {
      const { data: bData } = await supabase
        .from("bookings")
        .select("booking_id, booking_date, booking_time, status, total_amount, services(service_name)")
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      userBookings = bData || [];
    }

    // 3. Search for matching services
    const matchedServices = (services || []).filter((s) => {
      const sName = (s.service_name || "").toLowerCase();
      const sDesc = (s.description || "").toLowerCase();
      const cName = (s.service_categories?.category_name || "").toLowerCase();

      // Check keyword overlap
      const words = query.split(/\s+/).filter((w) => w.length > 2);
      return words.some((w) => sName.includes(w) || sDesc.includes(w) || cName.includes(w));
    });

    // 4. Intent detection and grounded response construction
    let reply = "";
    let suggestedActions = [];

    // INTENT: Service search / Find services
    if (
      query.includes("find") ||
      query.includes("need") ||
      query.includes("search") ||
      query.includes("stitch") ||
      query.includes("blouse") ||
      query.includes("tailor") ||
      query.includes("cook") ||
      query.includes("clean") ||
      query.includes("plumb") ||
      query.includes("repair") ||
      query.includes("service") && matchedServices.length > 0
    ) {
      if (matchedServices.length > 0) {
        reply = `Here are the matching services currently available on SkillNest:\n\n` +
          matchedServices.slice(0, 3).map((s, idx) => 
            `**${idx + 1}. ${s.service_name}** (${s.service_categories?.category_name || "General"})\n` +
            `• Price: ₹${s.price} | Duration: ${s.duration_minutes || 60} mins\n` +
            `• Location: ${s.location || "Bengaluru"}\n` +
            `• Description: ${s.description ? s.description.substring(0, 90) + "..." : "Professional service on SkillNest."}`
          ).join("\n\n") +
          `\n\nYou can click on any service card in your dashboard to view full provider details, portfolio, or book an appointment directly. If none of these match your exact requirements, you can also post a **Custom Service Request**!`;

        suggestedActions = ["Post a Custom Service Request", "Browse All Categories", "How do I book?"];
      } else {
        reply = `I couldn't find an exact pre-listed service for "${message}". However, you can create a **Custom Service Request**! Describe your requirement, budget, and preferred date, and verified local providers will submit custom price quotes for you.`;
        suggestedActions = ["Post a Custom Service Request", "Browse Available Categories", "Contact Support"];
      }
    }
    // INTENT: Customer ↔ Provider Mode Switching
    else if (
      query.includes("switch") ||
      query.includes("mode") ||
      query.includes("become a provider") ||
      query.includes("provider mode") ||
      query.includes("customer mode")
    ) {
      reply = `**Single Account Mode Switching on SkillNest:**\n\n` +
        `• SkillNest uses a unified account model—you don't need two separate accounts!\n` +
        `• Look at the top navigation bar for the **[ 👤 Customer Mode ▾ ]** or **[ 🛠 Provider Mode ▾ ]** switcher dropdown.\n` +
        `• Click it and select your desired mode. You will switch instantaneously without having to log out!\n` +
        `• Your login session, phone number, and verified KYC status remain shared across both modes.`;
      suggestedActions = ["How does verification work?", "How do I add a service?", "Find tailoring services"];
    }
    // INTENT: Identity / KYC Verification
    else if (
      query.includes("verify") ||
      query.includes("verification") ||
      query.includes("kyc") ||
      query.includes("aadhaar") ||
      query.includes("badge")
    ) {
      reply = `**Identity & KYC Verification for Providers:**\n\n` +
        `• SkillNest features an authorized identity verification system to build marketplace trust.\n` +
        `• In Provider Mode, click the **"Verify Identity"** button in your navigation or dashboard banner.\n` +
        `• Verification is completed through an authorized KYC provider (with DigiLocker & selfie liveness checks).\n` +
        `• SkillNest never stores sensitive government document numbers unnecessarily.\n` +
        `• Once verified, your provider profile and service listings proudly display the green **✓ Identity Verified** badge!`;
      suggestedActions = ["Switch to Provider Mode", "What are the benefits of verified status?", "How do I add portfolio items?"];
    }
    // INTENT: Bookings / Show Bookings
    else if (
      query.includes("booking") ||
      query.includes("my bookings") ||
      query.includes("status of") ||
      query.includes("cancel")
    ) {
      if (userBookings.length > 0) {
        reply = `Here are your recent SkillNest bookings:\n\n` +
          userBookings.map((b, idx) => 
            `**${idx + 1}. ${b.services?.service_name || "Service Booking"}**\n` +
            `• Date & Time: ${b.booking_date} at ${b.booking_time}\n` +
            `• Status: **${b.status?.toUpperCase()}**\n` +
            `• Total Amount: ₹${b.total_amount}`
          ).join("\n\n") +
          `\n\nYou can view full details or complete test payments in the **My Service Bookings** section of your Customer Dashboard.`;
      } else {
        reply = `**How Bookings Work on SkillNest:**\n\n` +
          `1. Browse services or search for your required task.\n` +
          `2. Click **"Book Now"**, select your preferred date, time, and address.\n` +
          `3. The provider will review and accept your booking.\n` +
          `4. Once accepted, you can pay securely using our test payment gateway.\n` +
          `5. If your booking is cancelled or declined, refunds are issued immediately!`;
      }
      suggestedActions = ["How do payments work?", "Find tailoring services", "Post a Custom Service Request"];
    }
    // INTENT: Custom Service Requests
    else if (
      query.includes("custom") ||
      query.includes("request") ||
      query.includes("quote") ||
      query.includes("bid")
    ) {
      reply = `**Custom Service Requests on SkillNest:**\n\n` +
        `• Need a tailored job (like bridal blouse stitching or custom home cooking) not listed in the catalog?\n` +
        `• Go to your Customer Dashboard and click **"Request Custom Service"**.\n` +
        `• Specify your title, category, description, budget, and required deadline.\n` +
        `• Local providers will view your request and submit custom price quotes.\n` +
        `• You review provider quotes and accept the best one—this seamlessly creates a booking in your dashboard for payment!`;
      suggestedActions = ["How do I book a service?", "Switch to Provider Mode", "Find tailoring services"];
    }
    // INTENT: Provider guidance (How to list service, description help, portfolio)
    else if (
      query.includes("add service") ||
      query.includes("create service") ||
      query.includes("portfolio") ||
      query.includes("description")
    ) {
      reply = `**Provider Tips for Success:**\n\n` +
        `1. **Add Real Work Photos**: Go to **My Services** and upload clear, authentic photos of your actual work instead of stock photos.\n` +
        `2. **Build Your Portfolio**: Add showcase images in your **Provider Portfolio** to prove your craftsmanship (tailoring stitches, cooked dishes, salon makeovers).\n` +
        `3. **Detailed Descriptions**: Specify what is included, materials required, and turnaround time.\n` +
        `4. **Get Verified**: Complete your KYC check to get the trust badge and boost client confidence.`;
      suggestedActions = ["How does verification work?", "Switch to Customer Mode", "View Provider Bookings"];
    }
    // DEFAULT: Helpful Overview
    else {
      reply = `Hello! I am **SkillNest AI**, your marketplace assistant. I can help you with:\n\n` +
        `• 🔍 **Finding Services**: Tell me what you need (e.g., "Find tailoring services" or "I need a cook")\n` +
        `• 🛠 **Custom Requests**: Need something bespoke? Learn how to post a custom request and get provider quotes\n` +
        `• 🔄 **Mode Switching**: How to toggle between Customer and Provider modes using your single account\n` +
        `• 🛡 **Identity KYC**: How provider identity verification works and builds client trust\n` +
        `• 📅 **Bookings & Payments**: Check booking statuses, payment flows, and refunds\n\n` +
        `What can I assist you with today?`;

      suggestedActions = [
        "How do I book a service?",
        "Find tailoring services",
        "How do I become a provider?",
        "How does verification work?",
        "Post a Custom Service Request"
      ];
    }

    return {
      reply,
      matched_services: matchedServices.slice(0, 3),
      suggested_actions: suggestedActions,
      suggestions: suggestedActions
    };
  }
}

module.exports = new AIService();
