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
		academicYear: { type: String, default: null }, // e.g., "2024-25"
		extraFieldActions: [
			{
				templateId: { type: mongoose.Schema.Types.ObjectId, ref: "Template" },
				csvField: { type: String },
				action: { type: String, enum: ["ignored", "suggested", "map_now"] },
				note: { type: String, default: "" },
				updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
				updatedAt: { type: Date, default: Date.now },
			},
		],
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
		academicYear: { type: String, default: null }, // e.g., "2024-25"
		reportStatus: { type: String, enum: ["draft", "submitted", "archived"], default: "draft" },
		submittedAt: { type: Date, default: null },
	},
	{ timestamps: true }
);

const yearSummarySchema = new mongoose.Schema(
	{
		userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
		academicYear: { type: String, required: true, index: true }, // e.g., "2024-25"
		naac: {
			totalReports: { type: Number, default: 0 },
			completedReports: { type: Number, default: 0 },
			completionPercentage: { type: Number, default: 0 },
			reportStatus: { type: String, enum: ["draft", "submitted", "archived"], default: "draft" },
		},
		ugc: {
			totalReports: { type: Number, default: 0 },
			completedReports: { type: Number, default: 0 },
			completionPercentage: { type: Number, default: 0 },
			reportStatus: { type: String, enum: ["draft", "submitted", "archived"], default: "draft" },
		},
		nba: {
			totalReports: { type: Number, default: 0 },
			completedReports: { type: Number, default: 0 },
			completionPercentage: { type: Number, default: 0 },
			reportStatus: { type: String, enum: ["draft", "submitted", "archived"], default: "draft" },
		},
	},
	{ timestamps: true }
);

const metadataSuggestionSchema = new mongoose.Schema(
	{
		userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
		sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "UploadSession", index: true },
		templateId: { type: mongoose.Schema.Types.ObjectId, ref: "Template", required: true, index: true },
		csvField: { type: String, required: true }, // Original CSV column name
		suggestedKey: { type: String, required: true }, // Normalized system key
		suggestedLabel: { type: String, required: true }, // User-visible label
		submissionCount: { type: Number, default: 1 }, // How many times this field was suggested
		status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending", index: true },
		note: { type: String, default: "" }, // Admin notes on approval/rejection
		reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
		reviewedAt: { type: Date, default: null },
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
const YearSummary = mongoose.models.YearSummary || mongoose.model("YearSummary", yearSummarySchema);
const MetadataSuggestion = mongoose.models.MetadataSuggestion || mongoose.model("MetadataSuggestion", metadataSuggestionSchema);

const defaultFieldData = [
	// Institutional Profile
	{ label: "Institution Name", key: "institution_name", type: "text", description: "Official institution name" },
	{ label: "Institution Type", key: "institution_type", type: "text", description: "College, university, or institute" },
	{ label: "Established Year", key: "established_year", type: "number", description: "Year of establishment" },
	{ label: "Director Name", key: "director_name", type: "text", description: "Head of institution" },
	{ label: "Director Email", key: "director_email", type: "text", description: "Contact email of director" },
	{ label: "Director Phone", key: "director_phone", type: "text", description: "Contact phone of director" },
	{ label: "Website", key: "website", type: "text", description: "Institution website" },
	{ label: "Address", key: "address", type: "text", description: "Primary campus address" },
	{ label: "City", key: "city", type: "text", description: "City location" },
	{ label: "State", key: "state", type: "text", description: "State location" },
	{ label: "Pin Code", key: "pin_code", type: "text", description: "Postal code" },
	{ label: "Autonomous Status", key: "autonomous_status", type: "text", description: "Is institution autonomous?" },
	{ label: "Re-accreditation Grade", key: "reaccreditation_grade", type: "text", description: "Latest NAAC grade" },
	{ label: "NAAC Score", key: "naac_score", type: "number", description: "NAAC cumulative score" },
	{ label: "Campus Area (acres)", key: "campus_area_acres", type: "number", description: "Total campus area" },
	{ label: "Accredited Programs", key: "accredited_programs", type: "number", description: "Number of accredited programs" },
	
	// Faculty Profile
	{ label: "Total Faculty", key: "total_faculty", type: "number", description: "Total faculty count" },
	{ label: "Male Faculty", key: "male_faculty", type: "number", description: "Male faculty count" },
	{ label: "Female Faculty", key: "female_faculty", type: "number", description: "Female faculty count" },
	{ label: "Faculty with PhD", key: "faculty_with_phd", type: "number", description: "Faculty with doctoral degrees" },
	{ label: "Faculty with M.Tech/M.Sc", key: "faculty_with_masters", type: "number", description: "Faculty with master degrees" },
	{ label: "Faculty with Foreign Qualification", key: "faculty_foreign_qual", type: "number", description: "Faculty with degrees from abroad" },
	{ label: "Tenure Faculty", key: "tenure_faculty", type: "number", description: "Permanent faculty members" },
	{ label: "Contractual Faculty", key: "contractual_faculty", type: "number", description: "Contract-based faculty members" },
	{ label: "Faculty Development Programmes", key: "faculty_dev_programs", type: "number", description: "Training programs conducted" },
	{ label: "Average Faculty Experience (years)", key: "avg_faculty_experience", type: "number", description: "Mean years of experience" },
	
	// Student Profile
	{ label: "Total Students", key: "total_students", type: "number", description: "Total student strength" },
	{ label: "Male Students", key: "male_students", type: "number", description: "Male students" },
	{ label: "Female Students", key: "female_students", type: "number", description: "Female students" },
	{ label: "SC Students", key: "sc_students", type: "number", description: "Scheduled Caste students" },
	{ label: "ST Students", key: "st_students", type: "number", description: "Scheduled Tribe students" },
	{ label: "OBC Students", key: "obc_students", type: "number", description: "Other Backward Class students" },
	{ label: "PWD Students", key: "pwd_students", type: "number", description: "Students with disabilities" },
	{ label: "International Students", key: "international_students", type: "number", description: "Foreign/International students" },
	{ label: "Hostel Capacity", key: "hostel_capacity", type: "number", description: "Total hostel beds" },
	{ label: "Hostel Occupancy", key: "hostel_occupancy_percent", type: "number", description: "Hostel occupancy %" },
	
	// Academic & Curriculum
	{ label: "Programs Offered", key: "programs_offered", type: "number", description: "Total programs/courses" },
	{ label: "UG Programs", key: "ug_programs", type: "number", description: "Undergraduate programs" },
	{ label: "PG Programs", key: "pg_programs", type: "number", description: "Postgraduate programs" },
	{ label: "PhD Programs", key: "phd_programs", type: "number", description: "Doctoral programs" },
	{ label: "Diploma Programs", key: "diploma_programs", type: "number", description: "Diploma programs" },
	{ label: "Certificate Programs", key: "certificate_programs", type: "number", description: "Certificate programs" },
	{ label: "MOOCs Offered", key: "moocs_offered", type: "number", description: "MOOC courses available" },
	{ label: "Value-Added Courses", key: "value_added_courses", type: "number", description: "Extra skill courses" },
	{ label: "Curriculum Revision Frequency", key: "curriculum_revision_years", type: "number", description: "Years between updates" },
	{ label: "Choice Based Credit System", key: "cbcs_adopted", type: "text", description: "Is CBCS adopted?" },
	
	// Research & Innovation
	{ label: "Research Papers Published", key: "research_papers_published", type: "number", description: "National journal papers" },
	{ label: "International Papers Published", key: "international_papers", type: "number", description: "International journal papers" },
	{ label: "Books/Book Chapters", key: "books_published", type: "number", description: "Books and chapters authored" },
	{ label: "Patents Filed", key: "patents_filed", type: "number", description: "Patent applications" },
	{ label: "Patents Granted", key: "patents_granted", type: "number", description: "Patents received" },
	{ label: "Sponsored Research Projects", key: "sponsored_research", type: "number", description: "Externally funded projects" },
	{ label: "Consultancy Projects", key: "consultancy_projects", type: "number", description: "Consultancy engagements" },
	{ label: "Research Funding Received (Rs. Lakhs)", key: "research_funding_lakhs", type: "number", description: "Total research grants" },
	{ label: "Consultancy Revenue (Rs. Lakhs)", key: "consultancy_revenue_lakhs", type: "number", description: "Income from consultancy" },
	{ label: "Research Collaborations (National)", key: "national_collaborations", type: "number", description: "Inter-institutional partnerships" },
	{ label: "Research Collaborations (International)", key: "international_collaborations", type: "number", description: "International research partnerships" },
	
	// Placements & Employability
	{ label: "Placement Rate (%)", key: "placement_percentage", type: "number", description: "Percent students placed" },
	{ label: "Students Placed", key: "students_placed", type: "number", description: "Number of placed students" },
	{ label: "Average Salary (Rs. Lakhs)", key: "avg_salary_lakhs", type: "number", description: "Mean salary package" },
	{ label: "Highest Salary (Rs. Lakhs)", key: "highest_salary_lakhs", type: "number", description: "Maximum salary offered" },
	{ label: "Lowest Salary (Rs. Lakhs)", key: "lowest_salary_lakhs", type: "number", description: "Minimum salary offered" },
	{ label: "Internship Placement Rate (%)", key: "internship_percentage", type: "number", description: "Students with internships" },
	{ label: "Entrepreneurship/Self-employed", key: "self_employed_count", type: "number", description: "Graduates as entrepreneurs" },
	{ label: "Campus Recruitment Drive Companies", key: "campus_companies", type: "number", description: "Companies recruiting on campus" },
	{ label: "Higher Studies Pursuit", key: "higher_studies_count", type: "number", description: "Students pursuing higher education" },
	
	// Infrastructure & Facilities
	{ label: "Library Books", key: "library_books_count", type: "number", description: "Total books in library" },
	{ label: "E-Resources Subscriptions", key: "eresources_subscriptions", type: "number", description: "Digital resources accessed" },
	{ label: "Laboratory Count", key: "laboratory_count", type: "number", description: "Number of labs" },
	{ label: "Computer Laboratory Count", key: "computer_labs", type: "number", description: "Computer labs available" },
	{ label: "Total Computers", key: "total_computers", type: "number", description: "Computers in institution" },
	{ label: "Internet Bandwidth (Mbps)", key: "internet_bandwidth_mbps", type: "number", description: "Network speed" },
	{ label: "Wi-Fi Coverage (%)", key: "wifi_coverage_percent", type: "number", description: "Percentage campus WiFi coverage" },
	{ label: "Seminar Halls", key: "seminar_halls_count", type: "number", description: "Auditorium/seminar halls" },
	{ label: "Sports Facilities", key: "sports_facilities_count", type: "number", description: "Number of sports facilities" },
	{ label: "Health Centre", key: "health_centre_available", type: "text", description: "Medical facility available?" },
	{ label: "Counseling Center", key: "counseling_center", type: "text", description: "Counseling services available?" },
	
	// Academic Excellence
	{ label: "Merit Scholarships", key: "merit_scholarships_count", type: "number", description: "Merit-based scholarships" },
	{ label: "Financial Assistance Recipients", key: "financial_assistance_count", type: "number", description: "Students receiving aid" },
	{ label: "Toppers in University Exams", key: "toppers_count", type: "number", description: "Rank holders" },
	{ label: "First Class With Distinction", key: "first_class_distinction", type: "number", description: "High distinction graduates" },
	{ label: "NSS Units", key: "nss_units", type: "number", description: "Social service units" },
	{ label: "NSS Volunteers", key: "nss_volunteers", type: "number", description: "Students in NSS" },
	{ label: "NCC Units", key: "ncc_units", type: "number", description: "NCC units" },
	{ label: "NCC Cadets", key: "ncc_cadets", type: "number", description: "NCC enrolled students" },
	{ label: "Cultural Activities Organized", key: "cultural_activities", type: "number", description: "Fests and events" },
	{ label: "Sports Achievements National", key: "sports_national_awards", type: "number", description: "National sports awards" },
	
	// Quality Assurance & Governance
	{ label: "Internal Quality Assurance Cell (IQAC)", key: "iqac_active", type: "text", description: "IQAC functioning?" },
	{ label: "ISO Certification", key: "iso_certification", type: "text", description: "ISO standards achieved" },
	{ label: "Governing Body Meetings (Annual)", key: "gb_meetings_annual", type: "number", description: "Governance body meetings/year" },
	{ label: "Academic Audit Frequency", key: "academic_audit_years", type: "number", description: "Years between audits" },
	{ label: "Compliance with UGC Norms", key: "ugc_compliance", type: "text", description: "UGC norms adherence" },
	{ label: "Grievance Redressal Mechanism", key: "grievance_mechanism", type: "text", description: "Complaint handling system" },
	{ label: "Transparency in Admissions", key: "admission_transparency", type: "text", description: "Open admission process?" },
	{ label: "Admission Cutoff Transparency", key: "cutoff_public", type: "text", description: "Cutoffs published?" },
	
	// Financial Health (NAAC specific)
	{ label: "Annual Budget (Rs. Lakhs)", key: "annual_budget_lakhs", type: "number", description: "Total annual budget" },
	{ label: "Government Grants (Rs. Lakhs)", key: "govt_grants_lakhs", type: "number", description: "State/Central grants" },
	{ label: "Revenue from Fees (Rs. Lakhs)", key: "fee_revenue_lakhs", type: "number", description: "Student fee income" },
	{ label: "Endowment Fund (Rs. Lakhs)", key: "endowment_fund_lakhs", type: "number", description: "Corpus/endowment" },
	{ label: "Capital Expenditure (Rs. Lakhs)", key: "capital_expenditure_lakhs", type: "number", description: "Infrastructure spending" },
	{ label: "Research Expenditure (Rs. Lakhs)", key: "research_expenditure_lakhs", type: "number", description: "R&D spending" },
	
	// Student Support & Mentoring
	{ label: "Academic Mentoring Program", key: "mentoring_program", type: "text", description: "Mentorship active?" },
	{ label: "Mentor-Mentee Ratio", key: "mentor_mentee_ratio", type: "text", description: "Mentoring coverage ratio" },
	{ label: "Student Feedback Mechanism", key: "feedback_mechanism", type: "text", description: "Regular feedback collection?" },
	{ label: "Student Performance Tracking", key: "performance_tracking", type: "text", description: "Continuous monitoring system?" },
	{ label: "Remedial Teaching Programs", key: "remedial_programs", type: "text", description: "Extra classes available?" },
	
	// Institutional Distinctiveness
	{ label: "Unique Academic Program", key: "unique_programs", type: "text", description: "Distinctive offerings" },
	{ label: "Research Focus Area", key: "research_focus", type: "text", description: "Primary research domain" },
	{ label: "Community Engagement", key: "community_engagement", type: "text", description: "Community outreach programs" },
	{ label: "Industry Partnerships", key: "industry_partnerships", type: "number", description: "Industry collaborations" },
	{ label: "Alumni Network Strength", key: "alumni_network_size", type: "number", description: "Active alumni members" },
];

const defaultTemplates = [
	{ name: "NAAC", key: "naac", description: "National Assessment and Accreditation Council report", allowedRoles: ["admin", "user"] },
	{ name: "NBA", key: "nba", description: "National Board of Accreditation report", allowedRoles: ["admin", "user"] },
	{ name: "UGC", key: "ugc", description: "University Grants Commission report", allowedRoles: ["admin", "user"] },
];

const defaultTemplateFields = {
	naac: [
		// Institutional Profile (Criterion 1)
		"institution_name", "institution_type", "established_year", "director_name", "director_email", "director_phone",
		"website", "address", "city", "state", "pin_code", "autonomous_status", "campus_area_acres",
		
		// Faculty (Criterion 2)
		"total_faculty", "male_faculty", "female_faculty", "faculty_with_phd", "faculty_with_masters",
		"faculty_foreign_qual", "tenure_faculty", "contractual_faculty", "faculty_dev_programs", "avg_faculty_experience",
		
		// Student Profile (Criterion 3)
		"total_students", "male_students", "female_students", "sc_students", "st_students", "obc_students",
		"pwd_students", "international_students", "hostel_capacity", "hostel_occupancy_percent",
		
		// Curriculum & Academic Excellence (Criterion 4)
		"ug_programs", "pg_programs", "phd_programs", "value_added_courses", "curriculum_revision_years",
		"cbcs_adopted", "merit_scholarships_count", "financial_assistance_count",
		
		// Research & Innovation (Criterion 5)
		"research_papers_published", "international_papers", "books_published", "patents_filed", "patents_granted",
		"sponsored_research", "consultancy_projects", "research_funding_lakhs", "consultancy_revenue_lakhs",
		"national_collaborations", "international_collaborations",
		
		// Infrastructure & Facilities (Criterion 6)
		"library_books_count", "eresources_subscriptions", "laboratory_count", "computer_labs", "total_computers",
		"internet_bandwidth_mbps", "wifi_coverage_percent", "seminar_halls_count", "sports_facilities_count",
		"health_centre_available", "counseling_center",
		
		// Student Support & Mentoring (Criterion 7)
		"placement_percentage", "students_placed", "avg_salary_lakhs", "internship_percentage", "self_employed_count",
		"campus_companies", "higher_studies_count", "mentoring_program", "mentor_mentee_ratio",
		
		// Quality Assurance & Governance (Criterion 8)
		"iqac_active", "iso_certification", "gb_meetings_annual", "academic_audit_years", "ugc_compliance",
		"grievance_mechanism", "admission_transparency", "feedback_mechanism", "performance_tracking",
		
		// Financial Health (Criterion 9)
		"annual_budget_lakhs", "govt_grants_lakhs", "fee_revenue_lakhs", "endowment_fund_lakhs",
		"capital_expenditure_lakhs", "research_expenditure_lakhs",
		
		// Institutional Distinctiveness (Criterion 10)
		"unique_programs", "research_focus", "community_engagement", "industry_partnerships", "alumni_network_size",
		"nss_units", "nss_volunteers", "ncc_units", "ncc_cadets", "cultural_activities", "sports_national_awards",
		"toppers_count", "first_class_distinction", "reaccreditation_grade", "naac_score", "accredited_programs"
	],
	
	nba: [
		// Program Information
		"institution_name", "address", "website", "director_name", "director_email", "director_phone",
		
		// Program Details
		"ug_programs", "pg_programs", "phd_programs", "diploma_programs", "certificate_programs",
		"accredited_programs", "curriculum_revision_years", "cbcs_adopted", "industry_collaborations",
		
		// Faculty & Resources
		"total_faculty", "male_faculty", "female_faculty", "faculty_with_phd", "faculty_with_masters",
		"faculty_foreign_qual", "tenure_faculty", "avg_faculty_experience",
		
		// Student Profile
		"total_students", "male_students", "female_students", "sc_students", "st_students", "obc_students",
		"pwd_students", "international_students",
		
		// Infrastructure
		"laboratory_count", "computer_labs", "total_computers", "internet_bandwidth_mbps",
		"wifi_coverage_percent", "library_books_count", "eresources_subscriptions",
		
		// Academic & Research
		"research_papers_published", "international_papers", "patents_filed", "patents_granted",
		"sponsored_research", "consultancy_projects", "faculty_dev_programs",
		
		// Outcomes
		"placement_percentage", "students_placed", "avg_salary_lakhs", "higher_studies_count",
		"toppers_count", "first_class_distinction",
		
		// Governance & Quality
		"iqac_active", "iso_certification", "grievance_mechanism", "feedback_mechanism",
		"mentoring_program", "remedial_programs"
	],
	
	ugc: [
		// Institutional Profile
		"institution_name", "institution_type", "established_year", "director_name", "director_email",
		"website", "address", "city", "state", "pin_code", "autonomous_status", "campus_area_acres",
		
		// Governance & Administration
		"iqac_active", "gb_meetings_annual", "academic_audit_years", "ugc_compliance",
		"grievance_mechanism", "admission_transparency", "cutoff_public",
		
		// Academic Structure
		"ug_programs", "pg_programs", "phd_programs", "diploma_programs", "certificate_programs",
		"moocs_offered", "value_added_courses", "curriculum_revision_years", "cbcs_adopted",
		
		// Faculty
		"total_faculty", "male_faculty", "female_faculty", "faculty_with_phd", "faculty_with_masters",
		"faculty_foreign_qual", "tenure_faculty", "contractual_faculty", "faculty_dev_programs", "avg_faculty_experience",
		
		// Student Profile
		"total_students", "male_students", "female_students", "sc_students", "st_students",
		"obc_students", "pwd_students", "international_students", "hostel_capacity",
		
		// Quality Assurance
		"iso_certification", "feedback_mechanism", "performance_tracking", "remedial_programs",
		"mentoring_program", "student_feedback_mechanism",
		
		// Infrastructure
		"library_books_count", "eresources_subscriptions", "laboratory_count", "computer_labs",
		"internet_bandwidth_mbps", "wifi_coverage_percent", "seminar_halls_count",
		
		// Financial
		"annual_budget_lakhs", "govt_grants_lakhs", "fee_revenue_lakhs", "research_expenditure_lakhs",
		
		// Research & Innovation
		"research_papers_published", "books_published", "patents_filed", "sponsored_research",
		"consultancy_projects", "research_funding_lakhs",
		
		// Outcomes
		"placement_percentage", "students_placed", "avg_salary_lakhs", "self_employed_count",
		"higher_studies_count", "merit_scholarships_count", "financial_assistance_count",
		
		// Community Engagement
		"nss_units", "nss_volunteers", "ncc_units", "community_engagement",
		"cultural_activities", "sports_facilities_count"
	]
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
	await Promise.all([User.init(), Field.init(), Template.init(), TemplateField.init(), Mapping.init(), UploadSession.init(), Report.init(), YearSummary.init(), MetadataSuggestion.init()]);
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
	YearSummary,
	MetadataSuggestion,
	getTemplateWithFields,
};