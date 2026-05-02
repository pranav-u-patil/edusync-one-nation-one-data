// Field synonyms mapping: maps system field keys to common CSV header variations
// Covers NAAC, UGC, NBA, and general institutional metrics
// Used for enhanced fuzzy matching during field mapping (checked before similarity scoring)

const fieldSynonyms = {
	// ==================== INSTITUTIONAL PROFILE ====================
	institution_name: [
		"Institution Name", "College Name", "University Name", "Organization Name", "Institute Name",
		"School Name", "Educational Institution", "Name of Institution", "Institutional Name", "Organization",
		"Org Name", "College", "University", "Institute"
	],
	institution_type: [
		"Institution Type", "College Type", "University Type", "Category", "Institutional Category",
		"Type of Institution", "College Category", "Organization Type", "Type", "Category"
	],
	established_year: [
		"Established Year", "Year Established", "Founded Year", "Establishment Year", "Start Year",
		"Year of Establishment", "Year Founded", "Inception Year", "Founded", "Established"
	],
	director_name: [
		"Director Name", "Principal Name", "Head Name", "Director", "Principal",
		"Vice Chancellor", "Rector", "Head of Institution", "Dean", "Administrator",
		"Chief Executive", "Chief Academic Officer", "Head Administrator"
	],
	director_email: [
		"Director Email", "Principal Email", "Head Email", "Director Email Address",
		"Contact Email", "Director Contact Email", "Email", "Head Email Address"
	],
	director_phone: [
		"Director Phone", "Principal Phone", "Head Phone", "Contact Phone", "Director Number",
		"Principal Contact", "Phone Number", "Head Contact", "Contact Number"
	],
	website: [
		"Website", "Website URL", "Official Website", "Web URL", "Institution Website",
		"Homepage", "Web Address", "Internet Address", "URL", "Web Link"
	],
	address: [
		"Address", "Campus Address", "Institution Address", "Location", "Street Address",
		"Full Address", "Physical Address", "Postal Address", "Headquarters Address"
	],
	city: ["City", "Location City", "City Name", "Town"],
	state: ["State", "Location State", "State Name", "Province"],
	pin_code: [
		"Pin Code", "Postal Code", "Zip Code", "PIN", "Pincode",
		"Postal", "Zip", "Code", "Zip Code"
	],
	autonomous_status: [
		"Autonomous Status", "Autonomy Status", "Is Autonomous", "Autonomous College",
		"Autonomous Institution", "Autonomous Deemed", "Autonomous", "Autonomy"
	],
	reaccreditation_grade: [
		"NAAC Grade", "Accreditation Grade", "NAAC Rating", "Current Grade",
		"Re-accreditation Grade", "CGPA Grade", "Latest Grade", "Assessment Grade"
	],
	naac_score: [
		"NAAC Score", "Cumulative Score", "CGPA", "NAAC CGPA", "Score",
		"Total Score", "Assessment Score", "NAAC Cumulative Score"
	],
	campus_area_acres: [
		"Campus Area", "Campus Area (acres)", "Land Area", "Total Area",
		"Area (acres)", "Campus Size", "Property Area", "Acreage", "Area"
	],
	accredited_programs: [
		"Accredited Programs", "Number of Accredited Programs", "NBA Programs",
		"Accreditation Count", "Accredited Courses", "Number of Accredited Courses"
	],

	// ==================== FACULTY PROFILE ====================
	total_faculty: [
		"Total Faculty", "No. of Faculty", "Faculty Count", "Staff Strength",
		"Faculty Members", "Number of Teachers", "Total Staff", "Faculty Strength",
		"Teaching Staff", "Academic Staff", "Faculty", "Total Teachers"
	],
	male_faculty: [
		"Male Faculty", "Male Teachers", "Male Staff", "Male Faculty Count",
		"Number of Male Faculty", "Male Academic Staff", "Male Teaching Staff"
	],
	female_faculty: [
		"Female Faculty", "Female Teachers", "Female Staff", "Female Faculty Count",
		"Number of Female Faculty", "Female Academic Staff", "Female Teaching Staff", "Women Faculty"
	],
	faculty_with_phd: [
		"Faculty with PhD", "PhD Faculty", "Faculty with Doctorate",
		"Doctorate Holders", "PhD Holders", "Doctor Faculty", "Faculty with Doctoral Degree",
		"Doctoral Faculty", "Faculty with Doctoral", "PhDs"
	],
	faculty_with_masters: [
		"Faculty with M.Tech", "M.Tech Faculty", "Masters Degree Faculty", "M.Tech Holders",
		"Faculty with M.Sc", "Faculty with Masters", "MA Faculty", "Masters Faculty", "PG Qualifications"
	],
	faculty_foreign_qual: [
		"Faculty with Foreign Qualification", "Faculty with Doctorate from Abroad",
		"Foreign Doctorate", "International PhD", "Overseas PhD", "Faculty from Abroad",
		"Foreign Qualifications", "International Faculty", "Overseas Faculty"
	],
	tenure_faculty: [
		"Tenure Faculty", "Permanent Faculty", "Regular Faculty", "Tenured Faculty",
		"Permanent Staff", "Establishment Faculty", "Full Time Faculty"
	],
	contractual_faculty: [
		"Contractual Faculty", "Contract Faculty", "Guest Faculty", "Visiting Faculty",
		"Part Time Faculty", "Adjunct Faculty", "Contract Staff", "Guest Staff"
	],
	faculty_dev_programs: [
		"Faculty Development Programmes", "Faculty Training Programs", "Faculty Development Programs",
		"Professional Development", "Faculty Programs", "Training Programs", "Development Programs"
	],
	avg_faculty_experience: [
		"Average Faculty Experience", "Average Experience", "Mean Experience",
		"Faculty Experience (Years)", "Avg Experience", "Mean Teaching Experience"
	],

	// ==================== STUDENT PROFILE ====================
	total_students: [
		"Total Students", "Student Strength", "Total Enrollment", "Number of Students",
		"Student Count", "Enrolled Students", "Total Enrolment", "Student Population",
		"Overall Strength", "Total Strength"
	],
	male_students: [
		"Male Students", "Male Enrollment", "Number of Male Students", "Male Student Count",
		"Male Enrolment", "Boy Students"
	],
	female_students: [
		"Female Students", "Female Enrollment", "Number of Female Students", "Female Student Count",
		"Female Enrolment", "Girl Students", "Women Students"
	],
	sc_students: [
		"SC Students", "Scheduled Caste Students", "SC Enrollment", "SC Count",
		"SC Category Students", "Scheduled Caste", "SC Enrolment"
	],
	st_students: [
		"ST Students", "Scheduled Tribe Students", "ST Enrollment", "ST Count",
		"ST Category Students", "Scheduled Tribe", "ST Enrolment"
	],
	obc_students: [
		"OBC Students", "Other Backward Class Students", "OBC Enrollment", "OBC Count",
		"OBC Category Students", "Other Backward", "OBC Enrolment"
	],
	pwd_students: [
		"PWD Students", "Disabled Students", "PwD Students", "Students with Disabilities",
		"Persons with Disabilities", "Differently Abled", "Special Needs Students"
	],
	international_students: [
		"International Students", "Foreign Students", "Overseas Students", "NRI Students",
		"Foreign Enrollment", "International Enrollment", "Foreign Enrolment"
	],
	hostel_capacity: [
		"Hostel Capacity", "Hostel Strength", "Hostel Beds", "Number of Hostel Beds",
		"Hostel Accommodation", "Hostel Capacity (Students)", "Residential Capacity"
	],
	hostel_occupancy_percent: [
		"Hostel Occupancy", "Hostel Occupancy %", "Hostel Occupancy Percentage",
		"Occupancy Rate", "Occupancy %"
	],

	// ==================== ACADEMIC & CURRICULUM ====================
	programs_offered: [
		"Programs Offered", "Total Programs", "Number of Programs", "Programs Count",
		"Program Count", "Courses Offered", "Total Courses"
	],
	ug_programs: [
		"UG Programs", "Undergraduate Programs", "Bachelor Programs", "Degree Programs",
		"UG Courses", "Undergraduate Courses", "Bachelor Courses"
	],
	pg_programs: [
		"PG Programs", "Postgraduate Programs", "Master Programs", "Post Graduate",
		"PG Courses", "Master's Programs", "Graduate Programs"
	],
	phd_programs: [
		"PhD Programs", "Doctoral Programs", "Research Programs", "Doctorate Programs",
		"PhD Courses", "Research Courses", "Doctoral Courses"
	],
	diploma_programs: [
		"Diploma Programs", "Diploma Courses", "Vocational Programs", "Professional Diploma"
	],
	certificate_programs: [
		"Certificate Programs", "Certification Courses", "Certificate Courses",
		"Short Term Courses", "Skill Certificates"
	],
	moocs_offered: [
		"MOOCs Offered", "Online Courses", "MOOC Courses", "Digital Courses",
		"Open Courses", "Web Based Courses"
	],
	value_added_courses: [
		"Value-Added Courses", "Skill Courses", "Skill Development", "Professional Courses",
		"Extra Courses", "Add-on Courses", "Certification Programs"
	],
	curriculum_revision_years: [
		"Curriculum Revision Frequency", "Curriculum Update Frequency", "Review Frequency",
		"Curriculum Revision Years", "Update Interval", "Revision Interval"
	],
	cbcs_adopted: [
		"Choice Based Credit System", "CBCS", "CBCS Adopted", "Credit System",
		"Semester Credit System", "Choice Based"
	],

	// ==================== RESEARCH & INNOVATION ====================
	research_papers_published: [
		"Research Papers Published", "Papers Published", "Number of Papers",
		"Journal Papers", "National Papers", "National Publications", "Paper Count"
	],
	international_papers: [
		"International Papers Published", "International Papers", "International Research Papers",
		"International Publications", "Papers in International Journals", "Global Publications"
	],
	books_published: [
		"Books/Book Chapters", "Books Published", "Number of Books", "Published Books",
		"Book Count", "Authored Books", "Books"
	],
	patents_filed: [
		"Patents Filed", "Patent Applications", "Number of Patents Filed",
		"Filed Patents", "Patent Count", "IPR Filed"
	],
	patents_granted: [
		"Patents Granted", "Patent Grants", "Number of Patents Granted",
		"Granted Patents", "Patent Grant Count", "IPR Granted"
	],
	sponsored_research: [
		"Sponsored Research Projects", "Research Projects", "Funded Projects",
		"Number of Research Projects", "External Research Projects"
	],
	consultancy_projects: [
		"Consultancy Projects", "Consulting Projects", "Number of Consultancy Projects",
		"Advisory Projects", "Consulting Services"
	],
	research_funding_lakhs: [
		"Research Funding Received", "Research Funding", "Funding Received",
		"Research Fund", "Total Research Funding", "Research Grants", "Research Fund (Rs. Lakhs)"
	],
	consultancy_revenue_lakhs: [
		"Consultancy Revenue", "Consultancy Income", "Consulting Revenue",
		"Consultancy Fund", "Consultancy (Rs. Lakhs)", "Advisory Revenue"
	],
	national_collaborations: [
		"Research Collaborations (National)", "National Collaborations", "Domestic Partnerships",
		"National Partnerships", "Inter-institutional Partnerships"
	],
	international_collaborations: [
		"Research Collaborations (International)", "International Collaborations",
		"Global Partnerships", "International Partnerships", "Overseas Collaborations"
	],

	// ==================== PLACEMENTS & EMPLOYABILITY ====================
	placement_percentage: [
		"Placement Rate", "Placement %", "Placement Percentage", "Percent Placed",
		"Placement Ratio", "Placement Success Rate"
	],
	students_placed: [
		"Students Placed", "Total Placements", "Number of Placements",
		"Placed Count", "Graduates Placed"
	],
	avg_salary_lakhs: [
		"Average Salary", "Average Salary (Rs. Lakhs)", "Average Package",
		"Average Package (LPA)", "Mean Salary", "Mean Package", "Avg CTC"
	],
	highest_salary_lakhs: [
		"Highest Salary", "Highest Salary (Rs. Lakhs)", "Highest Package",
		"Maximum Package", "Max CTC", "Top Package", "Best Package"
	],
	lowest_salary_lakhs: [
		"Lowest Salary", "Lowest Salary (Rs. Lakhs)", "Lowest Package",
		"Minimum Package", "Min CTC", "Base Package"
	],
	internship_percentage: [
		"Internship Placement Rate", "Internship %", "Internship Percentage",
		"Intern Placement", "Students with Internships"
	],
	self_employed_count: [
		"Entrepreneurship/Self-employed", "Self-employed Graduates", "Self Employed",
		"Entrepreneurs", "Self Employment Count"
	],
	campus_companies: [
		"Campus Recruitment Drive Companies", "Campus Recruits", "Number of Companies",
		"Company Count", "Recruiter Count", "Visiting Companies"
	],
	higher_studies_count: [
		"Higher Studies Pursuit", "Further Education", "PG Admission",
		"Postgraduate Admission", "Pursuing Higher Education"
	],

	// ==================== INFRASTRUCTURE & FACILITIES ====================
	library_books_count: [
		"Library Books", "Total Books", "Number of Books", "Book Count",
		"Library Collection", "Books in Library", "Volumes"
	],
	eresources_subscriptions: [
		"E-Resources Subscriptions", "Digital Resources", "Online Journals",
		"E-Resources", "Digital Collection", "Electronic Resources", "Online Databases"
	],
	laboratory_count: [
		"Laboratory Count", "Number of Labs", "Lab Count", "Laboratories",
		"Total Laboratories"
	],
	computer_labs: [
		"Computer Laboratory Count", "Computer Labs", "Computing Labs",
		"Computer Laboratory", "Number of Computer Labs", "IT Labs"
	],
	total_computers: [
		"Total Computers", "Computer Count", "Number of Computers",
		"Computer Strength", "PCs Available"
	],
	internet_bandwidth_mbps: [
		"Internet Bandwidth", "Internet Bandwidth (Mbps)", "Bandwidth",
		"Internet Speed", "Bandwidth (Mbps)", "Network Bandwidth"
	],
	wifi_coverage_percent: [
		"Wi-Fi Coverage", "WiFi Coverage %", "WiFi Percentage",
		"Wireless Coverage", "WiFi Coverage Percentage"
	],
	seminar_halls_count: [
		"Seminar Halls", "Auditorium", "Seminar Hall Count", "Number of Seminar Halls",
		"Auditoriums"
	],
	sports_facilities_count: [
		"Sports Facilities", "Number of Sports Facilities", "Sports Complex",
		"Playing Fields", "Sports Equipment"
	],
	health_centre_available: [
		"Health Centre", "Medical Facility", "Health Services",
		"Medical Facility Available", "Hospital"
	],
	counseling_center: [
		"Counseling Center", "Counseling Services", "Mental Health",
		"Psychological Counseling", "Career Counseling"
	],

	// ==================== ACADEMIC EXCELLENCE ====================
	merit_scholarships_count: [
		"Merit Scholarships", "Number of Scholarships", "Scholarship Count",
		"Academic Scholarships", "Merit Based Aid"
	],
	financial_assistance_count: [
		"Financial Assistance Recipients", "Financial Aid", "Student Aid",
		"Scholarship Recipients", "Aid Recipients"
	],
	toppers_count: [
		"Toppers in University Exams", "Rank Holders", "Toppers",
		"University Toppers", "First Rank"
	],
	first_class_distinction: [
		"First Class With Distinction", "Distinction Graduates", "High Distinction",
		"First Class", "Honors Graduates"
	],
	nss_units: [
		"NSS Units", "National Service Scheme", "Number of NSS Units",
		"NSS"
	],
	nss_volunteers: [
		"NSS Volunteers", "Students in NSS", "NSS Members",
		"NSS Enrollment"
	],
	ncc_units: [
		"NCC Units", "National Cadet Corps", "Number of NCC Units",
		"NCC"
	],
	ncc_cadets: [
		"NCC Cadets", "Students in NCC", "NCC Enrollment",
		"NCC Members"
	],
	cultural_activities: [
		"Cultural Activities Organized", "Fests Organized", "Events Organized",
		"Cultural Programs", "Festival Count"
	],
	sports_national_awards: [
		"Sports Achievements National", "National Awards", "Sports Awards",
		"National Sports Awards", "Achievement Count"
	],

	// ==================== QUALITY ASSURANCE & GOVERNANCE ====================
	iqac_active: [
		"Internal Quality Assurance Cell", "IQAC", "IQAC Active",
		"Quality Cell", "Quality Assurance Cell"
	],
	iso_certification: [
		"ISO Certification", "ISO Certifications", "Certified Standards",
		"Standards Certification", "ISO Standards"
	],
	gb_meetings_annual: [
		"Governing Body Meetings (Annual)", "Governance Meetings", "GB Meetings",
		"Board Meetings", "Council Meetings"
	],
	academic_audit_frequency: [
		"Academic Audit Frequency", "Audit Frequency", "Years Between Audits",
		"Audit Interval"
	],
	ugc_compliance: [
		"Compliance with UGC Norms", "UGC Compliance", "Regulatory Compliance",
		"Statutory Compliance", "Compliance Status"
	],
	grievance_mechanism: [
		"Grievance Redressal Mechanism", "Grievance System", "Complaint Mechanism",
		"Student Grievance System", "Redressal System"
	],
	admission_transparency: [
		"Transparency in Admissions", "Open Admission", "Merit Based",
		"Transparent Process", "Admission Policy"
	],
	cutoff_public: [
		"Admission Cutoff Transparency", "Published Cutoffs", "Cutoff Published",
		"Merit Cutoff", "Public Cutoff"
	],

	// ==================== FINANCIAL HEALTH ====================
	annual_budget_lakhs: [
		"Annual Budget", "Annual Budget (Rs. Lakhs)", "Total Budget",
		"Budget (Lakhs)", "Budget"
	],
	govt_grants_lakhs: [
		"Government Grants", "Government Grants (Rs. Lakhs)", "State Grants",
		"Central Grants", "Govt Funding"
	],
	fee_revenue_lakhs: [
		"Revenue from Fees", "Revenue from Fees (Rs. Lakhs)", "Fee Income",
		"Student Fee Revenue", "Tuition Income"
	],
	endowment_fund_lakhs: [
		"Endowment Fund", "Corpus", "Endowment Fund (Rs. Lakhs)",
		"Reserve Fund", "Permanent Fund"
	],
	capital_expenditure_lakhs: [
		"Capital Expenditure", "Capital Expenditure (Rs. Lakhs)", "Infrastructure Spending",
		"Asset Spending", "Capital Investment"
	],
	research_expenditure_lakhs: [
		"Research Expenditure", "Research Expenditure (Rs. Lakhs)",
		"R&D Spending", "Research Investment"
	],

	// ==================== STUDENT SUPPORT & MENTORING ====================
	mentoring_program: [
		"Academic Mentoring Program", "Mentorship Program", "Mentoring",
		"Mentor Program", "Academic Guidance"
	],
	mentor_mentee_ratio: [
		"Mentor-Mentee Ratio", "Mentoring Ratio", "Mentor Ratio",
		"Coverage Ratio"
	],
	feedback_mechanism: [
		"Student Feedback Mechanism", "Feedback System", "Course Feedback",
		"Evaluation System", "Feedback Loop"
	],
	performance_tracking: [
		"Student Performance Tracking", "Performance Monitoring", "Continuous Monitoring",
		"Track Student Performance"
	],
	remedial_programs: [
		"Remedial Teaching Programs", "Remedial Classes", "Extra Classes",
		"Supplementary Teaching", "Support Classes"
	],

	// ==================== INSTITUTIONAL DISTINCTIVENESS ====================
	unique_programs: [
		"Unique Academic Program", "Distinctive Programs", "Special Offerings",
		"Unique Courses", "Innovative Programs"
	],
	research_focus: [
		"Research Focus Area", "Research Domain", "Focus Area",
		"Research Theme", "Primary Research"
	],
	community_engagement: [
		"Community Engagement", "Community Outreach", "Social Service",
		"Community Programs", "Outreach Activities"
	],
	industry_partnerships: [
		"Industry Partnerships", "Industry MOUs", "Industry Collaborations",
		"Corporate Partnerships", "Partnership Count"
	],
	alumni_network_size: [
		"Alumni Network Strength", "Alumni Count", "Alumni Members",
		"Alumni Network Size", "Alumni Strength"
	],
};

module.exports = fieldSynonyms;
