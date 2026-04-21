/**
 * One Nation One Data - Express Application
 * Main app configuration and middleware setup
 */

const express = require("express");
const path = require("path");
const formRoutes = require("./routes/formRoutes");

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, "../public")));

// Routes
app.use("/api/forms", formRoutes);

// Welcome endpoint
app.get("/", (req, res) => {
  res.json({
    message: "One Nation One Data API",
    version: "1.0.0",
    description: "Auto-fill institutional forms using learned Q-A mappings",
    endpoints: {
      health: "GET /api/forms/health",
      uploadCSV: "POST /api/forms/upload-csv (multipart/form-data with 'file')",
      processPDF: "POST /api/forms/process-pdf (multipart/form-data with 'file')",
      learn: "POST /api/forms/learn",
      generateFromPdf:
        "POST /api/forms/generate-from-pdf (multipart/form-data with 'file' and 'data')",
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
  if (err.code === "FILE_TOO_LARGE") {
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
