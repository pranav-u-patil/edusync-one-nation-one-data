const fs = require("fs");
const csvParser = require("csv-parser");

const parseUploadCsv = (filePath) => {
	return new Promise((resolve, reject) => {
		const rows = [];
		const headerSet = new Set();

		fs.createReadStream(filePath)
			.pipe(csvParser())
			.on("data", (row) => {
				const normalizedRow = {};
				for (const [key, value] of Object.entries(row)) {
					headerSet.add(key);
					normalizedRow[key] = value;
				}
				rows.push(normalizedRow);
			})
			.on("end", () => {
				const headers = Array.from(headerSet);
				const normalizedHeaders = headers.map((header) => String(header).trim().toLowerCase());
				const looksVertical =
					headers.length === 2 &&
					((normalizedHeaders.some((header) => header.includes("field")) && normalizedHeaders.some((header) => header.includes("value"))) ||
						(normalizedHeaders.some((header) => header.includes("question")) && normalizedHeaders.some((header) => header.includes("answer"))));

				resolve({
					headers,
					rows,
					format: looksVertical ? "vertical" : "wide",
				});
			})
			.on("error", reject);
	});
};

module.exports = { parseUploadCsv };