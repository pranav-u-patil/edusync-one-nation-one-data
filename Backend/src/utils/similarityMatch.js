const stringSimilarity = require("string-similarity");

const similarityMatch = (question, dbData = []) => {
  if (!dbData.length) {
    return null;
  }

  const candidates = dbData.map((item) => item.norm_question);
  const result = stringSimilarity.findBestMatch(question, candidates);

  const best = result.bestMatch;
  if (!best || !best.target) {
    return null;
  }

  const matchedRecord = dbData.find(
    (item) => item.norm_question === best.target
  );

  if (!matchedRecord) {
    return null;
  }

  return {
    record: matchedRecord,
    score: Number(best.rating.toFixed(4)),
  };
};

module.exports = {
  similarityMatch,
};
