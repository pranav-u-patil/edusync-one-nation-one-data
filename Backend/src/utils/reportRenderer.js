const fs = require("fs");
const path = require("path");
const ejs = require("ejs");
const puppeteer = require("puppeteer");

const renderHtml = async (templatePath, locals) => {
	// Templates are rendered here.
	return ejs.renderFile(templatePath, locals);
};

const generatePdfFromHtml = async (html, outputPath) => {
	const browser = await puppeteer.launch({ headless: "new" });
	const page = await browser.newPage();
	await page.setContent(html, { waitUntil: "networkidle0" });
	await page.pdf({ path: outputPath, format: "A4", printBackground: true });
	await browser.close();
	return outputPath;
};

const ensureDirectory = (dirPath) => {
	if (!fs.existsSync(dirPath)) {
		fs.mkdirSync(dirPath, { recursive: true });
	}
};

const resolveReportPath = (...segments) => path.join(__dirname, ...segments);

module.exports = { renderHtml, generatePdfFromHtml, ensureDirectory, resolveReportPath };