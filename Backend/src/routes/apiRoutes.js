const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const {
	login,
	getCurrentUser,
	uploadCsv,
	mapFields,
	getMappings,
	saveMappings,
	getTemplates,
	createTemplate,
	updateTemplate,
	deleteTemplate,
	getFields,
	createField,
	deleteField,
	generateReport,
	getReports,
	getDashboard,
} = require("../controllers/apiController");
const { requireAuth, requireRole } = require("../middleware/authMiddleware");

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
		const valid = file.mimetype === "text/csv" || file.originalname.toLowerCase().endsWith(".csv");
		if (!valid) {
			return cb(new Error("Only CSV file is allowed"));
		}
		return cb(null, true);
	},
});

router.post("/login", login);
router.get("/me", requireAuth, getCurrentUser);
router.get("/dashboard", requireAuth, getDashboard);

router.post("/upload", requireAuth, csvUpload.single("file"), uploadCsv);
router.post("/map-fields", requireAuth, mapFields);
router.get("/map-fields", requireAuth, getMappings);
router.post("/save-mappings", requireAuth, saveMappings);

router.get("/templates", requireAuth, getTemplates);
router.post("/templates", requireAuth, requireRole(["admin"]), createTemplate);
router.put("/templates/:id", requireAuth, requireRole(["admin"]), updateTemplate);
router.delete("/templates/:id", requireAuth, requireRole(["admin"]), deleteTemplate);

router.get("/fields", requireAuth, getFields);
router.post("/fields", requireAuth, requireRole(["admin"]), createField);
router.delete("/fields/:id", requireAuth, requireRole(["admin"]), deleteField);

router.post("/generate-report", requireAuth, generateReport);
router.get("/reports", requireAuth, getReports);

module.exports = router;