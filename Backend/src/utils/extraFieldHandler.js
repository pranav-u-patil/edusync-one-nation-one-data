const { normalize } = require("./normalize");

const normalizeCsvFieldToKey = (fieldLabel = "") => {
	return normalize(fieldLabel)
		.replace(/\s+/g, "_")
		.replace(/[^a-z0-9_]/g, "")
		.replace(/_+/g, "_")
		.replace(/^_|_$/g, "");
};

const getIgnoredExtraFields = (session, templateId) => {
	const ignoredFields = new Set();

	for (const action of session?.extraFieldActions || []) {
		if (String(action.templateId) !== String(templateId)) {
			continue;
		}

		if (action.action === "ignored") {
			ignoredFields.add(action.csvField);
		}
	}

	return ignoredFields;
};

const getUnmappedExtraFields = (headers = [], savedMappings = [], templateFields = [], ignoredSet = new Set()) => {
	const mappedFields = new Set(
		(savedMappings || []).flatMap((mapping) => [mapping.csvField, mapping.systemField].filter(Boolean))
	);
	const templateFieldKeys = new Set(
		(templateFields || []).flatMap((field) => [field.key, field.label].filter(Boolean))
	);

	return (headers || [])
		.filter((header) => header && !ignoredSet.has(header))
		.filter((header) => !mappedFields.has(header) && !templateFieldKeys.has(header))
		.map((header) => ({
			csvField: header,
			suggestedKey: normalizeCsvFieldToKey(header),
			suggestedLabel: String(header)
				.replace(/[_-]/g, " ")
				.replace(/\b\w/g, (character) => character.toUpperCase()),
		}));
};

module.exports = {
	normalizeCsvFieldToKey,
	getIgnoredExtraFields,
	getUnmappedExtraFields,
};