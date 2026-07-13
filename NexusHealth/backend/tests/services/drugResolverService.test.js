jest.mock('../../services/rxcheckClient', () => ({
  searchDrugs: jest.fn(),
}));

jest.mock('../../services/rxnormClient', () => ({
  resolveByName: jest.fn(),
}));

const DrugInteractionRule = require('../../models/DrugInteractionRule');
const { searchDrugs } = require('../../services/rxcheckClient');
const { resolveByName } = require('../../services/rxnormClient');
const { DrugNotFoundError } = require('../../services/rxcheckErrors');
const { UnresolvableDrugError } = require('../../services/drugResolverErrors');
const { createDrugResolverService } = require('../../services/drugResolverService');
const { connectTestDB, disconnectTestDB, clearDatabase } = require('../setup/mongo');

describe('drugResolverService', () => {
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

  const createService = () => createDrugResolverService();

  it('resolves via RxCheck search without calling RxNorm', async () => {
    searchDrugs.mockResolvedValue({
      drugs: [{ rxcui: '1191', name: 'Aspirin' }],
    });

    const service = createService();
    const result = await service.resolveDrugName('aspirin');

    expect(result).toEqual({
      rxcui: '1191',
      name: 'Aspirin',
      source: 'RXCHECK',
    });
    expect(searchDrugs).toHaveBeenCalledWith('aspirin');
    expect(resolveByName).not.toHaveBeenCalled();

    const cached = await DrugInteractionRule.findOne({
      interactionPairHash: 'NAME:aspirin',
      sourceReference: 'LOCAL_CACHE',
    }).lean();

    expect(cached).not.toBeNull();
    expect(cached.drug1RxnormCui).toBe('1191');
    expect(cached.drug2RxnormCui).toBe('1191');
    expect(cached.tier).toBe('INFORMATIONAL');
  });

  it('falls through to RxNorm when RxCheck returns drug_not_found', async () => {
    searchDrugs.mockRejectedValue(new DrugNotFoundError('Input drug cannot be resolved'));
    resolveByName.mockResolvedValue({ rxcui: '1191', name: 'aspirin' });

    const service = createService();
    const result = await service.resolveDrugName('Asprin');

    expect(result).toEqual({
      rxcui: '1191',
      name: 'aspirin',
      source: 'RXNORM',
    });
    expect(searchDrugs).toHaveBeenCalledWith('Asprin');
    expect(resolveByName).toHaveBeenCalledWith('Asprin');
  });

  it('throws UnresolvableDrugError when RxCheck and RxNorm both fail', async () => {
    searchDrugs.mockRejectedValue(new DrugNotFoundError('Input drug cannot be resolved'));
    resolveByName.mockResolvedValue(null);

    const service = createService();

    await expect(service.resolveDrugName('totally-unknown-drug')).rejects.toMatchObject({
      name: 'UnresolvableDrugError',
      statusCode: 400,
      code: 'unresolvable_drug',
    });

    expect(searchDrugs).toHaveBeenCalledWith('totally-unknown-drug');
    expect(resolveByName).toHaveBeenCalledWith('totally-unknown-drug');

    const cacheCount = await DrugInteractionRule.countDocuments({
      sourceReference: 'LOCAL_CACHE',
    });
    expect(cacheCount).toBe(0);
  });

  it('throws UnresolvableDrugError when RxCheck returns empty drugs without drug_not_found', async () => {
    searchDrugs.mockResolvedValue({ drugs: [] });

    const service = createService();

    await expect(service.resolveDrugName('aspirin')).rejects.toMatchObject({
      name: 'UnresolvableDrugError',
      statusCode: 400,
      code: 'unresolvable_drug',
    });
    expect(resolveByName).not.toHaveBeenCalled();
  });

  it('returns cached resolution without calling external providers', async () => {
    await DrugInteractionRule.create({
      drug1RxnormCui: '11289',
      drug2RxnormCui: '11289',
      interactionPairHash: 'NAME:warfarin',
      tier: 'INFORMATIONAL',
      sourceReference: 'LOCAL_CACHE',
      mechanismDescription: 'warfarin',
    });

    const service = createService();
    const result = await service.resolveDrugName('warfarin');

    expect(result).toEqual({
      rxcui: '11289',
      name: 'warfarin',
      source: 'LOCAL_CACHE',
    });
    expect(searchDrugs).not.toHaveBeenCalled();
    expect(resolveByName).not.toHaveBeenCalled();
  });
});
