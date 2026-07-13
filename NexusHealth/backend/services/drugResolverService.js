// backend/services/drugResolverService.js
const DrugInteractionRule = require('../models/DrugInteractionRule');
const { LOCAL_CACHE_SOURCE, NAME_CACHE_PREFIX } = require('../config/drugCacheConstants');
const { searchDrugs } = require('./rxcheckClient');
const { resolveByName } = require('./rxnormClient');
const { DrugNotFoundError } = require('./rxcheckErrors');
const { UnresolvableDrugError } = require('./drugResolverErrors');

const buildNameCacheHash = (drugName) =>
  `${NAME_CACHE_PREFIX}${String(drugName).trim().toLowerCase()}`;

const parseRxCheckSearchResult = (payload, queryName) => {
  const { normalizeRxCheckDrugs } = require('./drugSearchService');
  const drugs = normalizeRxCheckDrugs(payload);
  if (drugs.length === 0) {
    return null;
  }

  const first = drugs[0];
  const rxcui = first?.rxcui ?? first?.rxnormCui;
  if (!rxcui) {
    return null;
  }

  const name = first?.name ? String(first.name).trim() : String(queryName).trim();

  return { rxcui: String(rxcui), name };
};

const cacheResolvedDrug = async (DrugInteractionRuleModel, drugName, { rxcui, name }) => {
  const interactionPairHash = buildNameCacheHash(drugName);

  await DrugInteractionRuleModel.findOneAndUpdate(
    { interactionPairHash, sourceReference: LOCAL_CACHE_SOURCE },
    {
      drug1RxnormCui: rxcui,
      drug2RxnormCui: rxcui,
      interactionPairHash,
      tier: 'INFORMATIONAL',
      sourceReference: LOCAL_CACHE_SOURCE,
      mechanismDescription: name,
      lastUpdated: new Date(),
    },
    { upsert: true, setDefaultsOnInsert: true }
  );
};

const readCachedDrug = async (DrugInteractionRuleModel, drugName) => {
  const cached = await DrugInteractionRuleModel.findOne({
    interactionPairHash: buildNameCacheHash(drugName),
    sourceReference: LOCAL_CACHE_SOURCE,
  }).lean();

  if (!cached?.drug1RxnormCui) {
    return null;
  }

  return {
    rxcui: cached.drug1RxnormCui,
    name: cached.mechanismDescription || String(drugName).trim(),
    source: LOCAL_CACHE_SOURCE,
  };
};

const createDrugResolverService = ({
  searchDrugsImpl = searchDrugs,
  resolveByNameImpl = resolveByName,
  DrugInteractionRuleModel = DrugInteractionRule,
} = {}) => {
  const resolveDrugName = async (drugName) => {
    if (!drugName || String(drugName).trim().length === 0) {
      const error = new Error('Drug name is required');
      error.statusCode = 400;
      throw error;
    }

    const trimmedName = String(drugName).trim();

    const cached = await readCachedDrug(DrugInteractionRuleModel, trimmedName);
    if (cached) {
      return cached;
    }

    let resolved = null;
    let source = null;
    let shouldTryRxNorm = false;

    try {
      const rxCheckPayload = await searchDrugsImpl(trimmedName);
      const rxCheckResult = parseRxCheckSearchResult(rxCheckPayload, trimmedName);

      if (rxCheckResult) {
        resolved = rxCheckResult;
        source = 'RXCHECK';
      }
    } catch (error) {
      if (error instanceof DrugNotFoundError) {
        shouldTryRxNorm = true;
      } else {
        throw error;
      }
    }

    if (!resolved) {
      if (!shouldTryRxNorm) {
        throw new UnresolvableDrugError(`Unable to resolve drug name: ${trimmedName}`);
      }

      const rxNormResult = await resolveByNameImpl(trimmedName);

      if (!rxNormResult) {
        throw new UnresolvableDrugError(`Unable to resolve drug name: ${trimmedName}`);
      }

      resolved = {
        rxcui: rxNormResult.rxcui,
        name: rxNormResult.name,
      };
      source = 'RXNORM';
    }

    await cacheResolvedDrug(DrugInteractionRuleModel, trimmedName, resolved);

    return {
      rxcui: resolved.rxcui,
      name: resolved.name,
      source,
    };
  };

  return {
    resolveDrugName,
    buildNameCacheHash,
    parseRxCheckSearchResult,
  };
};

const defaultService = createDrugResolverService();

module.exports = {
  LOCAL_CACHE_SOURCE,
  NAME_CACHE_PREFIX,
  buildNameCacheHash,
  parseRxCheckSearchResult,
  createDrugResolverService,
  resolveDrugName: (...args) => defaultService.resolveDrugName(...args),
};
