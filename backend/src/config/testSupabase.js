require("dotenv").config();

const supabase = require("./supabase");

async function testSupabase() {
    const { data, error } = await supabase
        .from("service_categories")
        .select("*")
        .limit(1);

    if (error) {
        console.error("❌ Supabase connection failed:");
        console.error(error);
        return;
    }

    console.log("✅ Supabase connection successful!");
    console.log("Data:", data);
}

testSupabase();