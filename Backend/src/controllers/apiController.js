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
	getTemplateWithFields,
} = require("../db/db");

const publicReportsDir = path.join(__dirname, "../../public/reports");
const templateFilePath = path.join(__dirname, "../templates/report.ejs");

const removeFile = (filePath) => {
	if (filePath && fs.existsSync(filePath)) {
		fs.unlinkSync(filePath);
	}
};

const toId = (value) => (value ? String(value) : null);

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
		const [templateCount, fieldCount, reportCount, sessionCount] = await Promise.all([
			Template.countDocuments(),
			Field.countDocuments(),
			Report.countDocuments(req.user.role === "admin" ? {} : { userId: req.user.id }),
			UploadSession.countDocuments(req.user.role === "admin" ? {} : { userId: req.user.id }),
		]);

		return res.json({
			stats: { templateCount, fieldCount, reportCount, sessionCount },
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

		const { headers, rows } = await parseUploadCsv(req.file.path);
		if (!rows.length) {
			return res.status(400).json({ error: "CSV file does not contain any rows" });
		}

		const session = await UploadSession.create({
			userId: req.user.id,
			filename: req.file.originalname,
			headers,
			rows,
			status: "uploaded",
		});

		return res.json({
			sessionId: toId(session._id),
			filename: session.filename,
			headers: session.headers,
			rows: session.rows,
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
		const options = fields.map((field) => ({
			...field,
			norm_question: normalize(field.label || field.key),
		}));
		const match = similarityMatch(normalize(header), options);
		return {
			csvField: header,
			systemField: match?.record?.key || "",
			source: match ? "suggested" : "manual",
			confidence: match?.score || 0,
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
			const suggestedMappings = await suggestMappings(session.headers, template.fields);
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
			const rowValue = csvFieldName ? row[csvFieldName] : undefined;
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

module.exports = {
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
};