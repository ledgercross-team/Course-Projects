// backend/services/rxnormClient.js
const DEFAULT_BASE_URL = 'https://rxnav.nlm.nih.gov/REST';
const REQUEST_TIMEOUT_MS = 10_000;

class RxNormError extends Error {
  constructor(message, { statusCode } = {}) {
    super(message);
    this.name = 'RxNormError';
    this.statusCode = statusCode;
  }
}

const normalizeRxnormIds = (rxnormId) => {
  if (rxnormId == null) {
    return [];
  }

  return Array.isArray(rxnormId) ? rxnormId : [rxnormId];
};

const parseResolution = (payload, queryName) => {
  const idGroup = payload?.idGroup;
  if (!idGroup) {
    return null;
  }

  const ids = normalizeRxnormIds(idGroup.rxnormId);
  if (ids.length === 0) {
    return null;
  }

  // RxNorm may return multiple RxCUIs for ambiguous names; first match is used
  // as a fallback-tier resolution when RxCheck already returned drug_not_found.
  const rxcui = String(ids[0]).trim();
  if (!rxcui) {
    return null;
  }

  const name = idGroup.name ? String(idGroup.name).trim() : String(queryName).trim();

  return { rxcui, name };
};

const createRxNormClient = ({
  baseUrl = DEFAULT_BASE_URL,
  fetchImpl = global.fetch,
  timeoutMs = REQUEST_TIMEOUT_MS,
} = {}) => {
  const resolveByName = async (drugName) => {
    if (!drugName || String(drugName).trim().length === 0) {
      const error = new Error('Drug name is required');
      error.statusCode = 400;
      throw error;
    }

    if (!fetchImpl) {
      throw new RxNormError('fetch is not available in this runtime');
    }

    const trimmedName = String(drugName).trim();
    const url = new URL('rxcui.json', `${baseUrl}/`);
    url.searchParams.set('name', trimmedName);
    url.searchParams.set('search', '1');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetchImpl(url.toString(), {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new RxNormError(response.statusText || 'RxNorm request failed', {
          statusCode: response.status,
        });
      }

      const payload = await response.json();
      return parseResolution(payload, trimmedName);
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new RxNormError('RxNorm request timed out', { statusCode: 504 });
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  };

  const searchApproximate = async (term, { maxEntries = 20 } = {}) => {
    if (!term || String(term).trim().length === 0) {
      return [];
    }

    if (!fetchImpl) {
      throw new RxNormError('fetch is not available in this runtime');
    }

    const trimmedTerm = String(term).trim();
    const url = new URL('approximateTerm.json', `${baseUrl}/`);
    url.searchParams.set('term', trimmedTerm);
    url.searchParams.set('maxEntries', String(maxEntries));

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetchImpl(url.toString(), {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });

      if (!response.ok) {
        if (response.status === 404) {
          return [];
        }

        throw new RxNormError(response.statusText || 'RxNorm request failed', {
          statusCode: response.status,
        });
      }

      const payload = await response.json();
      const candidates = payload?.approximateGroup?.candidate;
      if (!Array.isArray(candidates)) {
        return [];
      }

      const seen = new Set();

      return candidates
        .map((candidate) => {
          const rxcui = candidate?.rxcui;
          const name = candidate?.name;
          if (!rxcui || !name) {
            return null;
          }

          const key = String(rxcui);
          if (seen.has(key)) {
            return null;
          }

          seen.add(key);
          return {
            rxcui: key,
            name: String(name).trim(),
          };
        })
        .filter(Boolean);
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new RxNormError('RxNorm request timed out', { statusCode: 504 });
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  };

  const getIngredientRxcuis = async (rxcui) => {
    if (!rxcui || String(rxcui).trim().length === 0) {
      return [];
    }

    if (!fetchImpl) {
      throw new RxNormError('fetch is not available in this runtime');
    }

    const trimmedRxcui = String(rxcui).trim();
    const url = new URL(`rxcui/${trimmedRxcui}/related.json`, `${baseUrl}/`);
    url.searchParams.set('tty', 'IN');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetchImpl(url.toString(), {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });

      if (!response.ok) {
        if (response.status === 404) {
          return [trimmedRxcui];
        }

        throw new RxNormError(response.statusText || 'RxNorm request failed', {
          statusCode: response.status,
        });
      }

      const payload = await response.json();
      const concepts = payload?.relatedGroup?.conceptGroup || [];
      const ingredientIds = concepts
        .filter((group) => group?.tty === 'IN')
        .flatMap((group) => group?.conceptProperties || [])
        .map((concept) => concept?.rxcui)
        .filter(Boolean)
        .map(String);

      return ingredientIds.length > 0 ? [...new Set(ingredientIds)] : [trimmedRxcui];
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new RxNormError('RxNorm request timed out', { statusCode: 504 });
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  };

  return {
    resolveByName,
    searchApproximate,
    getIngredientRxcuis,
  };
};

const defaultClient = createRxNormClient();

module.exports = {
  DEFAULT_BASE_URL,
  REQUEST_TIMEOUT_MS,
  RxNormError,
  createRxNormClient,
  resolveByName: (...args) => defaultClient.resolveByName(...args),
  searchApproximate: (...args) => defaultClient.searchApproximate(...args),
  getIngredientRxcuis: (...args) => defaultClient.getIngredientRxcuis(...args),
};
