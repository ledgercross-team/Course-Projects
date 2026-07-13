// backend/services/allergyInteractionService.js
const { fetchDrugLabel, OpenFdaNotFoundError } = require('./openFdaClient');
const { buildAllergenSearchTerms } = require('../config/allergenSynonyms');

const MIN_ALLERGEN_NAME_LENGTH = 4;

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildLabelSearchText = (labelSections) =>
  `${labelSections.warnings || ''} ${labelSections.contraindications || ''}`.toLowerCase();

const matchesTermInLabel = (labelText, term) => {
  const normalizedTerm = String(term || '').trim().toLowerCase();

  if (normalizedTerm.length < MIN_ALLERGEN_NAME_LENGTH) {
    return false;
  }

  const pattern = new RegExp(`\\b${escapeRegExp(normalizedTerm)}\\b`, 'i');
  return pattern.test(labelText);
};

const matchesAllergenInLabel = (labelText, allergenName) =>
  buildAllergenSearchTerms(allergenName).some((term) => matchesTermInLabel(labelText, term));

const normalizeMatchedAllergen = (allergy) => ({
  allergenName: allergy.allergenName,
  allergenRxnormCui: allergy.allergenRxnormCui,
  severity: allergy.severity,
  reactionDescription: allergy.reactionDescription,
});

const truncateExcerpt = (text, maxLength = 500) => {
  if (!text) {
    return undefined;
  }

  const trimmed = String(text).trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxLength)}…`;
};

const buildOpenFdaExcerpts = (labelSections) => {
  if (!labelSections) {
    return null;
  }

  return {
    warningsExcerpt: truncateExcerpt(labelSections.warnings),
    contraindicationsExcerpt: truncateExcerpt(labelSections.contraindications),
  };
};

const createAllergyInteractionService = ({
  fetchDrugLabelImpl = fetchDrugLabel,
  warnImpl = console.warn,
} = {}) => {
  const checkAllergyInteractions = async (newDrugRxcui, patientAllergies = []) => {
    if (!newDrugRxcui || String(newDrugRxcui).trim().length === 0) {
      const error = new Error('newDrugRxcui is required');
      error.statusCode = 400;
      throw error;
    }

    const allergies = Array.isArray(patientAllergies) ? patientAllergies : [];

    if (allergies.length === 0) {
      return {
        hasAllergyContraindication: false,
        matchedAllergens: [],
        decision: 'SAFE',
        openFda: null,
      };
    }

    let labelSections;

    try {
      labelSections = await fetchDrugLabelImpl(String(newDrugRxcui).trim());
    } catch (error) {
      if (error instanceof OpenFdaNotFoundError) {
        warnImpl(
          `[allergyInteractionService] openFDA label not found for RxCUI ${String(newDrugRxcui).trim()}`
        );

        return {
          hasAllergyContraindication: false,
          matchedAllergens: [],
          decision: 'SAFE',
          openFda: null,
        };
      }

      throw error;
    }

    const labelText = buildLabelSearchText(labelSections);
    const matchedAllergens = allergies.filter((allergy) =>
      matchesAllergenInLabel(labelText, allergy.allergenName)
    );

    return {
      hasAllergyContraindication: matchedAllergens.length > 0,
      matchedAllergens: matchedAllergens.map(normalizeMatchedAllergen),
      decision: matchedAllergens.length > 0 ? 'HARD_STOP' : 'SAFE',
      openFda: buildOpenFdaExcerpts(labelSections),
    };
  };

  return {
    checkAllergyInteractions,
  };
};

const defaultService = createAllergyInteractionService();

module.exports = {
  MIN_ALLERGEN_NAME_LENGTH,
  buildLabelSearchText,
  matchesAllergenInLabel,
  matchesTermInLabel,
  truncateExcerpt,
  buildOpenFdaExcerpts,
  createAllergyInteractionService,
  checkAllergyInteractions: (...args) => defaultService.checkAllergyInteractions(...args),
};
