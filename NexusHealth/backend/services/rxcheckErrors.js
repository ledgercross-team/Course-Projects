// backend/services/rxcheckErrors.js

class RxCheckError extends Error {
  constructor(message, { code, statusCode } = {}) {
    super(message);
    this.name = 'RxCheckError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

class DrugNotFoundError extends RxCheckError {
  constructor(message = 'Drug not found') {
    super(message, { code: 'drug_not_found', statusCode: 404 });
    this.name = 'DrugNotFoundError';
  }
}

class RateLimitError extends RxCheckError {
  constructor(message = 'Rate limit exceeded') {
    super(message, { code: 'rate_limit_exceeded', statusCode: 429 });
    this.name = 'RateLimitError';
  }
}

class InvalidApiKeyError extends RxCheckError {
  constructor(message = 'Invalid API key') {
    super(message, { code: 'invalid_api_key', statusCode: 401 });
    this.name = 'InvalidApiKeyError';
  }
}

module.exports = {
  RxCheckError,
  DrugNotFoundError,
  RateLimitError,
  InvalidApiKeyError,
};
