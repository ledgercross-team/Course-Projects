// backend/services/adrDrugNormalizer.js
const { resolveDrugName } = require('./drugResolverService');
const { UnresolvableDrugError } = require('./drugResolverErrors');

const trimOptional = (value) => {
  if (value === undefined || value === null) {
    return undefined;
  }

  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const createAdrDrugNormalizer = ({
  resolveDrugNameImpl = resolveDrugName,
} = {}) => {
  const normalizeSuspectedDrug = async ({
    drugName,
    rxnormCui,
    lotNumber,
    batchNumber,
    ndc,
  } = {}) => {
    const trimmedCui = trimOptional(rxnormCui);
    const trimmedName = trimOptional(drugName);

    if (trimmedCui) {
      return {
        rxnormCui: trimmedCui,
        drugName: trimmedName || trimmedCui,
        lotNumber,
        batchNumber,
        ndc,
      };
    }

    if (trimmedName) {
      try {
        const resolved = await resolveDrugNameImpl(trimmedName);

        return {
          rxnormCui: resolved.rxcui,
          drugName: resolved.name,
          lotNumber,
          batchNumber,
          ndc,
        };
      } catch (error) {
        if (error instanceof UnresolvableDrugError) {
          throw error;
        }

        const wrapped = new UnresolvableDrugError(
          error.message || 'Drug name could not be resolved'
        );
        throw wrapped;
      }
    }

    const error = new UnresolvableDrugError(
      'suspectedDrug requires drugName or rxnormCui'
    );
    throw error;
  };

  return { normalizeSuspectedDrug };
};

const defaultNormalizer = createAdrDrugNormalizer();

module.exports = {
  createAdrDrugNormalizer,
  normalizeSuspectedDrug: defaultNormalizer.normalizeSuspectedDrug,
};
