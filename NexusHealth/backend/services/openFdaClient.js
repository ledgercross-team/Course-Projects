// backend/services/openFdaClient.js
const DEFAULT_BASE_URL = 'https://api.fda.gov';
const REQUEST_TIMEOUT_MS = 10_000;

class OpenFdaError extends Error {
  constructor(message, { statusCode } = {}) {
    super(message);
    this.name = 'OpenFdaError';
    this.statusCode = statusCode;
  }
}

class OpenFdaNotFoundError extends OpenFdaError {
  constructor(message = 'Drug label not found in openFDA') {
    super(message, { statusCode: 404 });
    this.name = 'OpenFdaNotFoundError';
  }
}

const normalizeTextSections = (sections) => {
  if (sections == null) {
    return '';
  }

  if (Array.isArray(sections)) {
    return sections.filter(Boolean).join(' ');
  }

  return String(sections);
};

const extractLabelSections = (payload) => {
  const result = payload?.results?.[0];
  if (!result) {
    return null;
  }

  return {
    warnings: normalizeTextSections(result.warnings),
    contraindications: normalizeTextSections(result.contraindications),
  };
};

const createOpenFdaClient = ({
  baseUrl = DEFAULT_BASE_URL,
  fetchImpl = global.fetch,
  timeoutMs = REQUEST_TIMEOUT_MS,
} = {}) => {
  const fetchDrugLabel = async (rxcui) => {
    if (!rxcui || String(rxcui).trim().length === 0) {
      const error = new Error('RxCUI is required');
      error.statusCode = 400;
      throw error;
    }

    if (!fetchImpl) {
      throw new OpenFdaError('fetch is not available in this runtime');
    }

    const trimmedRxcui = String(rxcui).trim();
    const url = new URL('/drug/label.json', baseUrl);
    url.searchParams.set('search', `openfda.rxcui:"${trimmedRxcui}"`);
    url.searchParams.set('limit', '1');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetchImpl(url.toString(), {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });

      if (response.status === 404) {
        throw new OpenFdaNotFoundError();
      }

      if (!response.ok) {
        throw new OpenFdaError(response.statusText || 'openFDA request failed', {
          statusCode: response.status,
        });
      }

      const payload = await response.json();
      const sections = extractLabelSections(payload);

      if (!sections) {
        throw new OpenFdaNotFoundError();
      }

      return sections;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new OpenFdaError('openFDA request timed out', { statusCode: 504 });
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  };

  return {
    fetchDrugLabel,
  };
};

const defaultClient = createOpenFdaClient();

module.exports = {
  DEFAULT_BASE_URL,
  REQUEST_TIMEOUT_MS,
  OpenFdaError,
  OpenFdaNotFoundError,
  normalizeTextSections,
  extractLabelSections,
  createOpenFdaClient,
  fetchDrugLabel: (...args) => defaultClient.fetchDrugLabel(...args),
};
