// backend/services/drugResolverErrors.js

class UnresolvableDrugError extends Error {
  constructor(message = 'Drug name could not be resolved') {
    super(message);
    this.name = 'UnresolvableDrugError';
    this.code = 'unresolvable_drug';
    this.statusCode = 400;
  }
}

module.exports = {
  UnresolvableDrugError,
};
