const fs = require("fs");
const path = require("path");
const ejs = require("ejs");
const puppeteer = require("puppeteer");
const {
  PDFDocument,
  PDFTextField,
  PDFCheckBox,
  PDFDropdown,
  PDFOptionList,
  PDFRadioGroup,
} = require("pdf-lib");
const { parseCSV } = require("../utils/parseCSV");
const { normalize } = require("../utils/normalize");
const { extractTextFromPDF, extractQuestions } = require("../utils/extractText");
const { similarityMatch } = require("../utils/similarityMatch");
const { aiFallback } = require("../utils/aiFallback");
const {
  findExact,
  getAllQA,
  insertQA,
  insertPending,
  deletePending,
  deactivateQA,
} = require("../db/db");

const SIMILARITY_THRESHOLD = Number(process.env.SIMILARITY_THRESHOLD || 0.7);
const AI_THRESHOLD = 0.6;
const USE_AI = String(process.env.USE_AI || "false").toLowerCase() === "true";

const safeDelete = (filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

const buildMatchResult = (question, answer, method, confidence) => ({
  question,
  answer,
  method,
  confidence,
});

const isTruthyAnswer = (value) => {
  if (value === undefined || value === null) {
    return false;
  }

  const normalizedValue = String(value).trim().toLowerCase();

  return ["true", "yes", "y", "1", "checked", "on"].includes(normalizedValue);
};

const findBestAnswerForField = (fieldName, normalizedAnswers) => {
  const normalizedFieldName = normalize(fieldName);

  const exact = normalizedAnswers.find(
    (item) => item.norm_question === normalizedFieldName
  );

  if (exact) {
    return exact.answer;
  }

  const similarity = similarityMatch(normalizedFieldName, normalizedAnswers);
  if (similarity && similarity.score >= SIMILARITY_THRESHOLD) {
    return similarity.record.answer;
  }

  return null;
};

const fillPdfFormFields = (form, dataMap = {}) => {
  const rawEntries = Object.entries(dataMap).filter(
    ([key, value]) => key && value !== undefined && value !== null && String(value).trim() !== ""
  );

  const normalizedAnswers = rawEntries.map(([question, answer]) => ({
    original_question: question,
    norm_question: normalize(question),
    answer: String(answer).trim(),
  }));

  const fields = form.getFields();
  let filledCount = 0;

  for (const field of fields) {
    const fieldName = field.getName();
    const directValue = dataMap[fieldName];
    const answerValue =
      directValue !== undefined && directValue !== null && String(directValue).trim() !== ""
        ? String(directValue).trim()
        : findBestAnswerForField(fieldName, normalizedAnswers);

    if (!answerValue) {
      continue;
    }

    try {
      if (field instanceof PDFTextField) {
        field.setText(answerValue);
        filledCount += 1;
      } else if (field instanceof PDFCheckBox) {
        if (isTruthyAnswer(answerValue)) {
          field.check();
        } else {
          field.uncheck();
        }
        filledCount += 1;
      } else if (field instanceof PDFDropdown || field instanceof PDFOptionList) {
        field.select(answerValue);
        filledCount += 1;
      } else if (field instanceof PDFRadioGroup) {
        field.select(answerValue);
        filledCount += 1;
      }
    } catch (error) {
      // Keep processing other fields when one field has incompatible option values.
      continue;
    }
  }

  return {
    totalFields: fields.length,
    filledFields: filledCount,
  };
};

const matchQuestionWithData = async (question, qaData = null) => {
  const normalizedQuestion = normalize(question);
  const exactMatch = await findExact(normalizedQuestion);

  if (exactMatch) {
    await deletePending(normalizedQuestion);

    return buildMatchResult(question, exactMatch.answer, "exact", 1);
  }

  const resolvedQAData = qaData || (await getAllQA());
  const similarity = similarityMatch(normalizedQuestion, resolvedQAData);
  const similarityScore = similarity?.score ?? 0;

  if (similarity && similarityScore > SIMILARITY_THRESHOLD) {
    await deletePending(normalizedQuestion);

    return buildMatchResult(
      question,
      similarity.record.answer,
      "similarity",
      similarityScore
    );
  }

  if (USE_AI && similarityScore < AI_THRESHOLD) {
    const aiAnswer = await aiFallback(question, resolvedQAData);

    if (aiAnswer) {
      await insertQA(question, normalizedQuestion, aiAnswer, "ai", 0.6);
      await deletePending(normalizedQuestion);

      return buildMatchResult(question, aiAnswer, "ai", 0.6);
    }
  }

  await insertPending(question, normalizedQuestion);

  return buildMatchResult(question, null, "admin_required", 0);
};

const matchQuestion = async (question) => {
  return matchQuestionWithData(question);
};

const uploadCSV = async (req, res) => {
  const uploadedPath = req.file?.path;

  try {
    if (!req.file) {
      return res.status(400).json({ error: "CSV file is required" });
    }

    const parsedRows = await parseCSV(req.file.path);

    if (!parsedRows.length) {
      return res.status(400).json({ error: "No valid Question-Answer rows found" });
    }

    let storedCount = 0;

    for (const row of parsedRows) {
      const normalizedQuestion = normalize(row.question);

      await insertQA(row.question, normalizedQuestion, row.answer, "csv", 1);
      await deletePending(normalizedQuestion);
      storedCount += 1;
    }

    return res.json({
      message: "CSV mappings stored successfully",
      totalRows: parsedRows.length,
      stored: storedCount,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  } finally {
    safeDelete(uploadedPath);
  }
};

const processPDF = async (req, res) => {
  const uploadedPath = req.file?.path;

  try {
    if (!req.file) {
      return res.status(400).json({ error: "PDF file is required" });
    }

    const rawText = await extractTextFromPDF(req.file.path);
    const questions = extractQuestions(rawText);

    if (!questions.length) {
      return res
        .status(400)
        .json({ error: "No questions extracted from PDF form" });
    }

    const qaData = await getAllQA();
    const results = [];

    for (const question of questions) {
      const answerResult = await matchQuestionWithData(question, qaData);
      results.push(answerResult);
    }

    return res.json(results);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  } finally {
    safeDelete(uploadedPath);
  }
};

const learnMappings = async (req, res) => {
  try {
    const { mappings } = req.body;

    if (!Array.isArray(mappings) || mappings.length === 0) {
      return res.status(400).json({ error: "mappings array is required" });
    }

    const validMappings = mappings.filter((item) => item.question && item.answer);

    if (!validMappings.length) {
      return res.status(400).json({ error: "No valid mappings found" });
    }

    let storedCount = 0;

    for (const item of validMappings) {
      const normalizedQuestion = normalize(item.question);

      await insertQA(item.question, normalizedQuestion, item.answer, "admin", 1);
      await deletePending(normalizedQuestion);
      storedCount += 1;
    }

    return res.json({
      message: "New mappings learned",
      processed: storedCount,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const healthCheck = (req, res) => {
  return res.json({
    status: "ok",
    service: "One Nation One Data Backend",
    timestamp: new Date().toISOString(),
  });
};

const deactivateQuestion = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: "id is required" });
    await deactivateQA(id);
    return res.json({ message: "Successfully deactivated entry" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const getTemplateForm = async (req, res) => {
  try {
    const type = req.params.type.toLowerCase();
    // Simplified generic templates structure
    const templateFields = {
      naac: ["Institution Name", "Type of Institution", "Year of Establishment", "Total Faculty", "Total Students"],
      ugc: ["Name of College", "University Affiliated", "Faculty Count", "Student Count", "Programs Offered"],
      nba: ["College Name", "Establishment Year", "Accreditation Status", "Number of Departments", "Total Faculty"]
    };

    const questions = templateFields[type];
    if (!questions) return res.status(404).json({ error: "Template not found" });

    const qaData = await getAllQA();
    const results = [];

    for (const question of questions) {
      const answerResult = await matchQuestionWithData(question, qaData);
      results.push(answerResult);
    }

    return res.json({ type, results });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const generatePDF = async (req, res) => {
  try {
    const { formType, data } = req.body;
    if (!formType || !data) return res.status(400).json({ error: "formType and data are required" });

    const templatePath = path.join(__dirname, `../templates/${formType.toLowerCase()}.ejs`);
    if (!fs.existsSync(templatePath)) {
      return res.status(400).json({ error: "Template not found for this form type" });
    }

    const htmlContent = await ejs.renderFile(templatePath, { data, formType });

    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle0" });
    
    // Create the pdfs directory if it doesn't exist
    const pdfsDir = path.join(__dirname, "../../public/pdfs");
    if (!fs.existsSync(pdfsDir)) {
      fs.mkdirSync(pdfsDir, { recursive: true });
    }

    const uniqueFilename = `${formType}_${Date.now()}.pdf`;
    const pdfPath = path.join(pdfsDir, uniqueFilename);
    
    await page.pdf({ path: pdfPath, format: "A4", printBackground: true });
    await browser.close();

    return res.json({ message: "PDF generated successfully", downloadUrl: `/pdfs/${uniqueFilename}` });
  } catch (error) {
     return res.status(500).json({ error: error.message });
  }
};

const generateFromPdf = async (req, res) => {
  const uploadedPath = req.file?.path;

  try {
    if (!req.file) {
      return res.status(400).json({ error: "PDF file is required" });
    }

    if (!req.body || !req.body.data) {
      return res.status(400).json({ error: "data is required" });
    }

    let dataMap = req.body.data;

    if (typeof dataMap === "string") {
      dataMap = JSON.parse(dataMap);
    }

    if (!dataMap || typeof dataMap !== "object" || Array.isArray(dataMap)) {
      return res.status(400).json({ error: "data must be an object" });
    }

    const pdfBytes = fs.readFileSync(req.file.path);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();
    const existingFields = form.getFields();

    if (!existingFields.length) {
      return res.status(400).json({
        error:
          "Uploaded PDF does not contain fillable form fields. Use a fillable PDF for same-layout output.",
      });
    }

    const fillStats = fillPdfFormFields(form, dataMap);
    form.flatten();

    const pdfsDir = path.join(__dirname, "../../public/pdfs");
    if (!fs.existsSync(pdfsDir)) {
      fs.mkdirSync(pdfsDir, { recursive: true });
    }

    const uniqueFilename = `input_form_${Date.now()}.pdf`;
    const outputPath = path.join(pdfsDir, uniqueFilename);
    const outputBytes = await pdfDoc.save();
    fs.writeFileSync(outputPath, outputBytes);

    return res.json({
      message: "PDF generated from uploaded form",
      downloadUrl: `/pdfs/${uniqueFilename}`,
      ...fillStats,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  } finally {
    safeDelete(uploadedPath);
  }
};

module.exports = {
  uploadCSV,
  processPDF,
  learnMappings,
  healthCheck,
  matchQuestion,
  generatePDF,
  generateFromPdf,
  getTemplateForm,
  deactivateQuestion,
};
