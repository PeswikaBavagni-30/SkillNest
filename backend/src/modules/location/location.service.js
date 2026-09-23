const fs = require("fs");
const path = require("path");
const supabase = require("../../config/supabase");

const DATA_DIR = path.resolve(__dirname, "../../../data");
const USER_LOCATIONS_FILE = path.join(DATA_DIR, "user_locations.json");
const PROVIDER_AREAS_FILE = path.join(DATA_DIR, "provider_service_areas.json");

// Ensure data files exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(USER_LOCATIONS_FILE)) {
  fs.writeFileSync(USER_LOCATIONS_FILE, JSON.stringify({}));
}
if (!fs.existsSync(PROVIDER_AREAS_FILE)) {
  fs.writeFileSync(PROVIDER_AREAS_FILE, JSON.stringify([]));
}

function readUserLocations() {
  try {
    return JSON.parse(fs.readFileSync(USER_LOCATIONS_FILE, "utf-8"));
  } catch {
    return {};
  }
}

function writeUserLocations(data) {
  fs.writeFileSync(USER_LOCATIONS_FILE, JSON.stringify(data, null, 2));
}

function readProviderAreas() {
  try {
    return JSON.parse(fs.readFileSync(PROVIDER_AREAS_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function writeProviderAreas(data) {
  fs.writeFileSync(PROVIDER_AREAS_FILE, JSON.stringify(data, null, 2));
}

function normalize(str) {
  return (str || "").trim().toLowerCase();
}

const CITY_ALIASES = {
  bangalore: "bengaluru",
  bengaluru: "bengaluru",
  calicut: "kozhikode",
  kozhikode: "kozhikode",
  cochin: "kochi",
  kochi: "kochi",
  trivandrum: "thiruvananthapuram",
  thiruvananthapuram: "thiruvananthapuram",
  bombay: "mumbai",
  mumbai: "mumbai",
  madras: "chennai",
  chennai: "chennai",
  calcutta: "kolkata",
  kolkata: "kolkata",
  gurgaon: "gurugram",
  gurugram: "gurugram",
  baroda: "vadodara",
  vadodara: "vadodara",
  mysore: "mysuru",
  mysuru: "mysuru",
  mangalore: "mangaluru",
  mangaluru: "mangaluru"
};

function canonicalCity(city) {
  const norm = normalize(city);
  return CITY_ALIASES[norm] || norm;
}

function citiesMatch(cityA, cityB) {
  if (!cityA || !cityB) return false;
  const cA = canonicalCity(cityA);
  const cB = canonicalCity(cityB);
  if (cA === cB) return true;
  const nA = normalize(cityA);
  const nB = normalize(cityB);
  return nA.includes(nB) || nB.includes(nA) || cA.includes(cB) || cB.includes(cA);
}

class LocationService {
  /**
   * Get structured location for a user
   * @param {string} userId
   */
  async getUserLocation(userId) {
    if (!userId) return null;
    const locations = readUserLocations();
    if (locations[userId]) {
      return locations[userId];
    }

    // Fallback: Check if user has an address in Supabase and attempt basic parsing
    try {
      const { data: user } = await supabase
        .from("users")
        .select("address")
        .eq("user_id", userId)
        .single();

      if (user && user.address) {
        // Return fallback structured object from text address
        return {
          user_id: userId,
          city: user.address,
          state: "",
          country: "India",
          pincode: "",
          area: "",
          latitude: null,
          longitude: null,
          formatted_address: user.address
        };
      }
    } catch (e) {
      console.warn("Could not fetch user address from Supabase:", e.message);
    }

    return null;
  }

  /**
   * Set or update structured location for a user
   * @param {string} userId
   * @param {Object} locationData
   */
  async setUserLocation(userId, { city, state, country = "India", pincode = "", area = "", latitude = null, longitude = null }) {
    if (!userId) throw new Error("User ID is required.");
    if (!city || !city.trim()) throw new Error("City is required.");

    const trimmedCity = city.trim();
    const trimmedState = (state || "").trim();
    const trimmedCountry = (country || "India").trim();
    const trimmedPincode = (pincode || "").trim();
    const trimmedArea = (area || "").trim();

    // Format readable address string
    let formattedParts = [];
    if (trimmedArea) formattedParts.push(trimmedArea);
    if (trimmedCity) formattedParts.push(trimmedCity);
    if (trimmedState && trimmedPincode) {
      formattedParts.push(`${trimmedState} - ${trimmedPincode}`);
    } else if (trimmedState) {
      formattedParts.push(trimmedState);
    } else if (trimmedPincode) {
      formattedParts.push(trimmedPincode);
    }
    if (trimmedCountry) formattedParts.push(trimmedCountry);

    const formattedAddress = formattedParts.join(", ");
    const now = new Date().toISOString();

    const record = {
      user_id: userId,
      city: trimmedCity,
      state: trimmedState,
      country: trimmedCountry,
      pincode: trimmedPincode,
      area: trimmedArea,
      latitude: latitude ? Number(latitude) : null,
      longitude: longitude ? Number(longitude) : null,
      formatted_address: formattedAddress,
      updated_at: now
    };

    const locations = readUserLocations();
    locations[userId] = record;
    writeUserLocations(locations);

    // Sync to Supabase users.address for backward compatibility
    try {
      await supabase
        .from("users")
        .update({
          address: formattedAddress,
          updated_at: now
        })
        .eq("user_id", userId);
    } catch (dbErr) {
      console.error("Failed to sync address to Supabase users:", dbErr);
    }

    return record;
  }

  /**
   * Get all service areas configured by a provider
   * @param {string} providerId
   */
  async getProviderServiceAreas(providerId) {
    if (!providerId) return [];
    const allAreas = readProviderAreas();
    return allAreas.filter((a) => a.provider_id === providerId);
  }

  /**
   * Add a new service coverage area for a provider
   * @param {string} providerId
   * @param {Object} areaData
   */
  async addProviderServiceArea(providerId, { city, state, pincode, area = "" }) {
    if (!providerId) throw new Error("Provider ID is required.");
    if (!city || !city.trim()) throw new Error("City is required for service area.");

    const trimmedCity = city.trim();
    const trimmedState = (state || "").trim();
    const trimmedPincode = (pincode || "").trim();
    const trimmedArea = (area || "").trim();

    const allAreas = readProviderAreas();

    // Check for duplicate
    const exists = allAreas.some(
      (a) =>
        a.provider_id === providerId &&
        normalize(a.city) === normalize(trimmedCity) &&
        (!trimmedPincode || a.pincode === trimmedPincode)
    );

    if (exists) {
      throw new Error(`Service area '${trimmedCity}' is already configured.`);
    }

    const newArea = {
      id: `area_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      provider_id: providerId,
      city: trimmedCity,
      state: trimmedState,
      pincode: trimmedPincode,
      area: trimmedArea,
      created_at: new Date().toISOString()
    };

    allAreas.push(newArea);
    writeProviderAreas(allAreas);

    return newArea;
  }

  /**
   * Remove a service coverage area
   * @param {string} providerId
   * @param {string} areaId
   */
  async removeProviderServiceArea(providerId, areaId) {
    if (!providerId || !areaId) throw new Error("Provider ID and Area ID are required.");

    const allAreas = readProviderAreas();
    const index = allAreas.findIndex((a) => a.id === areaId && a.provider_id === providerId);

    if (index === -1) {
      throw new Error("Service area not found or you do not have permission to remove it.");
    }

    const removed = allAreas.splice(index, 1)[0];
    writeProviderAreas(allAreas);

    return removed;
  }

  /**
   * Check if a provider can serve a given customer location
   * @param {string} providerId
   * @param {Object} targetLocation
   * @param {string} [targetLocation.city]
   * @param {string} [targetLocation.state]
   * @param {string} [targetLocation.pincode]
   * @param {string} [targetLocation.address]
   * @param {string} [targetLocation.serviceLocation]
   * @returns {Promise<boolean>}
   */
  async isProviderServingLocation(providerId, { city, state, pincode, address, serviceLocation } = {}) {
    if (!providerId) return false;

    // Extract target city/pincode from arguments or address string
    let targetCity = city ? normalize(city) : "";
    let targetState = state ? normalize(state) : "";
    let targetPincode = pincode ? normalize(pincode) : "";

    if (!targetCity && address) {
      // Try to parse city and PIN from address string e.g. "Kottayam, Kerala - 686001" or "Bengaluru, India"
      const parts = address.split(/[,\-\n]/).map((p) => p.trim()).filter(Boolean);
      for (const part of parts) {
        if (/^\d{6}$/.test(part)) {
          targetPincode = part;
        } else if (part.length > 2 && !targetCity && !["india", "bharat"].includes(normalize(part))) {
          targetCity = normalize(part);
        }
      }
    }

    if (!targetCity && !targetPincode) {
      // No specific target location provided, default allow
      return true;
    }

    // 1. Direct match with serviceLocation if passed (e.g. from services.location column)
    if (serviceLocation && targetCity) {
      if (citiesMatch(serviceLocation, targetCity)) {
        return true;
      }
    }

    // 2. Check provider's primary home location
    const homeLoc = await this.getUserLocation(providerId);
    if (homeLoc) {
      const homeCity = normalize(homeLoc.city);
      const homePin = normalize(homeLoc.pincode);

      // Match city using alias awareness
      if (targetCity && citiesMatch(homeCity, targetCity)) {
        return true;
      }
      // Match pincode if provided
      if (targetPincode && homePin === targetPincode) {
        return true;
      }
    }

    // 3. Check provider's additional service areas
    const areas = await this.getProviderServiceAreas(providerId);
    for (const a of areas) {
      const areaCity = normalize(a.city);
      const areaPin = normalize(a.pincode);

      if (targetCity && citiesMatch(areaCity, targetCity)) {
        return true;
      }
      if (targetPincode && areaPin === targetPincode) {
        return true;
      }
    }

    let hasServiceLocations = false;
    // 4. Check active services for this provider in Supabase to see if any service matches target location
    try {
      const { data: provServices } = await supabase
        .from("services")
        .select("location")
        .eq("provider_id", providerId);

      if (provServices && provServices.length > 0) {
        hasServiceLocations = provServices.some((s) => s.location && s.location.trim());
        for (const s of provServices) {
          if (s.location && citiesMatch(s.location, targetCity)) {
            return true;
          }
        }
      }
    } catch (err) {
      console.warn("Could not check services for location coverage:", err.message);
    }

    let hasUserAddress = false;
    // 5. Check provider's address in users table directly
    try {
      const { data: userRecord } = await supabase
        .from("users")
        .select("address")
        .eq("user_id", providerId)
        .single();

      if (userRecord && userRecord.address) {
        hasUserAddress = Boolean(userRecord.address.trim());
        if (citiesMatch(userRecord.address, targetCity)) {
          return true;
        }
      }
    } catch (err) {}

    // 6. If provider has no locations set anywhere (no home, no areas, no service location, no address), allow by default
    const hasAnyConfiguredLocation = Boolean(
      homeLoc ||
      (areas && areas.length > 0) ||
      (serviceLocation && serviceLocation.trim()) ||
      hasServiceLocations ||
      hasUserAddress
    );

    if (!hasAnyConfiguredLocation) {
      return true;
    }

    return false;
  }

  /**
   * Helper: Get full location summary for a provider (home + service areas)
   * @param {string} providerId
   */
  async getProviderLocationSummary(providerId) {
    const home = await this.getUserLocation(providerId);
    const areas = await this.getProviderServiceAreas(providerId);

    let homeCity = home?.city || "";
    const homeState = home?.state || "";
    const areaCities = areas.map((a) => a.city).filter((c) => c && normalize(c) !== normalize(homeCity));

    // Fallback: Check service locations if home is not set
    if (!homeCity) {
      try {
        const { data: services } = await supabase
          .from("services")
          .select("location")
          .eq("provider_id", providerId);
        if (services && services.length > 0) {
          const validLocs = services.map((s) => s.location).filter(Boolean);
          if (validLocs.length > 0) {
            homeCity = validLocs[0];
          }
        }
      } catch (e) {}
    }

    let displayString = homeCity ? `${homeCity}${homeState ? `, ${homeState}` : ""}` : "Local Service Area";
    if (areaCities.length > 0) {
      displayString += ` (+${areaCities.join(", ")})`;
    }

    return {
      home,
      service_areas: areas,
      area_cities: areaCities,
      display_string: displayString
    };
  }
}

module.exports = new LocationService();
