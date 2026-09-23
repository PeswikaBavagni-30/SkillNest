const fs = require("fs");
const path = require("path");

const DATA_FILE = path.resolve(__dirname, "../../../data/dual_role_accounts.json");

function readData() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify({}));
      return {};
    }
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  } catch {
    return {};
  }
}

function writeData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Failed to write dual_role_accounts.json:", err);
  }
}

class DualRoleService {
  /**
   * Check if an email has registered as both Customer and Provider
   * @param {string} email
   * @returns {boolean}
   */
  isDualRole(email) {
    if (!email) return false;
    const data = readData();
    const normalized = email.trim().toLowerCase();
    const entry = data[normalized];
    return Boolean(entry && entry.has_customer && entry.has_provider);
  }

  /**
   * Record customer registration for an email
   * @param {string} email
   */
  recordCustomerRegistration(email) {
    if (!email) return;
    const data = readData();
    const normalized = email.trim().toLowerCase();
    if (!data[normalized]) {
      data[normalized] = {
        email: normalized,
        has_customer: true,
        has_provider: false,
        created_at: new Date().toISOString()
      };
    } else {
      data[normalized].has_customer = true;
      data[normalized].updated_at = new Date().toISOString();
    }
    writeData(data);
  }

  /**
   * Record provider registration for an email
   * @param {string} email
   */
  recordProviderRegistration(email) {
    if (!email) return;
    const data = readData();
    const normalized = email.trim().toLowerCase();
    if (!data[normalized]) {
      data[normalized] = {
        email: normalized,
        has_customer: false,
        has_provider: true,
        created_at: new Date().toISOString()
      };
    } else {
      data[normalized].has_provider = true;
      data[normalized].updated_at = new Date().toISOString();
    }
    writeData(data);
  }

  /**
   * Get registration status for email
   * @param {string} email
   */
  getAccountStatus(email) {
    if (!email) return { has_customer: false, has_provider: false, is_dual_role: false };
    const data = readData();
    const normalized = email.trim().toLowerCase();
    const entry = data[normalized] || { has_customer: false, has_provider: false };
    return {
      has_customer: Boolean(entry.has_customer),
      has_provider: Boolean(entry.has_provider),
      is_dual_role: Boolean(entry.has_customer && entry.has_provider)
    };
  }
}

module.exports = new DualRoleService();
