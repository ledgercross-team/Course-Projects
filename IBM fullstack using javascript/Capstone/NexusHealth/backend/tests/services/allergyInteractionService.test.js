jest.mock('../../services/openFdaClient', () => ({
  fetchDrugLabel: jest.fn(),
  OpenFdaNotFoundError: jest.requireActual('../../services/openFdaClient').OpenFdaNotFoundError,
}));

const { fetchDrugLabel, OpenFdaNotFoundError } = require('../../services/openFdaClient');
const { createAllergyInteractionService } = require('../../services/allergyInteractionService');

describe('allergyInteractionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createService = (overrides = {}) => createAllergyInteractionService(overrides);

  it('returns HARD_STOP when a patient allergy matches openFDA label text', async () => {
    fetchDrugLabel.mockResolvedValue({
      warnings: ['Do not use in patients with a history of penicillin allergy.'],
      contraindications: ['Hypersensitivity to amoxicillin or other beta-lactam antibiotics.'],
    });

    const service = createService();
    const result = await service.checkAllergyInteractions('723', [
      {
        allergenName: 'Penicillin',
        allergenRxnormCui: '70618',
        severity: 'SEVERE',
        reactionDescription: 'Anaphylaxis',
      },
    ]);

    expect(fetchDrugLabel).toHaveBeenCalledWith('723');
    expect(result).toEqual({
      hasAllergyContraindication: true,
      decision: 'HARD_STOP',
      matchedAllergens: [
        {
          allergenName: 'Penicillin',
          allergenRxnormCui: '70618',
          severity: 'SEVERE',
          reactionDescription: 'Anaphylaxis',
        },
      ],
      openFda: {
        warningsExcerpt: 'Do not use in patients with a history of penicillin allergy.',
        contraindicationsExcerpt:
          'Hypersensitivity to amoxicillin or other beta-lactam antibiotics.',
      },
    });
  });

  it('returns SAFE when no patient allergy matches openFDA label text', async () => {
    fetchDrugLabel.mockResolvedValue({
      warnings: ['May cause dizziness.'],
      contraindications: ['Not for use in severe renal impairment.'],
    });

    const service = createService();
    const result = await service.checkAllergyInteractions('1191', [
      {
        allergenName: 'Penicillin',
        allergenRxnormCui: '70618',
        severity: 'SEVERE',
      },
      {
        allergenName: 'Shellfish',
        allergenRxnormCui: '891658',
        severity: 'MILD',
      },
    ]);

    expect(result).toEqual({
      hasAllergyContraindication: false,
      matchedAllergens: [],
      decision: 'SAFE',
      openFda: {
        warningsExcerpt: 'May cause dizziness.',
        contraindicationsExcerpt: 'Not for use in severe renal impairment.',
      },
    });
  });

  it('returns SAFE and warns when openFDA label is not found', async () => {
    fetchDrugLabel.mockRejectedValue(new OpenFdaNotFoundError());
    const warnImpl = jest.fn();

    const allergyService = createService({ warnImpl });
    const result = await allergyService.checkAllergyInteractions('999999', [
      {
        allergenName: 'Penicillin',
        allergenRxnormCui: '70618',
        severity: 'SEVERE',
      },
    ]);

    expect(result).toEqual({
      hasAllergyContraindication: false,
      matchedAllergens: [],
      decision: 'SAFE',
      openFda: null,
    });
    expect(warnImpl).toHaveBeenCalledWith(
      expect.stringContaining('openFDA label not found for RxCUI 999999')
    );
  });

  it('returns SAFE without calling openFDA when patient has no allergies', async () => {
    const service = createService();
    const result = await service.checkAllergyInteractions('1191', []);

    expect(result).toEqual({
      hasAllergyContraindication: false,
      matchedAllergens: [],
      decision: 'SAFE',
      openFda: null,
    });
    expect(fetchDrugLabel).not.toHaveBeenCalled();
  });

  it('does not match short allergen names that would false-positive via substring search', async () => {
    fetchDrugLabel.mockResolvedValue({
      warnings: ['Administration in inpatient settings only.'],
      contraindications: [],
    });

    const service = createService();
    const result = await service.checkAllergyInteractions('1191', [
      {
        allergenName: 'in',
        allergenRxnormCui: '123',
        severity: 'MILD',
      },
    ]);

    expect(result.decision).toBe('SAFE');
    expect(result.matchedAllergens).toHaveLength(0);
  });

  it('matches allergy class synonyms such as beta-lactam for penicillin allergy', async () => {
    fetchDrugLabel.mockResolvedValue({
      warnings: ['Hypersensitivity to beta-lactam antibiotics.'],
      contraindications: [],
    });

    const service = createService();
    const result = await service.checkAllergyInteractions('723', [
      {
        allergenName: 'Penicillin',
        allergenRxnormCui: '70618',
        severity: 'SEVERE',
      },
    ]);

    expect(result.decision).toBe('HARD_STOP');
    expect(result.matchedAllergens).toHaveLength(1);
  });
});
