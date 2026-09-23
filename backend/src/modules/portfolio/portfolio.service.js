const fs = require("fs");
const path = require("path");

const DATA_DIR = path.resolve(__dirname, "../../../data");
const PORTFOLIO_FILE = path.join(DATA_DIR, "portfolios.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(PORTFOLIO_FILE)) {
  fs.writeFileSync(PORTFOLIO_FILE, JSON.stringify([]));
}

function readPortfolios() {
  try {
    const raw = fs.readFileSync(PORTFOLIO_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writePortfolios(data) {
  fs.writeFileSync(PORTFOLIO_FILE, JSON.stringify(data, null, 2));
}

class PortfolioService {
  /**
   * Get all portfolio items for a given provider
   * @param {string} providerId
   */
  async getByProvider(providerId) {
    const items = readPortfolios();
    const providerItems = items.filter((item) => item.provider_id === providerId);
    // Sort: primary first, then most recent
    return providerItems.sort((a, b) => {
      if (a.is_primary && !b.is_primary) return -1;
      if (!a.is_primary && b.is_primary) return 1;
      return new Date(b.created_at) - new Date(a.created_at);
    });
  }

  /**
   * Add a new portfolio item
   * @param {Object} item
   */
  async addItem({ providerId, imageUrl, caption = "", isPrimary = false }) {
    if (!providerId || !imageUrl) {
      throw new Error("Provider ID and image URL are required.");
    }

    const items = readPortfolios();
    const now = new Date().toISOString();
    const shouldBePrimary = Boolean(isPrimary) || items.filter((i) => i.provider_id === providerId).length === 0;

    // If marked as primary, reset other items for this provider
    if (shouldBePrimary) {
      items.forEach((i) => {
        if (i.provider_id === providerId) {
          i.is_primary = false;
        }
      });
    }

    const newItem = {
      id: `port_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      provider_id: providerId,
      image_url: imageUrl,
      caption: (caption || "").trim(),
      is_primary: shouldBePrimary,
      created_at: now
    };

    items.unshift(newItem);
    writePortfolios(items);
    return newItem;
  }

  /**
   * Set a portfolio item as primary
   * @param {Object} params
   */
  async setPrimary({ portfolioId, providerId, isAdmin = false }) {
    const items = readPortfolios();
    const item = items.find((i) => i.id === portfolioId);

    if (!item) {
      throw new Error("Portfolio item not found.");
    }
    if (item.provider_id !== providerId && !isAdmin) {
      throw new Error("Access denied. You do not own this portfolio item.");
    }

    items.forEach((i) => {
      if (i.provider_id === item.provider_id) {
        i.is_primary = i.id === portfolioId;
      }
    });

    writePortfolios(items);
    return item;
  }

  /**
   * Delete a portfolio item
   * @param {Object} params
   */
  async deleteItem({ portfolioId, providerId, isAdmin = false }) {
    const items = readPortfolios();
    const itemIndex = items.findIndex((i) => i.id === portfolioId);

    if (itemIndex === -1) {
      throw new Error("Portfolio item not found.");
    }

    const item = items[itemIndex];
    if (item.provider_id !== providerId && !isAdmin) {
      throw new Error("Access denied. You do not own this portfolio item.");
    }

    // Try unlinking local file if it resides in /uploads/
    if (item.image_url && item.image_url.includes("/uploads/")) {
      try {
        const filename = item.image_url.split("/uploads/").pop();
        const filePath = path.resolve(__dirname, "../../../uploads", filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (err) {
        console.warn("Could not delete local file:", err.message);
      }
    }

    items.splice(itemIndex, 1);

    // If deleted item was primary, promote the next available item
    const remainingForProvider = items.filter((i) => i.provider_id === item.provider_id);
    if (item.is_primary && remainingForProvider.length > 0) {
      remainingForProvider[0].is_primary = true;
    }

    writePortfolios(items);
    return { success: true, message: "Portfolio item deleted." };
  }
}

module.exports = new PortfolioService();
