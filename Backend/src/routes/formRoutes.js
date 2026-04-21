const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const {
  uploadCSV,
  processPDF,
  learnMappings,
  healthCheck,
  generatePDF,
  generateFromPdf,
  getTemplateForm,
  deactivateQuestion,
} = require("../controllers/formController");

const router = express.Router();

const uploadDir = process.env.UPLOAD_DIR || "uploads";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const csvUpload = multer({
  storage,
  limits: { fileSize: Number(process.env.MAX_FILE_SIZE || 10485760) },
  fileFilter: (req, file, cb) => {
    const valid =
      file.mimetype === "text/csv" ||
      file.originalname.toLowerCase().endsWith(".csv");

    if (!valid) {
      return cb(new Error("Only CSV file is allowed"));
    }

    return cb(null, true);
  },
});

const pdfUpload = multer({
  storage,
  limits: { fileSize: Number(process.env.MAX_FILE_SIZE || 10485760) },
  fileFilter: (req, file, cb) => {
    const valid =
      file.mimetype === "application/pdf" ||
      file.originalname.toLowerCase().endsWith(".pdf");

    if (!valid) {
      return cb(new Error("Only PDF file is allowed"));
    }

    return cb(null, true);
  },
});

router.get("/health", healthCheck);
router.post("/upload-csv", csvUpload.single("file"), uploadCSV);
router.post("/process-pdf", pdfUpload.single("file"), processPDF);
router.post("/learn", learnMappings);
router.post("/deactivate", deactivateQuestion);
router.post("/generate", generatePDF);
router.post("/generate-from-pdf", pdfUpload.single("file"), generateFromPdf);
router.get("/template/:type", getTemplateForm);

module.exports = router;
