// backend/services/rxcheckClient.js
const {
  RxCheckError,
  DrugNotFoundError,
  RateLimitError,
  InvalidApiKeyError,
} = require('./rxcheckErrors');

const DEFAULT_BASE_URL = 'https://api.rxcheck.dev';
const REQUEST_TIMEOUT_MS = 10_000;

const resolveApiKey = () =>
  process.env.RXCHECK_API_KEY || process.env.RX_CHECK_API_KEY || null;

const mapErrorCodeToTypedError = (errorCode, message, statusCode) => {
  switch (errorCode) {
    case 'drug_not_found':
      return new DrugNotFoundError(message);
    case 'rate_limit_exceeded':
    case 'monthly_limit_exceeded':
      return new RateLimitError(message);
    case 'invalid_api_key':
      return new InvalidApiKeyError(message);
    default:
      return new RxCheckError(message || 'RxCheck request failed', {
        code: errorCode,
        statusCode,
      });
  }
};

const parseErrorBody = async (response) => {
  try {
    return await response.json();
  } catch {
    return {};
  }
};

const createRxCheckClient = ({
  baseUrl = DEFAULT_BASE_URL,
  apiKey = resolveApiKey(),
  fetchImpl = global.fetch,
  timeoutMs = REQUEST_TIMEOUT_MS,
} = {}) => {
  const request = async (path, query = {}) => {
    if (!fetchImpl) {
      throw new RxCheckError('fetch is not available in this runtime');
    }

    const url = new URL(path, baseUrl);
    for (const [key, value] of Object.entries(query)) {
      if (value != null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }

    const headers = { Accept: 'application/json' };
    if (apiKey) {
      headers['X-API-Key'] = apiKey;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetchImpl(url.toString(), {
        method: 'GET',
        headers,
        signal: controller.signal,
      });

      if (response.ok) {
        return response.json();
      }

      const body = await parseErrorBody(response);
      const errorCode = body.error || body.code || body.error_code;
      const message = body.message || body.error_description || response.statusText;

      if (response.status === 404 && !errorCode) {
        throw new DrugNotFoundError(message);
      }

      if (response.status === 429 && !errorCode) {
        throw new RateLimitError(message);
      }

      if (response.status === 401 && !errorCode) {
        throw new InvalidApiKeyError(message);
      }

      if (errorCode) {
        throw mapErrorCodeToTypedError(errorCode, message, response.status);
      }

      throw new RxCheckError(message || 'RxCheck request failed', {
        statusCode: response.status,
      });
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new RxCheckError('RxCheck request timed out', { code: 'timeout', statusCode: 504 });
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  };

  const searchDrugs = async (query) => {
    if (!query || String(query).trim().length === 0) {
      const error = new Error('Drug search query is required');
      error.statusCode = 400;
      throw error;
    }

    return request('/v1/drugs/search', { q: String(query).trim() });
  };

  const checkInteraction = async (drug1, drug2, { format = 'full' } = {}) => {
    if (!drug1 || !drug2) {
      const error = new Error('drug1 and drug2 are required');
      error.statusCode = 400;
      throw error;
    }

    return request('/v1/interactions', {
      drug1: String(drug1).trim(),
      drug2: String(drug2).trim(),
      format,
    });
  };

  return {
    searchDrugs,
    checkInteraction,
  };
};

const defaultClient = createRxCheckClient();

module.exports = {
  DEFAULT_BASE_URL,
  REQUEST_TIMEOUT_MS,
  resolveApiKey,
  createRxCheckClient,
  searchDrugs: (...args) => defaultClient.searchDrugs(...args),
  checkInteraction: (...args) => defaultClient.checkInteraction(...args),
};
