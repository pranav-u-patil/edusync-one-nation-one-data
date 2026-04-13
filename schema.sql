-- ============================================================
--  QA Form Filling System — Complete MySQL Schema
--  Run this once to initialize your database
-- ============================================================

CREATE DATABASE IF NOT EXISTS qa_form_system
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE qa_form_system;

-- ------------------------------------------------------------
-- 1. qa_store  — master knowledge base (CSV imports + manual)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS qa_store (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    raw_question    TEXT         NOT NULL COMMENT 'Original question text as uploaded',
    norm_question   VARCHAR(500) NOT NULL COMMENT 'Normalised key used for matching',
    answer          TEXT         NOT NULL,
    source          ENUM('csv','manual','learned') NOT NULL DEFAULT 'csv',
    confidence      FLOAT        NOT NULL DEFAULT 1.0 COMMENT '0-1, learned entries may be < 1',
    created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uq_norm_question (norm_question),
    FULLTEXT KEY ft_raw_question (raw_question)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 2. csv_imports  — audit trail of every CSV upload
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS csv_imports (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    filename        VARCHAR(255) NOT NULL,
    row_count       INT UNSIGNED NOT NULL DEFAULT 0,
    imported_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    imported_by     VARCHAR(100)          DEFAULT 'admin',
    notes           TEXT
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 3. form_sessions — one row per PDF uploaded for processing
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS form_sessions (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    session_uuid    CHAR(36)     NOT NULL COMMENT 'UUID for the upload session',
    filename        VARCHAR(255) NOT NULL,
    total_questions INT UNSIGNED NOT NULL DEFAULT 0,
    matched         INT UNSIGNED NOT NULL DEFAULT 0,
    pending         INT UNSIGNED NOT NULL DEFAULT 0,
    status          ENUM('processing','partial','complete') NOT NULL DEFAULT 'processing',
    created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uq_session_uuid (session_uuid)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 4. form_questions — every question extracted from a PDF form
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS form_questions (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    session_id      INT UNSIGNED NOT NULL,
    raw_question    TEXT         NOT NULL,
    norm_question   VARCHAR(500) NOT NULL,
    matched_qa_id   INT UNSIGNED          DEFAULT NULL COMMENT 'FK → qa_store.id if matched',
    match_type      ENUM('exact','similarity','manual','none') NOT NULL DEFAULT 'none',
    similarity_score FLOAT                DEFAULT NULL COMMENT 'Cosine sim score if similarity match',
    filled_answer   TEXT                  DEFAULT NULL,
    status          ENUM('filled','pending','skipped') NOT NULL DEFAULT 'pending',
    created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_session   (session_id),
    INDEX idx_status    (status),
    CONSTRAINT fk_fq_session FOREIGN KEY (session_id)  REFERENCES form_sessions(id) ON DELETE CASCADE,
    CONSTRAINT fk_fq_qa     FOREIGN KEY (matched_qa_id) REFERENCES qa_store(id)     ON DELETE SET NULL
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 5. pending_answers — admin resolves unanswered questions here
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pending_answers (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    form_question_id INT UNSIGNED NOT NULL,
    suggested_answer TEXT                  DEFAULT NULL COMMENT 'Admin-provided answer',
    resolved        TINYINT(1)   NOT NULL DEFAULT 0,
    resolved_at     DATETIME              DEFAULT NULL,
    resolved_by     VARCHAR(100)          DEFAULT NULL,
    created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_resolved (resolved),
    CONSTRAINT fk_pa_fq FOREIGN KEY (form_question_id) REFERENCES form_questions(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 6. match_log — full audit log of every match attempt
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS match_log (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    form_question_id INT UNSIGNED NOT NULL,
    attempt_type    ENUM('exact','similarity','manual') NOT NULL,
    matched_qa_id   INT UNSIGNED          DEFAULT NULL,
    score           FLOAT                 DEFAULT NULL,
    success         TINYINT(1)   NOT NULL DEFAULT 0,
    attempted_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_fq    (form_question_id),
    CONSTRAINT fk_ml_fq FOREIGN KEY (form_question_id) REFERENCES form_questions(id) ON DELETE CASCADE,
    CONSTRAINT fk_ml_qa FOREIGN KEY (matched_qa_id)    REFERENCES qa_store(id)       ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================
--  Stored Procedures
-- ============================================================

DELIMITER $$

-- SP 1: Upsert a QA pair (insert or update answer if norm_question already exists)
CREATE PROCEDURE IF NOT EXISTS upsert_qa (
    IN p_raw_question   TEXT,
    IN p_norm_question  VARCHAR(500),
    IN p_answer         TEXT,
    IN p_source         VARCHAR(20),
    IN p_confidence     FLOAT
)
BEGIN
    INSERT INTO qa_store (raw_question, norm_question, answer, source, confidence)
    VALUES (p_raw_question, p_norm_question, p_answer, p_source, p_confidence)
    ON DUPLICATE KEY UPDATE
        answer      = VALUES(answer),
        source      = VALUES(source),
        confidence  = VALUES(confidence),
        updated_at  = CURRENT_TIMESTAMP;
END$$

-- SP 2: Mark a pending answer as resolved, update form_questions & qa_store
CREATE PROCEDURE IF NOT EXISTS resolve_pending (
    IN p_pending_id     INT UNSIGNED,
    IN p_answer         TEXT,
    IN p_resolved_by    VARCHAR(100)
)
BEGIN
    DECLARE v_fq_id     INT UNSIGNED;
    DECLARE v_raw_q     TEXT;
    DECLARE v_norm_q    VARCHAR(500);

    -- Fetch form_question details
    SELECT pa.form_question_id, fq.raw_question, fq.norm_question
    INTO   v_fq_id, v_raw_q, v_norm_q
    FROM   pending_answers pa
    JOIN   form_questions fq ON fq.id = pa.form_question_id
    WHERE  pa.id = p_pending_id;

    -- Upsert into master qa_store (learned)
    CALL upsert_qa(v_raw_q, v_norm_q, p_answer, 'learned', 0.9);

    -- Update form_question
    UPDATE form_questions
    SET    filled_answer = p_answer,
           match_type    = 'manual',
           matched_qa_id = (SELECT id FROM qa_store WHERE norm_question = v_norm_q LIMIT 1),
           status        = 'filled'
    WHERE  id = v_fq_id;

    -- Mark pending_answers resolved
    UPDATE pending_answers
    SET    suggested_answer = p_answer,
           resolved         = 1,
           resolved_at      = CURRENT_TIMESTAMP,
           resolved_by      = p_resolved_by
    WHERE  id = p_pending_id;
END$$

-- SP 3: Session summary stats
CREATE PROCEDURE IF NOT EXISTS get_session_stats (IN p_session_uuid CHAR(36))
BEGIN
    SELECT
        fs.session_uuid,
        fs.filename,
        fs.total_questions,
        fs.matched,
        fs.pending,
        fs.status,
        COUNT(CASE WHEN fq.status = 'filled'   THEN 1 END) AS filled_count,
        COUNT(CASE WHEN fq.status = 'pending'  THEN 1 END) AS pending_count,
        COUNT(CASE WHEN fq.match_type = 'exact'      THEN 1 END) AS exact_matches,
        COUNT(CASE WHEN fq.match_type = 'similarity' THEN 1 END) AS similarity_matches,
        COUNT(CASE WHEN fq.match_type = 'manual'     THEN 1 END) AS manual_matches
    FROM form_sessions fs
    LEFT JOIN form_questions fq ON fq.session_id = fs.id
    WHERE fs.session_uuid = p_session_uuid
    GROUP BY fs.id;
END$$

DELIMITER ;

-- ============================================================
--  Views
-- ============================================================

-- V1: All unresolved pending questions (admin dashboard feed)
CREATE OR REPLACE VIEW v_pending_questions AS
SELECT
    pa.id                           AS pending_id,
    fs.session_uuid,
    fs.filename,
    fq.id                           AS form_question_id,
    fq.raw_question,
    fq.norm_question,
    pa.created_at                   AS pending_since
FROM pending_answers pa
JOIN form_questions fq ON fq.id  = pa.form_question_id
JOIN form_sessions  fs ON fs.id  = fq.session_id
WHERE pa.resolved = 0
ORDER BY pa.created_at;

-- V2: Full filled result for a session (used to build JSON output)
CREATE OR REPLACE VIEW v_session_results AS
SELECT
    fs.session_uuid,
    fs.filename,
    fq.raw_question,
    fq.filled_answer,
    fq.match_type,
    fq.similarity_score,
    fq.status
FROM form_sessions  fs
JOIN form_questions fq ON fq.session_id = fs.id
ORDER BY fs.id, fq.id;

-- V3: QA store with usage frequency
CREATE OR REPLACE VIEW v_qa_usage AS
SELECT
    qs.id,
    qs.raw_question,
    qs.answer,
    qs.source,
    qs.confidence,
    COUNT(fq.id)    AS times_used,
    MAX(fq.created_at) AS last_used
FROM qa_store qs
LEFT JOIN form_questions fq ON fq.matched_qa_id = qs.id
GROUP BY qs.id
ORDER BY times_used DESC;