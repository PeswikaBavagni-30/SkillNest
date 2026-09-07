const { createClient } = require("@supabase/supabase-js");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase credentials in environment variables (SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY)");
}

// Create a single Supabase client for interacting with Supabase Auth & Database
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
