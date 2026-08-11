require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.json({
        message: "SkillNest API is running"
    });
});

app.get("/api/health", async (req, res) => {
    try {
        const supabase = require("./config/supabase");

        const { error } = await supabase
            .from("service_categories")
            .select("category_id")
            .limit(1);

        if (error) {
            return res.status(500).json({
                status: "error",
                message: "Supabase connection failed",
                error: error.message
            });
        }

        res.json({
            status: "success",
            message: "SkillNest backend and Supabase are connected"
        });

    } catch (error) {
        res.status(500).json({
            status: "error",
            message: error.message
        });
    }
});

module.exports = app;