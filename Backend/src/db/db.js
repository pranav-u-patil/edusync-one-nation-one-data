const mysql = require("mysql2/promise");

const pool = mysql.createPool({
	host: process.env.MYSQL_HOST || "127.0.0.1",
	user: process.env.MYSQL_USER || "root",
	password: process.env.MYSQL_PASSWORD || "",
	database: process.env.MYSQL_DATABASE || "one_nation_one_data",
	port: Number(process.env.MYSQL_PORT || 3306),
	waitForConnections: true,
	connectionLimit: Number(process.env.MYSQL_CONNECTION_LIMIT || 10),
	queueLimit: 0,
});

const connectDB = async () => {
	const connection = await pool.getConnection();

	await connection.query(`
		CREATE TABLE IF NOT EXISTS qa_data (
			id INT AUTO_INCREMENT PRIMARY KEY,
			original_question TEXT NOT NULL,
			normalized_question TEXT NOT NULL UNIQUE,
			answer TEXT NOT NULL,
			source ENUM('csv', 'admin', 'ai') NOT NULL DEFAULT 'csv',
			confidence FLOAT NOT NULL DEFAULT 1,
			is_active BOOLEAN NOT NULL DEFAULT TRUE,
			created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
		)
	`);

	await connection.query(`
		CREATE TABLE IF NOT EXISTS pending_questions (
			id INT AUTO_INCREMENT PRIMARY KEY,
			question TEXT NOT NULL,
			normalized_question TEXT NOT NULL UNIQUE,
			created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
		)
	`);

	connection.release();
	console.log("MySQL connected");
};

const findExact = async (normalizedQuestion) => {
	if (!normalizedQuestion) {
		return null;
	}

	const [rows] = await pool.execute(
		"SELECT id, original_question, normalized_question, answer, source, confidence, created_at FROM qa_data WHERE normalized_question = ? AND is_active = 1 LIMIT 1",
		[normalizedQuestion]
	);

	return rows[0] || null;
};

const getAllQA = async () => {
	const [rows] = await pool.execute(
		"SELECT id, original_question, normalized_question, answer, source, confidence, created_at FROM qa_data WHERE is_active = 1 ORDER BY id ASC"
	);

	return rows;
};

const insertQA = async (
	question,
	normalizedQuestion,
	answer,
	source = "csv",
	confidence = 1
) => {
	if (!question || !normalizedQuestion || !answer) {
		throw new Error("question, normalized_question, and answer are required");
	}

	const [result] = await pool.execute(
		`INSERT INTO qa_data
			(original_question, normalized_question, answer, source, confidence, is_active, created_at)
		 VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
		 ON DUPLICATE KEY UPDATE
			original_question = VALUES(original_question),
			answer = VALUES(answer),
			source = VALUES(source),
			confidence = VALUES(confidence),
			is_active = 1` ,
		[question, normalizedQuestion, answer, source, confidence]
	);

	return result;
};

const insertPending = async (question, normalizedQuestion) => {
	if (!question || !normalizedQuestion) {
		throw new Error("question and normalized_question are required");
	}

	const [result] = await pool.execute(
		`INSERT INTO pending_questions
			(question, normalized_question, created_at)
		 VALUES (?, ?, CURRENT_TIMESTAMP)
		 ON DUPLICATE KEY UPDATE
			question = VALUES(question)` ,
		[question, normalizedQuestion]
	);

	return result;
};

const deletePending = async (normalizedQuestion) => {
	if (!normalizedQuestion) {
		return { affectedRows: 0 };
	}

	const [result] = await pool.execute(
		"DELETE FROM pending_questions WHERE normalized_question = ?",
		[normalizedQuestion]
	);

	return result;
};

const deactivateQA = async (id) => {
	const [result] = await pool.execute(
		"UPDATE qa_data SET is_active = 0 WHERE id = ?",
		[id]
	);
	return result;
};

module.exports = {
	pool,
	connectDB,
	findExact,
	getAllQA,
	insertQA,
	insertPending,
	deletePending,
	deactivateQA,
};
