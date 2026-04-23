const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// DB integration occurs here through Mongoose schemas/models for all core entities.

const userSchema = new mongoose.Schema(
	{
		name: { type: String, required: true, trim: true },
		email: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
		password: { type: String, required: true },
		role: { type: String, enum: ["admin", "user"], required: true },
	},
	{ timestamps: true }
);

const fieldSchema = new mongoose.Schema(
	{
		label: { type: String, required: true, trim: true },
		key: { type: String, required: true, trim: true, unique: true, index: true },
		type: { type: String, required: true, default: "text" },
		description: { type: String, default: "" },
	},
	{ timestamps: true }
);

const templateSchema = new mongoose.Schema(
	{
		name: { type: String, required: true, trim: true },
		key: { type: String, required: true, trim: true, unique: true, index: true },
		description: { type: String, default: "" },
		allowedRoles: [{ type: String, enum: ["admin", "user"] }],
	},
	{ timestamps: true }
);

const templateFieldSchema = new mongoose.Schema(
	{
		templateId: { type: mongoose.Schema.Types.ObjectId, ref: "Template", required: true, index: true },
		fieldId: { type: mongoose.Schema.Types.ObjectId, ref: "Field", required: true, index: true },
		sortOrder: { type: Number, default: 0 },
	},
	{ timestamps: true }
);

const mappingSchema = new mongoose.Schema(
	{
		sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "UploadSession", required: true, index: true },
		templateId: { type: mongoose.Schema.Types.ObjectId, ref: "Template", required: true, index: true },
		csvField: { type: String, required: true },
		systemField: { type: String, required: true },
		source: { type: String, enum: ["manual", "suggested"], default: "manual" },
		confidence: { type: Number, default: 1 },
	},
	{ timestamps: true }
);

const uploadSessionSchema = new mongoose.Schema(
	{
		userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
		filename: { type: String, required: true },
		headers: [{ type: String }],
		rows: [{ type: mongoose.Schema.Types.Mixed }],
		status: { type: String, enum: ["uploaded", "mapped", "reported"], default: "uploaded" },
		templateId: { type: mongoose.Schema.Types.ObjectId, ref: "Template", default: null },
	},
	{ timestamps: true }
);

const reportSchema = new mongoose.Schema(
	{
		userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
		templateId: { type: mongoose.Schema.Types.ObjectId, ref: "Template", required: true, index: true },
		sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "UploadSession", required: true, index: true },
		templateName: { type: String, required: true },
		format: { type: String, enum: ["html", "pdf"], default: "html" },
		data: { type: mongoose.Schema.Types.Mixed, required: true },
		htmlPath: { type: String, default: "" },
		pdfPath: { type: String, default: "" },
	},
	{ timestamps: true }
);

const User = mongoose.models.User || mongoose.model("User", userSchema);
const Field = mongoose.models.Field || mongoose.model("Field", fieldSchema);
const Template = mongoose.models.Template || mongoose.model("Template", templateSchema);
const TemplateField = mongoose.models.TemplateField || mongoose.model("TemplateField", templateFieldSchema);
const Mapping = mongoose.models.Mapping || mongoose.model("Mapping", mappingSchema);
const UploadSession = mongoose.models.UploadSession || mongoose.model("UploadSession", uploadSessionSchema);
const Report = mongoose.models.Report || mongoose.model("Report", reportSchema);

const defaultFieldData = [
	{ label: "Institution Name", key: "institution_name", type: "text", description: "Official institution name" },
	{ label: "Institution Type", key: "institution_type", type: "text", description: "College, university, or institute" },
	{ label: "Established Year", key: "established_year", type: "number", description: "Year of establishment" },
	{ label: "Principal Name", key: "principal_name", type: "text", description: "Head of institution" },
	{ label: "Total Faculty", key: "total_faculty", type: "number", description: "Faculty count" },
	{ label: "Total Students", key: "total_students", type: "number", description: "Student strength" },
	{ label: "Accreditation Status", key: "accreditation_status", type: "text", description: "Current accreditation status" },
	{ label: "Programs Offered", key: "programs_offered", type: "text", description: "Comma separated programs" },
	{ label: "Website", key: "website", type: "text", description: "Institution website" },
	{ label: "Address", key: "address", type: "text", description: "Primary campus address" },
];

const defaultTemplates = [
	{ name: "NAAC", key: "naac", description: "National Assessment and Accreditation Council report", allowedRoles: ["admin", "user"] },
	{ name: "NBA", key: "nba", description: "National Board of Accreditation report", allowedRoles: ["admin", "user"] },
	{ name: "UGC", key: "ugc", description: "University Grants Commission report", allowedRoles: ["admin", "user"] },
];

const defaultTemplateFields = {
	naac: ["institution_name", "institution_type", "established_year", "principal_name", "total_faculty", "total_students", "accreditation_status", "website"],
	nba: ["institution_name", "established_year", "total_faculty", "total_students", "programs_offered", "accreditation_status", "address"],
	ugc: ["institution_name", "institution_type", "established_year", "principal_name", "programs_offered", "website", "address"],
};

const seedDefaults = async () => {
	const passwordHash = async (value) => bcrypt.hash(value, 10);

	const users = [
		{ name: "EduSync Admin", email: "admin@edusync.local", password: await passwordHash("Admin@123"), role: "admin" },
		{ name: "EduSync User", email: "user@edusync.local", password: await passwordHash("User@123"), role: "user" },
	];

	for (const user of users) {
		await User.updateOne({ email: user.email }, { $setOnInsert: user }, { upsert: true });
	}

	const fields = [];
	for (const field of defaultFieldData) {
		const created = await Field.findOneAndUpdate(
			{ key: field.key },
			{ $setOnInsert: field },
			{ upsert: true, new: true, setDefaultsOnInsert: true }
		);
		fields.push(created);
	}

	const fieldsByKey = new Map(fields.map((field) => [field.key, field]));

	for (const template of defaultTemplates) {
		const createdTemplate = await Template.findOneAndUpdate(
			{ key: template.key },
			{ $setOnInsert: template },
			{ upsert: true, new: true, setDefaultsOnInsert: true }
		);

		const desiredFields = defaultTemplateFields[template.key] || [];
		for (let index = 0; index < desiredFields.length; index += 1) {
			const field = fieldsByKey.get(desiredFields[index]);
			if (!field) {
				continue;
			}

			await TemplateField.updateOne(
				{ templateId: createdTemplate._id, fieldId: field._id },
				{ $setOnInsert: { templateId: createdTemplate._id, fieldId: field._id, sortOrder: index + 1 } },
				{ upsert: true }
			);
		}
	}
};

const connectDB = async () => {
	// DB connection + default metadata seeding happen during backend startup.
	const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/edusync";

	if (mongoose.connection.readyState === 1) {
		return mongoose.connection;
	}

	await mongoose.connect(mongoUri, { autoIndex: true });
	await Promise.all([User.init(), Field.init(), Template.init(), TemplateField.init(), Mapping.init(), UploadSession.init(), Report.init()]);
	await seedDefaults();
	console.log("MongoDB connected");

	return mongoose.connection;
};

const getTemplateWithFields = async (templateId) => {
	const template = await Template.findById(templateId).lean();
	if (!template) {
		return null;
	}

	const links = await TemplateField.find({ templateId }).sort({ sortOrder: 1 }).lean();
	const fieldIds = links.map((link) => link.fieldId);
	const fields = fieldIds.length ? await Field.find({ _id: { $in: fieldIds } }).lean() : [];
	const fieldMap = new Map(fields.map((field) => [String(field._id), field]));

	return {
		...template,
		id: String(template._id),
		fields: links
			.map((link) => fieldMap.get(String(link.fieldId)))
			.filter(Boolean)
			.map((field) => ({
				id: String(field._id),
				label: field.label,
				key: field.key,
				type: field.type,
				description: field.description,
			})),
	};
};

module.exports = {
	mongoose,
	connectDB,
	seedDefaults,
	User,
	Field,
	Template,
	TemplateField,
	Mapping,
	UploadSession,
	Report,
	getTemplateWithFields,
};