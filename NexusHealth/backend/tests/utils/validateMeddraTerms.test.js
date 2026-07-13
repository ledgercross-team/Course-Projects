// backend/tests/utils/validateMeddraTerms.test.js
const { validateMeddraTerms } = require('../../utils/validateMeddraTerms');

describe('validateMeddraTerms', () => {
  it('accepts a valid LLT-only term', () => {
    const result = validateMeddraTerms([
      { lltCode: '10037844', lltTerm: 'Rash' },
    ]);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('accepts a valid PT-only term', () => {
    const result = validateMeddraTerms([
      { ptCode: '10037844', ptTerm: 'Rash' },
    ]);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('rejects a term missing both LLT and PT pairs', () => {
    const result = validateMeddraTerms([{ lltCode: '10037844' }]);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => /lltCode\+lltTerm|ptCode\+ptTerm/i.test(e))).toBe(true);
  });

  it('rejects an empty meddraTerms array', () => {
    const result = validateMeddraTerms([]);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => /at least 1 term/i.test(e))).toBe(true);
  });

  it('rejects duplicate lltCode values within the same report', () => {
    const result = validateMeddraTerms([
      { lltCode: '10037844', lltTerm: 'Rash' },
      { lltCode: '10037844', lltTerm: 'Rash generalised' },
    ]);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => /lltCode duplicates/i.test(e))).toBe(true);
  });
});
