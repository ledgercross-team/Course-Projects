jest.mock('../../services/rxcheckClient', () => ({
  checkInteraction: jest.fn(),
}));

jest.mock('../../services/rxnormClient', () => ({
  getIngredientRxcuis: jest.fn(async (rxcui) => [String(rxcui)]),
}));

const DrugInteractionRule = require('../../models/DrugInteractionRule');
const { checkInteraction } = require('../../services/rxcheckClient');
const { getIngredientRxcuis } = require('../../services/rxnormClient');
const {
  createInteractionCheckerService,
  mapSeverityToTier,
  buildPairHash,
} = require('../../services/interactionCheckerService');
const { connectTestDB, disconnectTestDB, clearDatabase } = require('../setup/mongo');

describe('interactionCheckerService', () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearDatabase();
    jest.clearAllMocks();
  });

  const createService = () => createInteractionCheckerService();

  it('returns a local DB cache hit without calling RxCheck', async () => {
    await DrugInteractionRule.create({
      drug1RxnormCui: '2556',
      drug2RxnormCui: '36437',
      interactionPairHash: buildPairHash('2556', '36437'),
      tier: 'HARD_STOP',
      mechanismDescription: 'Serotonin syndrome risk',
      clinicalConsequence: 'Avoid combination',
      evidenceLevel: 'MAJOR',
      sourceReference: 'RXCHECK',
    });

    const service = createService();
    const result = await service.checkPair('36437', '2556');

    expect(result).toMatchObject({
      tier: 'HARD_STOP',
      drug1RxnormCui: '2556',
      drug2RxnormCui: '36437',
      mechanismDescription: 'Serotonin syndrome risk',
      source: 'RXCHECK',
      cached: true,
    });
    expect(checkInteraction).not.toHaveBeenCalled();
  });

  it('calls RxCheck on cache miss and upserts the interaction rule', async () => {
    checkInteraction.mockResolvedValue({
      interaction: {
        severity: 'major',
        onc_high_priority: true,
        mechanism: 'Serotonin syndrome risk',
        clinical_consequence: 'Avoid combination',
      },
    });

    const service = createService();
    const result = await service.checkPair('2556', '36437');

    expect(checkInteraction).toHaveBeenCalledWith('2556', '36437');
    expect(result).toMatchObject({
      tier: 'HARD_STOP',
      drug1RxnormCui: '2556',
      drug2RxnormCui: '36437',
      mechanismDescription: 'Serotonin syndrome risk',
      source: 'RXCHECK',
      cached: false,
    });

    const saved = await DrugInteractionRule.findOne({
      interactionPairHash: buildPairHash('2556', '36437'),
      sourceReference: 'RXCHECK',
    }).lean();

    expect(saved).not.toBeNull();
    expect(saved.tier).toBe('HARD_STOP');
  });

  it('ignores LOCAL_CACHE rows even when interactionPairHash would match a pair lookup', async () => {
    await DrugInteractionRule.create({
      drug1RxnormCui: '2556',
      drug2RxnormCui: '2556',
      interactionPairHash: buildPairHash('2556', '36437'),
      tier: 'INFORMATIONAL',
      sourceReference: 'LOCAL_CACHE',
      mechanismDescription: 'placeholder',
    });

    checkInteraction.mockResolvedValue({
      interaction: {
        severity: 'moderate',
        onc_high_priority: false,
        mechanism: 'Reduced efficacy',
        clinical_consequence: 'Monitor response',
      },
    });

    const service = createService();
    const result = await service.checkPair('2556', '36437');

    expect(checkInteraction).toHaveBeenCalledWith('2556', '36437');
    expect(result.tier).toBe('SOFT_WARNING');
  });

  describe('mapSeverityToTier', () => {
    it.each([
      ['contraindicated', false, 'HARD_STOP'],
      ['major', false, 'HARD_STOP'],
      ['moderate', false, 'SOFT_WARNING'],
      ['minor', false, 'INFORMATIONAL'],
    ])('maps %s (onc=%s) to %s', (severity, oncHighPriority, expectedTier) => {
      expect(mapSeverityToTier(severity, oncHighPriority)).toBe(expectedTier);
    });
  });

  describe('ONC high-priority escalation', () => {
    it.each([
      ['moderate', true, 'HARD_STOP'],
      ['minor', true, 'SOFT_WARNING'],
    ])('escalates %s with onc_high_priority to %s', (severity, oncHighPriority, expectedTier) => {
      expect(mapSeverityToTier(severity, oncHighPriority)).toBe(expectedTier);
    });

    it('escalates moderate + onc_high_priority through checkPair', async () => {
      checkInteraction.mockResolvedValue({
        interaction: {
          severity: 'moderate',
          onc_high_priority: true,
          mechanism: 'Serotonin syndrome risk',
          clinical_consequence: 'Avoid combination',
        },
      });

      const service = createService();
      const result = await service.checkPair('2556', '36437');

      expect(result.tier).toBe('HARD_STOP');
    });
  });

  it('returns SAFE when RxCheck reports no interaction without caching inconclusive negatives', async () => {
    checkInteraction.mockResolvedValue({
      interaction: {
        found: false,
        severity: 'none',
      },
    });

    const service = createService();
    const result = await service.checkPair('2556', '36437');

    expect(result).toMatchObject({
      tier: 'SAFE',
      drug1RxnormCui: '2556',
      drug2RxnormCui: '36437',
      source: 'RXCHECK_NO_INTERACTION',
      cached: false,
    });

    const saved = await DrugInteractionRule.findOne({
      interactionPairHash: buildPairHash('2556', '36437'),
      sourceReference: 'RXCHECK_NO_INTERACTION',
    }).lean();

    expect(saved).toBeNull();
  });

  it('detects warfarin product + aspirin via ingredient critical-pair fallback', async () => {
    getIngredientRxcuis.mockImplementation(async (rxcui) => {
      if (rxcui === '855290') return ['11289'];
      return [String(rxcui)];
    });

    const service = createService();
    const result = await service.checkPair('855290', '1191');

    expect(result).toMatchObject({
      tier: 'HARD_STOP',
      drug1RxnormCui: '1191',
      drug2RxnormCui: '855290',
      mechanismDescription: expect.stringMatching(/bleeding/i),
      source: 'LOCAL_CACHE',
    });
    expect(checkInteraction).not.toHaveBeenCalled();
  });

  it('prefers critical-pair fallback over stale negative cache for warfarin + aspirin', async () => {
    await DrugInteractionRule.create({
      drug1RxnormCui: '11289',
      drug2RxnormCui: '1191',
      interactionPairHash: buildPairHash('11289', '1191'),
      tier: 'INFORMATIONAL',
      sourceReference: 'RXCHECK_NO_INTERACTION',
    });

    const service = createService();
    const result = await service.checkPair('1191', '11289');

    expect(result).toMatchObject({
      tier: 'HARD_STOP',
      source: 'LOCAL_CACHE',
    });
    expect(checkInteraction).not.toHaveBeenCalled();
  });
});
