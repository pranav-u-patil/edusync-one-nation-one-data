const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { normalize } = require("../utils/normalize");
const { similarityMatch } = require("../utils/similarityMatch");
const { parseUploadCsv } = require("../utils/parseUploadCsv");
const { renderHtml, generatePdfFromHtml, ensureDirectory } = require("../utils/reportRenderer");
const {
	User,
	Field,
	Template,
	TemplateField,
	Mapping,
	UploadSession,
	Report,
	YearSummary,
	MetadataSuggestion,
	getTemplateWithFields,
} = require("../db/db");
const fieldSynonyms = require("../utils/fieldSynonyms");
const { normalizeCsvFieldToKey, getIgnoredExtraFields, getUnmappedExtraFields } = require("../utils/extraFieldHandler");

const publicReportsDir = path.join(__dirname, "../../public/reports");
const templateFilePath = path.join(__dirname, "../templates/report.ejs");

const removeFile = (filePath) => {
	if (filePath && fs.existsSync(filePath)) {
		fs.unlinkSync(filePath);
	}
};

const toId = (value) => (value ? String(value) : null);

const getUploadFormat = (session) => {
	const headers = session?.headers || [];
	const normalizedHeaders = headers.map((header) => String(header).trim().toLowerCase());
	return (
		(session?.format === "vertical" ||
			(headers.length === 2 &&
				((normalizedHeaders.some((header) => header.includes("field")) && normalizedHeaders.some((header) => header.includes("value"))) ||
					(normalizedHeaders.some((header) => header.includes("question")) && normalizedHeaders.some((header) => header.includes("answer"))))))
			? "vertical"
			: "wide"
	);
};

const getVerticalFieldHeaders = (session) => {
	const headers = session?.headers || [];
	if (headers.length < 2) {
		return { fieldHeader: null, valueHeader: null };
	}

	return { fieldHeader: headers[0], valueHeader: headers[1] };
};

const getVerticalFieldEntries = (session) => {
	if (getUploadFormat(session) !== "vertical") {
		return [];
	}

	const { fieldHeader, valueHeader } = getVerticalFieldHeaders(session);
	if (!fieldHeader || !valueHeader) {
		return [];
	}

	return (session.rows || [])
		.map((row) => ({
			csvField: String(row[fieldHeader] ?? "").trim(),
			csvValue: row[valueHeader],
		}))
		.filter((entry) => entry.csvField);
};

const resolveValueFromSessionRow = (session, row, csvFieldName) => {
	if (!csvFieldName) {
		return undefined;
	}

	if (getUploadFormat(session) !== "vertical") {
		return row?.[csvFieldName];
	}

	const { fieldHeader, valueHeader } = getVerticalFieldHeaders(session);
	if (!fieldHeader || !valueHeader) {
		return undefined;
	}

	const match = (session.rows || []).find((entry) => String(entry[fieldHeader] ?? "").trim() === String(csvFieldName).trim());
	return match ? match[valueHeader] : undefined;
};

const createToken = (user) => {
	return jwt.sign(
		{ id: toId(user._id), name: user.name, email: user.email, role: user.role },
		process.env.JWT_SECRET || "edusync-secret",
		{ expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
	);
};

const login = async (req, res) => {
	try {
		const { email, password } = req.body;
		if (!email || !password) {
			return res.status(400).json({ error: "email and password are required" });
		}

		const user = await User.findOne({ email: String(email).toLowerCase().trim() });
		if (!user) {
			return res.status(401).json({ error: "Invalid credentials" });
		}

		const matches = await bcrypt.compare(password, user.password);
		if (!matches) {
			return res.status(401).json({ error: "Invalid credentials" });
		}

		return res.json({
			token: createToken(user),
			user: { id: toId(user._id), name: user.name, email: user.email, role: user.role },
		});
	} catch (error) {
		return res.status(500).json({ error: error.message });
	}
};

const getCurrentUser = async (req, res) => {
	return res.json({ user: req.user });
};

const getDashboard = async (req, res) => {
	try {
		const { academicYear } = req.query;
		const userId = req.user.id;
		const role = req.user.role;

		const [templateCount, fieldCount, reportCount, sessionCount] = await Promise.all([
			Template.countDocuments(),
			Field.countDocuments(),
			Report.countDocuments(role === "admin" ? {} : { userId }),
			UploadSession.countDocuments(role === "admin" ? {} : { userId }),
		]);

		// Fetch year summary if academicYear specified
		let yearSummary = null;
		if (academicYear) {
			yearSummary = await YearSummary.findOne({ userId, academicYear }).lean();

			if (!yearSummary) {
				// Calculate from reports if not cached
				const reports = await Report.find({
					userId,
					academicYear,
				}).lean();

				const naacReports = reports.filter((r) => r.templateName === "NAAC");
				const ugcReports = reports.filter((r) => r.templateName === "UGC");
				const nbaReports = reports.filter((r) => r.templateName === "NBA");

				yearSummary = {
					userId,
					academicYear,
					naac: {
						totalReports: naacReports.length,
						completedReports: naacReports.filter((r) => r.reportStatus === "submitted" || r.reportStatus === "archived").length,
						completionPercentage: naacReports.length > 0 ? Math.round((naacReports.filter((r) => r.reportStatus !== "draft").length / naacReports.length) * 100) : 0,
						reportStatus: naacReports.length > 0 ? naacReports[0].reportStatus : "draft",
					},
					ugc: {
						totalReports: ugcReports.length,
						completedReports: ugcReports.filter((r) => r.reportStatus === "submitted" || r.reportStatus === "archived").length,
						completionPercentage: ugcReports.length > 0 ? Math.round((ugcReports.filter((r) => r.reportStatus !== "draft").length / ugcReports.length) * 100) : 0,
						reportStatus: ugcReports.length > 0 ? ugcReports[0].reportStatus : "draft",
					},
					nba: {
						totalReports: nbaReports.length,
						completedReports: nbaReports.filter((r) => r.reportStatus === "submitted" || r.reportStatus === "archived").length,
						completionPercentage: nbaReports.length > 0 ? Math.round((nbaReports.filter((r) => r.reportStatus !== "draft").length / nbaReports.length) * 100) : 0,
						reportStatus: nbaReports.length > 0 ? nbaReports[0].reportStatus : "draft",
					},
				};
			}
		}

		return res.json({
			stats: { templateCount, fieldCount, reportCount, sessionCount },
			yearSummary,
			defaults: {
				adminLogin: { email: "admin@edusync.local", password: "Admin@123" },
				userLogin: { email: "user@edusync.local", password: "User@123" },
			},
		});
	} catch (error) {
		return res.status(500).json({ error: error.message });
	}
};

const uploadCsv = async (req, res) => {
	const uploadedPath = req.file?.path;

	try {
		if (!req.file) {
			return res.status(400).json({ error: "CSV file is required" });
		}

		const { academicYear } = req.body;
		const { headers, rows, format } = await parseUploadCsv(req.file.path);
		if (!rows.length) {
			return res.status(400).json({ error: "CSV file does not contain any rows" });
		}

		const session = await UploadSession.create({
			userId: req.user.id,
			filename: req.file.originalname,
			headers,
			rows,
			status: "uploaded",
			academicYear: academicYear || null,
			format: format || "wide",
			extraFieldActions: [],
		});

		return res.json({
			sessionId: toId(session._id),
			filename: session.filename,
			headers: session.headers,
			rows: session.rows,
			academicYear: session.academicYear,
			format: session.format,
			message: "CSV uploaded and parsed successfully",
		});
	} catch (error) {
		return res.status(500).json({ error: error.message });
	} finally {
		removeFile(uploadedPath);
	}
};

const getTemplates = async (req, res) => {
	try {
		const templates = await Template.find().sort({ createdAt: 1 }).lean();
		const accessibleTemplates = [];

		for (const template of templates) {
			if (req.user?.role === "admin" || !template.allowedRoles?.length || template.allowedRoles.includes(req.user.role)) {
				accessibleTemplates.push(await getTemplateWithFields(template._id));
			}
		}

		return res.json({ templates: accessibleTemplates });
	} catch (error) {
		return res.status(500).json({ error: error.message });
	}
};

const createTemplate = async (req, res) => {
	try {
		const { name, key, description, allowedRoles = ["user", "admin"], fieldIds = [] } = req.body;
		if (!name || !key) {
			return res.status(400).json({ error: "name and key are required" });
		}

		const template = await Template.create({ name, key, description, allowedRoles });
		if (Array.isArray(fieldIds) && fieldIds.length > 0) {
			for (let index = 0; index < fieldIds.length; index += 1) {
				await TemplateField.create({ templateId: template._id, fieldId: fieldIds[index], sortOrder: index + 1 });
			}
		}

		return res.status(201).json({ template: await getTemplateWithFields(template._id) });
	} catch (error) {
		return res.status(500).json({ error: error.message });
	}
};

const updateTemplate = async (req, res) => {
	try {
		const { id } = req.params;
		const { name, key, description, allowedRoles = [], fieldIds = [] } = req.body;
		const template = await Template.findByIdAndUpdate(id, { name, key, description, allowedRoles }, { new: true });
		if (!template) {
			return res.status(404).json({ error: "Template not found" });
		}

		await TemplateField.deleteMany({ templateId: id });
		for (let index = 0; index < fieldIds.length; index += 1) {
			await TemplateField.create({ templateId: id, fieldId: fieldIds[index], sortOrder: index + 1 });
		}

		return res.json({ template: await getTemplateWithFields(id) });
	} catch (error) {
		return res.status(500).json({ error: error.message });
	}
};

const deleteTemplate = async (req, res) => {
	try {
		const { id } = req.params;
		await Template.findByIdAndDelete(id);
		await TemplateField.deleteMany({ templateId: id });
		await Mapping.deleteMany({ templateId: id });
		await Report.deleteMany({ templateId: id });
		return res.json({ message: "Template deleted" });
	} catch (error) {
		return res.status(500).json({ error: error.message });
	}
};

const getFields = async (req, res) => {
	try {
		const fields = await Field.find().sort({ createdAt: 1 }).lean();
		return res.json({ fields });
	} catch (error) {
		return res.status(500).json({ error: error.message });
	}
};

const createField = async (req, res) => {
	try {
		const { label, key, type = "text", description = "" } = req.body;
		if (!label || !key) {
			return res.status(400).json({ error: "label and key are required" });
		}

		const field = await Field.create({ label, key, type, description });
		return res.status(201).json({ field });
	} catch (error) {
		return res.status(500).json({ error: error.message });
	}
};

const deleteField = async (req, res) => {
	try {
		const { id } = req.params;
		await Field.findByIdAndDelete(id);
		await TemplateField.deleteMany({ fieldId: id });
		await Mapping.deleteMany({ systemField: id });
		return res.json({ message: "Field deleted" });
	} catch (error) {
		return res.status(500).json({ error: error.message });
	}
};

const getMappings = async (req, res) => {
	try {
		const { sessionId, templateId } = req.query;
		const filters = {};
		if (sessionId) filters.sessionId = sessionId;
		if (templateId) filters.templateId = templateId;

		const mappings = await Mapping.find(filters).lean();
		return res.json({ mappings });
	} catch (error) {
		return res.status(500).json({ error: error.message });
	}
};

const saveMappings = async (req, res) => {
	try {
		const { sessionId, templateId, mappings = [] } = req.body;
		if (!sessionId || !templateId) {
			return res.status(400).json({ error: "sessionId and templateId are required" });
		}

		await Mapping.deleteMany({ sessionId, templateId });

		const saved = [];
		for (const mapping of mappings) {
			if (!mapping.csvField || !mapping.systemField) {
				continue;
			}
			saved.push(
				await Mapping.create({
					sessionId,
					templateId,
					csvField: mapping.csvField,
					systemField: mapping.systemField,
					source: mapping.source || "manual",
					confidence: mapping.confidence ?? 1,
				})
			);
		}

		await UploadSession.findByIdAndUpdate(sessionId, { templateId, status: "mapped" });
		return res.json({ message: "Mappings saved", mappings: saved });
	} catch (error) {
		return res.status(500).json({ error: error.message });
	}
};

const suggestMappings = async (headers, fields) => {
	return headers.map((header) => {
		const normalizedHeader = normalize(header);
		let match = null;
		let confidence = 0;
		let source = "manual";

		// Step 1: Check fieldSynonyms dictionary (highest confidence = 0.99)
		for (const field of fields) {
			const synonyms = fieldSynonyms[field.key] || [];
			const isSynonym = synonyms.some((syn) => normalize(syn) === normalizedHeader);

			if (isSynonym) {
				match = field;
				confidence = 0.99; // High confidence for synonym match
				source = "suggested";
				break;
			}
		}

		// Step 2: If no synonym match, use similarity matching (fallback)
		if (!match) {
			const options = fields.map((field) => ({
				...field,
				norm_question: normalize(field.label || field.key),
			}));
			const similarityResult = similarityMatch(normalizedHeader, options);

			if (similarityResult) {
				match = similarityResult.record;
				confidence = similarityResult.score;
				source = "suggested";
			}
		}

		return {
			csvField: header,
			systemField: match?.key || "",
			source,
			confidence,
		};
	});
};

const mapFields = async (req, res) => {
	try {
		const { sessionId, templateId, mappings } = req.body;
		if (!sessionId || !templateId) {
			return res.status(400).json({ error: "sessionId and templateId are required" });
		}

		const session = await UploadSession.findById(sessionId).lean();
		if (!session) {
			return res.status(404).json({ error: "Upload session not found" });
		}

		const template = await getTemplateWithFields(templateId);
		if (!template) {
			return res.status(404).json({ error: "Template not found" });
		}

		const uploadFormat = getUploadFormat(session);
		const sourceFields = uploadFormat === "vertical" ? getVerticalFieldEntries(session).map((entry) => entry.csvField) : session.headers;

		if (Array.isArray(mappings) && mappings.length > 0) {
			await Mapping.deleteMany({ sessionId, templateId });
			for (const mapping of mappings) {
				if (!mapping.csvField || !mapping.systemField) {
					continue;
				}
				await Mapping.create({
					sessionId,
					templateId,
					csvField: mapping.csvField,
					systemField: mapping.systemField,
					source: mapping.source || "manual",
					confidence: mapping.confidence ?? 1,
				});
			}
		} else {
			// Mapping happens here: when the user does not provide a mapping, use similarity suggestions.
			const suggestedMappings = await suggestMappings(sourceFields, template.fields);
			await Mapping.deleteMany({ sessionId, templateId });
			for (const mapping of suggestedMappings) {
				if (!mapping.systemField) {
					continue;
				}
				await Mapping.create({
					sessionId,
					templateId,
					csvField: mapping.csvField,
					systemField: mapping.systemField,
					source: mapping.source,
					confidence: mapping.confidence,
				});
			}
		}

		await UploadSession.findByIdAndUpdate(sessionId, { templateId, status: "mapped" });
		const savedMappings = await Mapping.find({ sessionId, templateId }).lean();
		return res.json({ mappings: savedMappings });
	} catch (error) {
		return res.status(500).json({ error: error.message });
	}
};

const getUploadSession = async (sessionId) => {
	return UploadSession.findById(sessionId).lean();
};

const generateReport = async (req, res) => {
	try {
		const { sessionId, templateId, rowIndex = 0, format = "html", mappings: submittedMappings = [], overrides = {} } = req.body;
		if (!sessionId || !templateId) {
			return res.status(400).json({ error: "sessionId and templateId are required" });
		}

		const session = await getUploadSession(sessionId);
		if (!session) {
			return res.status(404).json({ error: "Upload session not found" });
		}

		const template = await getTemplateWithFields(templateId);
		if (!template) {
			return res.status(404).json({ error: "Template not found" });
		}

		const row = session.rows[rowIndex] || session.rows[0] || {};
		const savedMappings = submittedMappings.length
			? submittedMappings
			: await Mapping.find({ sessionId, templateId }).lean();

		const mappingLookup = new Map();
		for (const mapping of savedMappings) {
			mappingLookup.set(String(mapping.systemField), mapping.csvField);
		}

		const fieldValues = {};
		const missingFields = [];

		for (const field of template.fields) {
			const csvFieldName = mappingLookup.get(String(field.key)) || mappingLookup.get(String(field.id)) || "";
			const rowValue = csvFieldName ? resolveValueFromSessionRow(session, row, csvFieldName) : undefined;
			const fallback = row[field.key] ?? row[field.label] ?? "";
			const resolvedValue = overrides[field.key] ?? rowValue ?? fallback;
			fieldValues[field.key] = resolvedValue ?? "";
			if (!resolvedValue) {
				missingFields.push(field.label);
			}
		}

		ensureDirectory(publicReportsDir);
		const html = await renderHtml(templateFilePath, {
			template,
			fields: template.fields,
			data: fieldValues,
			missingFields,
			user: req.user,
			generatedAt: new Date().toLocaleString(),
		});

		let htmlPath = "";
		let pdfPath = "";
		const baseName = `${template.key}-${Date.now()}`;

		if (format === "pdf") {
			pdfPath = path.join(publicReportsDir, `${baseName}.pdf`);
			await generatePdfFromHtml(html, pdfPath);
		} else {
			htmlPath = path.join(publicReportsDir, `${baseName}.html`);
			fs.writeFileSync(htmlPath, html, "utf8");
		}

		const report = await Report.create({
			userId: req.user.id,
			templateId,
			sessionId,
			templateName: template.name,
			format,
			data: fieldValues,
			htmlPath,
			pdfPath,
			academicYear: session.academicYear || null,
			reportStatus: "draft",
		});

		await UploadSession.findByIdAndUpdate(sessionId, { status: "reported" });

		return res.json({
			report: {
				id: toId(report._id),
				templateName: report.templateName,
				format: report.format,
				data: report.data,
				htmlPath: report.htmlPath,
				pdfPath: report.pdfPath,
				academicYear: report.academicYear,
				reportStatus: report.reportStatus,
			},
			html,
			downloadUrl: pdfPath ? `/reports/${path.basename(pdfPath)}` : `/reports/${path.basename(htmlPath)}`,
			missingFields,
		});
	} catch (error) {
		return res.status(500).json({ error: error.message });
	}
};

const getReports = async (req, res) => {
	try {
		const filter = req.user.role === "admin" ? {} : { userId: req.user.id };
		const reports = await Report.find(filter).sort({ createdAt: -1 }).lean();
		return res.json({ reports });
	} catch (error) {
		return res.status(500).json({ error: error.message });
	}
};

const handleExtraFieldAction = async (req, res) => {
	try {
		const { sessionId, templateId, csvField, action, note = "" } = req.body;

		if (!sessionId || !templateId || !csvField || !action) {
			return res.status(400).json({ error: "sessionId, templateId, csvField, and action are required" });
		}

		const session = await UploadSession.findById(sessionId);
		if (!session) {
			return res.status(404).json({ error: "Upload session not found" });
		}

		// Remove any existing action for this field
		session.extraFieldActions = session.extraFieldActions.filter(
			(a) => !(String(a.templateId) === String(templateId) && a.csvField === csvField)
		);

		// Add new action
		session.extraFieldActions.push({
			templateId,
			csvField,
			action,
			note,
			updatedBy: req.user.id,
			updatedAt: new Date(),
		});

		await session.save();

		// If action is "suggested", create metadata suggestion
		if (action === "suggested") {
			const suggestedKey = normalizeCsvFieldToKey(csvField);
			const suggestedLabel = csvField.replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

			// Check if suggestion already exists
			const existing = await MetadataSuggestion.findOne({
				templateId,
				csvField,
				status: { $in: ["pending", "approved"] },
			});

			if (existing) {
				existing.submissionCount += 1;
				await existing.save();
			} else {
				await MetadataSuggestion.create({
					userId: req.user.id,
					sessionId,
					templateId,
					csvField,
					suggestedKey,
					suggestedLabel,
					submissionCount: 1,
					status: "pending",
				});
			}
		}

		return res.json({ message: "Extra field action recorded", session });
	} catch (error) {
		return res.status(500).json({ error: error.message });
	}
};

const getMetadataSuggestions = async (req, res) => {
	try {
		if (req.user.role !== "admin") {
			return res.status(403).json({ error: "Only admins can view metadata suggestions" });
		}

		const { status = "pending", templateId, limit = 20, offset = 0 } = req.query;
		const filter = {};

		if (status) filter.status = status;
		if (templateId) filter.templateId = templateId;

		const suggestions = await MetadataSuggestion.find(filter)
			.sort({ submissionCount: -1, createdAt: -1 })
			.limit(parseInt(limit))
			.skip(parseInt(offset))
			.populate("userId", "name email")
			.populate("templateId", "name key")
			.lean();

		const total = await MetadataSuggestion.countDocuments(filter);

		return res.json({
			suggestions,
			total,
			limit: parseInt(limit),
			offset: parseInt(offset),
		});
	} catch (error) {
		return res.status(500).json({ error: error.message });
	}
};

const approveMetadataSuggestion = async (req, res) => {
	try {
		if (req.user.role !== "admin") {
			return res.status(403).json({ error: "Only admins can approve suggestions" });
		}

		const { suggestionId, approvalAction, note = "" } = req.body;

		if (!suggestionId || !approvalAction) {
			return res.status(400).json({ error: "suggestionId and approvalAction are required" });
		}

		const suggestion = await MetadataSuggestion.findById(suggestionId);
		if (!suggestion) {
			return res.status(404).json({ error: "Suggestion not found" });
		}

		if (approvalAction === "approve") {
			// Create new field in system
			const newField = await Field.create({
				label: suggestion.suggestedLabel,
				key: suggestion.suggestedKey,
				type: "text",
				description: `Auto-approved from user suggestion (CSV field: ${suggestion.csvField})`,
			});

			// Update suggestion
			suggestion.status = "approved";
			suggestion.reviewedBy = req.user.id;
			suggestion.reviewedAt = new Date();
			suggestion.note = note;
			await suggestion.save();

			return res.json({
				message: "Suggestion approved and field created",
				field: newField,
				suggestion,
			});
		} else if (approvalAction === "reject") {
			suggestion.status = "rejected";
			suggestion.reviewedBy = req.user.id;
			suggestion.reviewedAt = new Date();
			suggestion.note = note;
			await suggestion.save();

			return res.json({
				message: "Suggestion rejected",
				suggestion,
			});
		} else {
			return res.status(400).json({ error: "approvalAction must be 'approve' or 'reject'" });
		}
	} catch (error) {
		return res.status(500).json({ error: error.message });
	}
};

const getUnmappedExtraFieldsForSession = async (req, res) => {
	try {
		const { sessionId, templateId } = req.query;

		if (!sessionId || !templateId) {
			return res.status(400).json({ error: "sessionId and templateId are required" });
		}

		const session = await UploadSession.findById(sessionId).lean();
		if (!session) {
			return res.status(404).json({ error: "Session not found" });
		}

		const template = await getTemplateWithFields(templateId);
		if (!template) {
			return res.status(404).json({ error: "Template not found" });
		}

		const savedMappings = await Mapping.find({ sessionId, templateId }).lean();
		const ignoredSet = getIgnoredExtraFields(session, templateId);
		const unmappedFields = getUnmappedExtraFields(
			session.headers,
			savedMappings,
			template.fields,
			ignoredSet
		);

		return res.json({
			unmappedFields,
			ignoredFields: Array.from(ignoredSet),
		});
	} catch (error) {
		return res.status(500).json({ error: error.message });
	}
};

const getYearComparison = async (req, res) => {
	try {
		const { year1, year2, templateId } = req.query;
		const userId = req.user.id;

		if (!year1 || !year2) {
			return res.status(400).json({ error: "year1 and year2 are required" });
		}

		const filter1 = { userId, academicYear: year1 };
		const filter2 = { userId, academicYear: year2 };

		if (templateId) {
			filter1.templateId = templateId;
			filter2.templateId = templateId;
		}

		const [reports1, reports2, numericFields] = await Promise.all([
			Report.find(filter1).sort({ createdAt: -1 }).lean(),
			Report.find(filter2).sort({ createdAt: -1 }).lean(),
			Field.find({ type: "number" }).select("key").lean(),
		]);

		const numericKeys = new Set(numericFields.map((field) => field.key));

		const parseNumericValue = (value) => {
			if (typeof value === "number") {
				return Number.isFinite(value) ? value : null;
			}

			if (value === null || value === undefined) {
				return null;
			}

			const parsed = Number.parseFloat(String(value).replace(/,/g, "").replace(/%/g, ""));
			return Number.isFinite(parsed) ? parsed : null;
		};

		// Build one metric set per year by taking the latest available value per metric key.
		const buildMetricsFromReports = (reports) => {
			const metrics = {};

			reports.forEach((report) => {
				if (!report || !report.data || typeof report.data !== "object") {
					return;
				}

				Object.entries(report.data).forEach(([key, rawValue]) => {
					if (!numericKeys.has(key)) {
						return;
					}

					if (Object.prototype.hasOwnProperty.call(metrics, key)) {
						return;
					}

					const numericValue = parseNumericValue(rawValue);
					if (numericValue !== null) {
						metrics[key] = numericValue;
					}
				});
			});

			return metrics;
		};

		const metrics1 = buildMetricsFromReports(reports1);
		const metrics2 = buildMetricsFromReports(reports2);

		// Calculate deltas
		const comparison = {};
		const allKeys = new Set([...Object.keys(metrics1), ...Object.keys(metrics2)]);

		allKeys.forEach((key) => {
			const val1 = metrics1[key] || 0;
			const val2 = metrics2[key] || 0;
			const delta = val2 - val1;
			const percentChange = val1 > 0 ? ((delta / val1) * 100).toFixed(2) : "N/A";

			comparison[key] = {
				year1: val1,
				year2: val2,
				delta,
				percentChange,
				trend: delta > 0 ? "up" : delta < 0 ? "down" : "stable",
			};
		});

		return res.json({
			year1,
			year2,
			metricsYear1: metrics1,
			metricsYear2: metrics2,
			reportsUsed: {
				year1: reports1.length,
				year2: reports2.length,
			},
			comparison,
		});
	} catch (error) {
		return res.status(500).json({ error: error.message });
	}
};

const markReportSubmitted = async (req, res) => {
	try {
		const { reportId } = req.params;

		const report = await Report.findByIdAndUpdate(
			reportId,
			{
				reportStatus: "submitted",
				submittedAt: new Date(),
			},
			{ new: true }
		).lean();

		if (!report) {
			return res.status(404).json({ error: "Report not found" });
		}

		return res.json({ message: "Report marked as submitted", report });
	} catch (error) {
		return res.status(500).json({ error: error.message });
	}
};
const getSessions = async (req, res) => {
	try {
		const role = req.user?.role;
		const filters = {};
		if (role !== 'admin') {
			filters.userId = req.user.id;
		}

		const sessions = await UploadSession.find(filters).sort({ createdAt: -1 }).limit(50).lean();
		const result = sessions.map((s) => ({
			id: String(s._id),
			filename: s.filename,
			headers: s.headers,
			academicYear: s.academicYear,
			createdAt: s.createdAt,
			userId: s.userId,
		}));

		return res.json({ sessions: result });
	} catch (error) {
		return res.status(500).json({ error: error.message });
	}
};

module.exports = {
	login,
	getCurrentUser,
	uploadCsv,
	mapFields,
	getMappings,
	getSessions,
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
	handleExtraFieldAction,
	getMetadataSuggestions,
	approveMetadataSuggestion,
	getUnmappedExtraFieldsForSession,
	getYearComparison,
	markReportSubmitted,
};