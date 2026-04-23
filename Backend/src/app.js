/**
 * One Nation One Data - Express Application
 * Main app configuration and middleware setup
 */

const express = require("express");
const path = require("path");
const cors = require("cors");
const apiRoutes = require("./routes/apiRoutes");

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: true, credentials: true }));

// Static files
app.use(express.static(path.join(__dirname, "../public")));

// Routes
app.use("/api", apiRoutes);

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "EduSync API",
    version: "2.0.0",
  });
});

// Welcome endpoint
app.get("/", (req, res) => {
  res.json({
    message: "EduSync API",
    version: "2.0.0",
    description: "Role-based universal data and template management system",
    endpoints: {
      auth: "POST /api/login",
      upload: "POST /api/upload",
      mapFields: "POST /api/map-fields",
      templates: "GET/POST/PUT/DELETE /api/templates",
      fields: "GET/POST/DELETE /api/fields",
      report: "POST /api/generate-report",
    },
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
    path: req.path,
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err);

  // Multer file upload errors
  if (err.code === "LIMIT_FILE_SIZE" || err.code === "FILE_TOO_LARGE") {
    return res.status(413).json({
      success: false,
      error: "File too large. Maximum size: 10MB",
    });
  }

  if (err.message && err.message.includes("Only PDF files")) {
    return res.status(400).json({
      success: false,
      error: err.message,
    });
  }

  // Generic error
  res.status(500).json({
    success: false,
    error: err.message || "Internal server error",
  });
});

module.exports = app;
