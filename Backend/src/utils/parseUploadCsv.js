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
				resolve({ headers: Array.from(headerSet), rows });
			})
			.on("error", reject);
	});
};

module.exports = { parseUploadCsv };