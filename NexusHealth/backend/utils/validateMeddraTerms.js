// backend/utils/validateMeddraTerms.js
const MIN_MEDDRA_TERMS = 1;
const MAX_MEDDRA_TERMS = 20;

const isNonEmptyString = (value) =>
  typeof value === 'string' && value.trim().length > 0;

const hasLltPair = (term) =>
  isNonEmptyString(term?.lltCode) && isNonEmptyString(term?.lltTerm);

const hasPtPair = (term) =>
  isNonEmptyString(term?.ptCode) && isNonEmptyString(term?.ptTerm);

const validateMeddraTerms = (terms) => {
  const errors = [];

  if (!Array.isArray(terms)) {
    return { valid: false, errors: ['meddraTerms must be an array'] };
  }

  if (terms.length < MIN_MEDDRA_TERMS) {
    errors.push(`meddraTerms must contain at least ${MIN_MEDDRA_TERMS} term`);
  }

  if (terms.length > MAX_MEDDRA_TERMS) {
    errors.push(`meddraTerms must not exceed ${MAX_MEDDRA_TERMS} terms`);
  }

  const seenLltCodes = new Set();
  const seenPtCodes = new Set();

  terms.forEach((term, index) => {
    if (!term || typeof term !== 'object') {
      errors.push(`meddraTerms[${index}] must be an object`);
      return;
    }

    if (!hasLltPair(term) && !hasPtPair(term)) {
      errors.push(
        `meddraTerms[${index}] requires either lltCode+lltTerm or ptCode+ptTerm`
      );
    }

    if (term.hlgtCode !== undefined && term.hlgtCode !== null && !isNonEmptyString(term.hlgtCode)) {
      errors.push(`meddraTerms[${index}].hlgtCode must be a non-empty string when provided`);
    }

    if (term.soc !== undefined && term.soc !== null && !isNonEmptyString(term.soc)) {
      errors.push(`meddraTerms[${index}].soc must be a non-empty string when provided`);
    }

    if (hasLltPair(term)) {
      const code = term.lltCode.trim();
      if (seenLltCodes.has(code)) {
        errors.push(`meddraTerms[${index}].lltCode duplicates an earlier term`);
      } else {
        seenLltCodes.add(code);
      }
    }

    if (hasPtPair(term)) {
      const code = term.ptCode.trim();
      if (seenPtCodes.has(code)) {
        errors.push(`meddraTerms[${index}].ptCode duplicates an earlier term`);
      } else {
        seenPtCodes.add(code);
      }
    }
  });

  return { valid: errors.length === 0, errors };
};

module.exports = {
  validateMeddraTerms,
  MIN_MEDDRA_TERMS,
  MAX_MEDDRA_TERMS,
};
