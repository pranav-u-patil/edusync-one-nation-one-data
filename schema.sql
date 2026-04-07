-- ============================================================
--  ONE DATA, MULTIPLE TEMPLATE MANAGEMENT SYSTEM
--  MySQL Schema | Production-Grade | Node.js Compatible
--  Author: Generated via Claude
-- ============================================================

CREATE DATABASE IF NOT EXISTS odmt_system
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE odmt_system;

-- ============================================================
-- TABLE: users
-- Central identity store. Every person in the system is here.
-- ============================================================
CREATE TABLE users (
  user_id       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(60)  NOT NULL UNIQUE,
  email         VARCHAR(120) NOT NULL UNIQUE,
  role          ENUM('student','faculty','admin','staff') NOT NULL DEFAULT 'student',
  is_active     TINYINT(1)   NOT NULL DEFAULT 1,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB COMMENT='Central identity table. One row per real-world person.';


-- ============================================================
-- TABLE: field_definitions
-- Each unique data point (name, DOB, roll_no, etc.) is a NODE
-- in the graph. Stored once here, reused across all templates.
-- ============================================================
CREATE TABLE field_definitions (
  field_id      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  field_key     VARCHAR(80)  NOT NULL UNIQUE COMMENT 'Machine-readable key e.g. student_roll_no',
  field_label   VARCHAR(120) NOT NULL        COMMENT 'Human-readable default label',
  data_type     ENUM('text','number','date','email','phone','boolean','enum','json')
                             NOT NULL DEFAULT 'text',
  is_required   TINYINT(1)   NOT NULL DEFAULT 0,
  description   TEXT,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB COMMENT='Graph NODES — every possible data field defined exactly once.';


-- ============================================================
-- TABLE: user_data
-- Centralized EAV (Entity-Attribute-Value) store.
-- A user's data lives here once; templates just VIEW it differently.
-- SHA2 checksum detects any silent data corruption.
-- ============================================================
CREATE TABLE user_data (
  data_id       BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id       INT UNSIGNED    NOT NULL,
  field_id      INT UNSIGNED    NOT NULL,
  field_value   TEXT            NOT NULL,
  -- CRC / integrity column: SHA2-256 of (user_id || field_id || field_value)
  checksum      CHAR(64)        NOT NULL COMMENT 'SHA2-256 integrity hash',
  recorded_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uq_user_field (user_id, field_id),
  CONSTRAINT fk_ud_user  FOREIGN KEY (user_id)  REFERENCES users(user_id)  ON DELETE CASCADE,
  CONSTRAINT fk_ud_field FOREIGN KEY (field_id) REFERENCES field_definitions(field_id) ON DELETE RESTRICT
) ENGINE=InnoDB COMMENT='Centralized data store — one value per user per field with SHA2 integrity.';


-- ============================================================
-- TABLE: templates
-- Each form / report / profile layout is a template.
-- e.g. "Student Profile", "UGC Form A", "NAAC Self-Study Report"
-- ============================================================
CREATE TABLE templates (
  template_id   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  template_name VARCHAR(120) NOT NULL UNIQUE,
  template_type ENUM('profile','form','report','question_paper','certificate','other')
                             NOT NULL DEFAULT 'form',
  target_role   ENUM('student','faculty','admin','staff','all') NOT NULL DEFAULT 'all',
  version       SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  description   TEXT,
  is_active     TINYINT(1)   NOT NULL DEFAULT 1,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB COMMENT='Each template = a distinct layout/form/report structure.';


-- ============================================================
-- TABLE: template_sections
-- Templates can have multiple sections (pages/groups).
-- e.g. "Personal Info", "Academic Info", "Extracurriculars"
-- ============================================================
CREATE TABLE template_sections (
  section_id    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  template_id   INT UNSIGNED  NOT NULL,
  section_name  VARCHAR(120)  NOT NULL,
  display_order SMALLINT      NOT NULL DEFAULT 0,
  description   TEXT,

  CONSTRAINT fk_ts_template FOREIGN KEY (template_id) REFERENCES templates(template_id) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='Optional grouping of fields inside a template into named sections.';


-- ============================================================
-- TABLE: template_field_mappings  ← GRAPH EDGES
-- Maps field_definitions (nodes) to templates (nodes).
-- This IS the graph edge table.
--
-- mapping_type:
--   exact       → field_key matches perfectly
--   approximate → similar concept, different source field
--   reordered   → same field, different position in this template
-- ============================================================
CREATE TABLE template_field_mappings (
  mapping_id        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  template_id       INT UNSIGNED  NOT NULL,
  section_id        INT UNSIGNED  NULL COMMENT 'Optional: which section this field belongs to',
  field_id          INT UNSIGNED  NOT NULL COMMENT 'Source field node',
  -- Override label for this specific template (e.g. "Roll No" vs "Enrollment No")
  label_override    VARCHAR(120)  NULL,
  -- Position of this field in the template output
  display_order     SMALLINT      NOT NULL DEFAULT 0,
  -- Graph edge type
  mapping_type      ENUM('exact','approximate','reordered') NOT NULL DEFAULT 'exact',
  -- If mapping_type = approximate, point to the "equivalent" canonical field
  mapped_from_field INT UNSIGNED  NULL COMMENT 'Source field if this is an approximate remap',
  is_required       TINYINT(1)    NOT NULL DEFAULT 0,
  is_visible        TINYINT(1)    NOT NULL DEFAULT 1,
  -- Any transform hint for the backend (e.g. "uppercase", "date_format:DD/MM/YYYY")
  transform_hint    VARCHAR(120)  NULL,
  created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uq_template_field (template_id, field_id),

  CONSTRAINT fk_tfm_template   FOREIGN KEY (template_id)       REFERENCES templates(template_id)         ON DELETE CASCADE,
  CONSTRAINT fk_tfm_field      FOREIGN KEY (field_id)          REFERENCES field_definitions(field_id)    ON DELETE RESTRICT,
  CONSTRAINT fk_tfm_section    FOREIGN KEY (section_id)        REFERENCES template_sections(section_id)  ON DELETE SET NULL,
  CONSTRAINT fk_tfm_mapfrom    FOREIGN KEY (mapped_from_field) REFERENCES field_definitions(field_id)    ON DELETE SET NULL
) ENGINE=InnoDB COMMENT='Graph EDGES — how each field node connects to each template node.';


-- ============================================================
-- TABLE: field_enum_options
-- For fields of data_type = "enum", stores valid choices.
-- ============================================================
CREATE TABLE field_enum_options (
  option_id     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  field_id      INT UNSIGNED  NOT NULL,
  option_value  VARCHAR(80)   NOT NULL,
  option_label  VARCHAR(120)  NOT NULL,
  sort_order    SMALLINT      NOT NULL DEFAULT 0,

  CONSTRAINT fk_feo_field FOREIGN KEY (field_id) REFERENCES field_definitions(field_id) ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='Allowed enum values for fields of type enum.';


-- ============================================================
-- TABLE: template_generated_log
-- Audit log — every time a template is rendered for a user.
-- Stores a SHA2 snapshot hash for compliance / tamper detection.
-- ============================================================
CREATE TABLE template_generated_log (
  log_id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id         INT UNSIGNED   NOT NULL,
  template_id     INT UNSIGNED   NOT NULL,
  generated_by    INT UNSIGNED   NULL COMMENT 'Admin/faculty who triggered the generation',
  snapshot_hash   CHAR(64)       NOT NULL COMMENT 'SHA2-256 of the full rendered JSON at generation time',
  generated_at    DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_tgl_user      FOREIGN KEY (user_id)      REFERENCES users(user_id)      ON DELETE CASCADE,
  CONSTRAINT fk_tgl_template  FOREIGN KEY (template_id)  REFERENCES templates(template_id) ON DELETE CASCADE,
  CONSTRAINT fk_tgl_genby     FOREIGN KEY (generated_by) REFERENCES users(user_id)      ON DELETE SET NULL
) ENGINE=InnoDB COMMENT='Audit log with SHA2 snapshot hash every time a template is rendered.';


-- ============================================================
--  INDEXES for performance
-- ============================================================
CREATE INDEX idx_ud_user        ON user_data(user_id);
CREATE INDEX idx_ud_field       ON user_data(field_id);
CREATE INDEX idx_tfm_template   ON template_field_mappings(template_id, display_order);
CREATE INDEX idx_tfm_maptype    ON template_field_mappings(mapping_type);
CREATE INDEX idx_tgl_user_tmpl  ON template_generated_log(user_id, template_id);


-- ============================================================
-- ============================================================
--  SAMPLE DATA
-- ============================================================
-- ============================================================

-- ------------------------------------------------------------
-- Users
-- ------------------------------------------------------------
INSERT INTO users (username, email, role) VALUES
  ('rahul_sharma',    'rahul@college.edu',   'student'),
  ('priya_nair',      'priya@college.edu',   'student'),
  ('dr_mehta',        'mehta@college.edu',   'faculty'),
  ('club_secretary',  'secretary@club.edu',  'staff'),
  ('admin_root',      'admin@college.edu',   'admin');

-- ------------------------------------------------------------
-- Field Definitions (Graph Nodes)
-- ------------------------------------------------------------
INSERT INTO field_definitions (field_key, field_label, data_type, is_required, description) VALUES
  ('full_name',           'Full Name',               'text',    1, 'Complete legal name'),
  ('date_of_birth',       'Date of Birth',           'date',    1, 'DD/MM/YYYY'),
  ('gender',              'Gender',                  'enum',    1, 'M/F/Other'),
  ('email',               'Email Address',           'email',   1, 'Institutional email'),
  ('phone',               'Phone Number',            'phone',   0, '10-digit mobile'),
  ('roll_number',         'Roll Number',             'text',    1, 'Unique enrollment identifier'),
  ('department',          'Department',              'text',    1, 'e.g. Computer Science'),
  ('year_of_study',       'Year of Study',           'number',  1, '1 to 4'),
  ('cgpa',                'CGPA',                    'number',  0, 'Cumulative GPA out of 10'),
  ('address',             'Permanent Address',       'text',    0, 'Full mailing address'),
  ('club_name',           'Club Name',               'text',    0, 'Name of the club'),
  ('club_position',       'Position in Club',        'text',    0, 'e.g. Secretary, Treasurer'),
  ('joining_date',        'Date of Joining',         'date',    0, 'When member joined club'),
  ('naac_criteria',       'NAAC Criteria No.',       'text',    0, 'Applicable NAAC criterion'),
  ('ugc_scheme_code',     'UGC Scheme Code',         'text',    0, 'Relevant UGC scheme identifier'),
  ('research_papers',     'Research Papers Published','number', 0, 'Count of published papers'),
  ('question_text',       'Question Text',           'text',    0, 'Actual exam question'),
  ('question_marks',      'Marks',                   'number',  0, 'Marks allotted to question'),
  ('photo_url',           'Passport Photo URL',      'text',    0, 'Link to uploaded photo'),
  ('aadhar_last4',        'Aadhaar (Last 4 digits)', 'number',  0, 'For identity verification');

-- Enum options for gender
INSERT INTO field_enum_options (field_id, option_value, option_label, sort_order)
SELECT field_id, 'M', 'Male',   1 FROM field_definitions WHERE field_key = 'gender' UNION ALL
SELECT field_id, 'F', 'Female', 2 FROM field_definitions WHERE field_key = 'gender' UNION ALL
SELECT field_id, 'O', 'Other',  3 FROM field_definitions WHERE field_key = 'gender';

-- ------------------------------------------------------------
-- Templates
-- ------------------------------------------------------------
INSERT INTO templates (template_name, template_type, target_role, version, description) VALUES
  ('Student Profile Card',        'profile',       'student', 1, 'Standard student identity profile'),
  ('Club Secretary Profile',      'profile',       'staff',   1, 'Club office-bearer profile'),
  ('UGC Annual Report Form',      'form',          'faculty', 1, 'UGC annual performance form'),
  ('NAAC Self-Study Report',      'report',        'admin',   1, 'NAAC SSR data collection'),
  ('End Semester Question Paper', 'question_paper','faculty', 1, 'Randomized question paper template');

-- ------------------------------------------------------------
-- Template Sections
-- ------------------------------------------------------------
INSERT INTO template_sections (template_id, section_name, display_order) VALUES
  -- Student Profile
  (1, 'Personal Information',  1),
  (1, 'Academic Details',      2),
  (1, 'Contact Information',   3),
  -- Club Secretary
  (2, 'Member Details',        1),
  (2, 'Club Information',      2),
  -- UGC Form
  (3, 'Faculty Details',       1),
  (3, 'Research & Output',     2),
  -- NAAC Report
  (4, 'Institutional Data',    1),
  (4, 'Criteria Mapping',      2),
  -- Question Paper
  (5, 'Section A',             1),
  (5, 'Section B',             2);

-- ------------------------------------------------------------
-- Template-Field Mappings (Graph Edges)
-- Student Profile (template_id = 1)
-- ------------------------------------------------------------
INSERT INTO template_field_mappings
  (template_id, section_id, field_id, label_override, display_order, mapping_type, is_required, is_visible, transform_hint)
VALUES
  -- Personal Information section (section_id = 1)
  (1, 1, (SELECT field_id FROM field_definitions WHERE field_key='full_name'),     NULL,               1,  'exact',       1, 1, 'uppercase'),
  (1, 1, (SELECT field_id FROM field_definitions WHERE field_key='date_of_birth'), NULL,               2,  'exact',       1, 1, 'date_format:DD/MM/YYYY'),
  (1, 1, (SELECT field_id FROM field_definitions WHERE field_key='gender'),        NULL,               3,  'exact',       1, 1, NULL),
  (1, 1, (SELECT field_id FROM field_definitions WHERE field_key='photo_url'),     'Photo',            4,  'exact',       0, 1, NULL),
  -- Academic Details section (section_id = 2)
  (1, 2, (SELECT field_id FROM field_definitions WHERE field_key='roll_number'),   'Enrollment No.',   5,  'reordered',   1, 1, NULL),
  (1, 2, (SELECT field_id FROM field_definitions WHERE field_key='department'),    NULL,               6,  'exact',       1, 1, NULL),
  (1, 2, (SELECT field_id FROM field_definitions WHERE field_key='year_of_study'), 'Current Year',     7,  'exact',       1, 1, NULL),
  (1, 2, (SELECT field_id FROM field_definitions WHERE field_key='cgpa'),          NULL,               8,  'exact',       0, 1, NULL),
  -- Contact Information section (section_id = 3)
  (1, 3, (SELECT field_id FROM field_definitions WHERE field_key='email'),         NULL,               9,  'exact',       1, 1, NULL),
  (1, 3, (SELECT field_id FROM field_definitions WHERE field_key='phone'),         NULL,               10, 'exact',       0, 1, NULL),
  (1, 3, (SELECT field_id FROM field_definitions WHERE field_key='address'),       NULL,               11, 'exact',       0, 1, NULL);

-- Club Secretary Profile (template_id = 2)
INSERT INTO template_field_mappings
  (template_id, section_id, field_id, label_override, display_order, mapping_type, is_required, is_visible, transform_hint)
VALUES
  (2, 4, (SELECT field_id FROM field_definitions WHERE field_key='full_name'),    'Member Name',      1, 'exact',       1, 1, NULL),
  (2, 4, (SELECT field_id FROM field_definitions WHERE field_key='roll_number'),  'Student ID',       2, 'reordered',   1, 1, NULL),
  (2, 4, (SELECT field_id FROM field_definitions WHERE field_key='email'),        NULL,               3, 'exact',       1, 1, NULL),
  (2, 4, (SELECT field_id FROM field_definitions WHERE field_key='phone'),        'Contact No.',      4, 'exact',       1, 1, NULL),
  (2, 5, (SELECT field_id FROM field_definitions WHERE field_key='club_name'),    NULL,               5, 'exact',       1, 1, NULL),
  (2, 5, (SELECT field_id FROM field_definitions WHERE field_key='club_position'),'Designation',      6, 'approximate', 1, 1, NULL),
  (2, 5, (SELECT field_id FROM field_definitions WHERE field_key='joining_date'), NULL,               7, 'exact',       1, 1, 'date_format:DD-MM-YYYY'),
  (2, 5, (SELECT field_id FROM field_definitions WHERE field_key='department'),   NULL,               8, 'exact',       0, 1, NULL);

-- UGC Annual Report (template_id = 3)
INSERT INTO template_field_mappings
  (template_id, section_id, field_id, label_override, display_order, mapping_type, is_required, is_visible, transform_hint)
VALUES
  (3, 6, (SELECT field_id FROM field_definitions WHERE field_key='full_name'),        'Faculty Name',       1, 'exact',      1, 1, NULL),
  (3, 6, (SELECT field_id FROM field_definitions WHERE field_key='department'),        'Department/School',  2, 'exact',      1, 1, NULL),
  (3, 6, (SELECT field_id FROM field_definitions WHERE field_key='ugc_scheme_code'),   NULL,                 3, 'exact',      1, 1, NULL),
  (3, 7, (SELECT field_id FROM field_definitions WHERE field_key='research_papers'),   'Publications (Nos)', 4, 'exact',      0, 1, NULL),
  (3, 7, (SELECT field_id FROM field_definitions WHERE field_key='cgpa'),              'Student CGPA Avg',   5, 'approximate', 0, 1, NULL);

-- NAAC Self-Study (template_id = 4) — note reuse of same fields with different labels/order
INSERT INTO template_field_mappings
  (template_id, section_id, field_id, label_override, display_order, mapping_type, is_required, is_visible, transform_hint)
VALUES
  (4, 8, (SELECT field_id FROM field_definitions WHERE field_key='full_name'),      'Coordinator Name',  1, 'exact',      1, 1, NULL),
  (4, 8, (SELECT field_id FROM field_definitions WHERE field_key='department'),      'Unit / Dept',       2, 'reordered',  1, 1, NULL),
  (4, 9, (SELECT field_id FROM field_definitions WHERE field_key='naac_criteria'),   NULL,                3, 'exact',      1, 1, NULL),
  (4, 9, (SELECT field_id FROM field_definitions WHERE field_key='research_papers'), 'Total Publications',4, 'exact',      0, 1, NULL),
  (4, 9, (SELECT field_id FROM field_definitions WHERE field_key='cgpa'),            'Avg Student CGPA',  5, 'approximate', 0, 1, NULL);

-- ------------------------------------------------------------
-- User Data (centralized, stored ONCE)
-- SHA2 checksum = SHA2(CONCAT(user_id, field_id, field_value), 256)
-- We store pre-computed values here for the INSERT.
-- In production, compute via: SHA2(CONCAT(user_id, field_id, value), 256)
-- ------------------------------------------------------------
INSERT INTO user_data (user_id, field_id, field_value, checksum)
SELECT
  1,
  fd.field_id,
  v.val,
  SHA2(CONCAT(1, fd.field_id, v.val), 256)
FROM field_definitions fd
JOIN (VALUES
  ROW('full_name',       'Rahul Sharma'),
  ROW('date_of_birth',   '1999-08-15'),
  ROW('gender',          'M'),
  ROW('email',           'rahul@college.edu'),
  ROW('phone',           '9876543210'),
  ROW('roll_number',     'CS2021042'),
  ROW('department',      'Computer Science'),
  ROW('year_of_study',   '3'),
  ROW('cgpa',            '8.75'),
  ROW('address',         '12, MG Road, Pune, Maharashtra 411001'),
  ROW('aadhar_last4',    '4782'),
  ROW('photo_url',       'https://cdn.college.edu/photos/cs2021042.jpg')
) AS v(fkey, val) ON fd.field_key = v.fkey;

-- Priya Nair (user_id = 2)
INSERT INTO user_data (user_id, field_id, field_value, checksum)
SELECT
  2,
  fd.field_id,
  v.val,
  SHA2(CONCAT(2, fd.field_id, v.val), 256)
FROM field_definitions fd
JOIN (VALUES
  ROW('full_name',       'Priya Nair'),
  ROW('date_of_birth',   '2000-03-22'),
  ROW('gender',          'F'),
  ROW('email',           'priya@college.edu'),
  ROW('phone',           '9123456780'),
  ROW('roll_number',     'CS2022011'),
  ROW('department',      'Computer Science'),
  ROW('year_of_study',   '2'),
  ROW('cgpa',            '9.10'),
  ROW('club_name',       'Coding Club'),
  ROW('club_position',   'Secretary'),
  ROW('joining_date',    '2022-08-01')
) AS v(fkey, val) ON fd.field_key = v.fkey;

-- Dr. Mehta (user_id = 3)
INSERT INTO user_data (user_id, field_id, field_value, checksum)
SELECT
  3,
  fd.field_id,
  v.val,
  SHA2(CONCAT(3, fd.field_id, v.val), 256)
FROM field_definitions fd
JOIN (VALUES
  ROW('full_name',         'Dr. Arvind Mehta'),
  ROW('email',             'mehta@college.edu'),
  ROW('department',        'Computer Science'),
  ROW('ugc_scheme_code',   'UGC-CAS-2023'),
  ROW('research_papers',   '12'),
  ROW('naac_criteria',     'Criterion III - Research & Innovation')
) AS v(fkey, val) ON fd.field_key = v.fkey;


-- ============================================================
-- ============================================================
--  EXAMPLE QUERIES
-- ============================================================
-- ============================================================

-- ============================================================
-- QUERY 1: Generate the "Student Profile Card" for a given user
-- Shows field label (with override), value, section, and order.
-- Replace @user_id and @template_name as needed.
-- ============================================================

/*
SET @user_id      = 1;
SET @template_name = 'Student Profile Card';

SELECT
  t.template_name,
  t.template_type,
  ts.section_name,
  COALESCE(tfm.label_override, fd.field_label)  AS display_label,
  fd.field_key,
  fd.data_type,
  ud.field_value,
  tfm.display_order,
  tfm.mapping_type,
  tfm.transform_hint,
  -- Integrity check: recompute hash on the fly and compare
  CASE
    WHEN ud.checksum = SHA2(CONCAT(ud.user_id, ud.field_id, ud.field_value), 256)
    THEN 'OK'
    ELSE 'TAMPERED'
  END AS integrity_status
FROM templates t
JOIN template_field_mappings tfm ON tfm.template_id = t.template_id
JOIN field_definitions       fd  ON fd.field_id      = tfm.field_id
LEFT JOIN template_sections  ts  ON ts.section_id    = tfm.section_id
LEFT JOIN user_data          ud  ON ud.field_id       = fd.field_id
                                AND ud.user_id        = @user_id
WHERE t.template_name = @template_name
  AND t.is_active     = 1
  AND tfm.is_visible  = 1
ORDER BY ts.display_order, tfm.display_order;
*/


-- ============================================================
-- QUERY 2: Show how the same field maps differently across templates
-- Field "cgpa" appears in Student Profile, UGC Form, and NAAC with
-- different labels, orders, and mapping_type values.
-- ============================================================

/*
SELECT
  fd.field_key,
  t.template_name,
  t.template_type,
  COALESCE(tfm.label_override, fd.field_label) AS label_in_template,
  tfm.display_order,
  tfm.mapping_type,
  tfm.transform_hint,
  tfm.is_required
FROM field_definitions fd
JOIN template_field_mappings tfm ON tfm.field_id    = fd.field_id
JOIN templates               t   ON t.template_id   = tfm.template_id
WHERE fd.field_key = 'cgpa'
ORDER BY t.template_id;
*/


-- ============================================================
-- QUERY 3: Graph edge view — all field-to-template connections
-- with mapping type (exact / approximate / reordered)
-- ============================================================

/*
SELECT
  fd.field_key                                   AS source_node,
  t.template_name                                AS target_node,
  tfm.mapping_type                               AS edge_type,
  COALESCE(tfm.label_override, fd.field_label)   AS edge_label,
  tfm.display_order                              AS edge_weight
FROM template_field_mappings tfm
JOIN field_definitions fd ON fd.field_id    = tfm.field_id
JOIN templates         t  ON t.template_id  = tfm.template_id
ORDER BY t.template_id, tfm.display_order;
*/


-- ============================================================
-- QUERY 4: Verify data integrity for all user data rows
-- Any row with integrity_status = 'TAMPERED' is corrupted.
-- ============================================================

/*
SELECT
  u.username,
  fd.field_key,
  ud.field_value,
  ud.checksum                                              AS stored_hash,
  SHA2(CONCAT(ud.user_id, ud.field_id, ud.field_value), 256) AS computed_hash,
  CASE
    WHEN ud.checksum = SHA2(CONCAT(ud.user_id, ud.field_id, ud.field_value), 256)
    THEN 'OK'
    ELSE '⚠ TAMPERED'
  END AS integrity_status
FROM user_data ud
JOIN users           u  ON u.user_id  = ud.user_id
JOIN field_definitions fd ON fd.field_id = ud.field_id
ORDER BY u.user_id, fd.field_key;
*/


-- ============================================================
-- QUERY 5: Log a template generation event (audit trail)
-- In Node.js, call this after rendering a template for a user.
-- snapshot_hash = SHA2 of the full JSON output of the template.
-- ============================================================

/*
INSERT INTO template_generated_log (user_id, template_id, generated_by, snapshot_hash)
VALUES (
  1,                    -- student user_id
  1,                    -- Student Profile Card template_id
  5,                    -- admin who generated it
  SHA2('{"full_name":"Rahul Sharma","roll_number":"CS2021042",...}', 256)
);
*/


-- ============================================================
-- QUERY 6: Club Secretary Profile — full template for Priya
-- ============================================================

/*
SET @user_id       = 2;
SET @template_name = 'Club Secretary Profile';

SELECT
  COALESCE(tfm.label_override, fd.field_label) AS display_label,
  fd.field_key,
  fd.data_type,
  ud.field_value,
  tfm.mapping_type,
  tfm.display_order
FROM templates t
JOIN template_field_mappings tfm ON tfm.template_id = t.template_id
JOIN field_definitions       fd  ON fd.field_id      = tfm.field_id
LEFT JOIN user_data          ud  ON ud.field_id       = fd.field_id
                                AND ud.user_id        = @user_id
WHERE t.template_name = @template_name
  AND tfm.is_visible  = 1
ORDER BY tfm.display_order;
*/
