// backend/services/drugSearchService.js
const { searchDrugs } = require('./rxcheckClient');
const { searchApproximate } = require('./rxnormClient');
const { DrugNotFoundError } = require('./rxcheckErrors');

const SEARCH_CACHE_TTL_MS = 5 * 60 * 1000;
const searchCache = new Map();

const mapDrugEntry = (entry) => {
  const rxcui = entry?.rxcui ?? entry?.rxnormCui ?? entry?.rxnorm_id;
  const name = entry?.name ?? entry?.drug_name ?? entry?.drugName;

  if (!rxcui || !name) {
    return null;
  }

  return {
    rxcui: String(rxcui).trim(),
    name: String(name).trim(),
  };
};

const normalizeRxCheckDrugs = (payload) => {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  if (Array.isArray(payload.drugs)) {
    return payload.drugs.map(mapDrugEntry).filter(Boolean);
  }

  if (Array.isArray(payload.results)) {
    return payload.results.map(mapDrugEntry).filter(Boolean);
  }

  return [];
};

const dedupeDrugs = (drugs) => {
  const seen = new Set();

  return drugs.filter((drug) => {
    const key = `${drug.rxcui}:${drug.name.toLowerCase()}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
};

const readSearchCache = (cacheKey) => {
  const cached = searchCache.get(cacheKey);
  if (!cached) return null;
  if (Date.now() - cached.cachedAt > SEARCH_CACHE_TTL_MS) {
    searchCache.delete(cacheKey);
    return null;
  }
  return cached.result;
};

const writeSearchCache = (cacheKey, result) => {
  searchCache.set(cacheKey, { cachedAt: Date.now(), result });
};

const createDrugSearchService = ({
  searchDrugsImpl = searchDrugs,
  searchApproximateImpl = searchApproximate,
} = {}) => {
  const searchRxCheckDrugs = async (trimmedQuery) => {
    try {
      const rxCheckPayload = await searchDrugsImpl(trimmedQuery);
      return normalizeRxCheckDrugs(rxCheckPayload);
    } catch (error) {
      if (error instanceof DrugNotFoundError) {
        return [];
      }
      throw error;
    }
  };

  const searchDrugsForAutocomplete = async (query) => {
    const trimmedQuery = String(query).trim();

    if (trimmedQuery.length === 0) {
      const error = new Error('Drug search query is required');
      error.statusCode = 400;
      throw error;
    }

    const cacheKey = trimmedQuery.toLowerCase();
    const cached = readSearchCache(cacheKey);
    if (cached) {
      return cached;
    }

    const [rxNormDrugs, rxCheckDrugs] = await Promise.all([
      searchApproximateImpl(trimmedQuery, { maxEntries: 12 }),
      searchRxCheckDrugs(trimmedQuery),
    ]);

    const drugs = dedupeDrugs(
      rxCheckDrugs.length > 0 ? [...rxCheckDrugs, ...rxNormDrugs] : rxNormDrugs,
    );

    const source =
      rxCheckDrugs.length > 0 ? 'RXCHECK' : drugs.length > 0 ? 'RXNORM' : 'RXCHECK';

    const result = { drugs, source };
    writeSearchCache(cacheKey, result);

    return result;
  };

  return {
    normalizeRxCheckDrugs,
    searchDrugsForAutocomplete,
  };
};

const defaultService = createDrugSearchService();

module.exports = {
  mapDrugEntry,
  normalizeRxCheckDrugs,
  dedupeDrugs,
  createDrugSearchService,
  searchDrugsForAutocomplete: (...args) => defaultService.searchDrugsForAutocomplete(...args),
};
