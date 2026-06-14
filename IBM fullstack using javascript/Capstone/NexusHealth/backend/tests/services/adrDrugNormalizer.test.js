// backend/tests/services/adrDrugNormalizer.test.js
const { createAdrDrugNormalizer } = require('../../services/adrDrugNormalizer');
const { UnresolvableDrugError } = require('../../services/drugResolverErrors');

describe('adrDrugNormalizer', () => {
  const resolveDrugNameImpl = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createNormalizer = () =>
    createAdrDrugNormalizer({ resolveDrugNameImpl });

  it('uses provided rxnormCui without calling the drug resolver', async () => {
    const normalizer = createNormalizer();

    const result = await normalizer.normalizeSuspectedDrug({
      drugName: ' Aspirin ',
      rxnormCui: ' 1191 ',
      lotNumber: 'LOT-1',
      ndc: '12345-678-90',
    });

    expect(result).toEqual({
      rxnormCui: '1191',
      drugName: 'Aspirin',
      lotNumber: 'LOT-1',
      batchNumber: undefined,
      ndc: '12345-678-90',
    });
    expect(resolveDrugNameImpl).not.toHaveBeenCalled();
  });

  it('resolves drugName via injected resolver when rxnormCui is omitted', async () => {
    resolveDrugNameImpl.mockResolvedValue({
      rxcui: '11289',
      name: 'Warfarin',
      source: 'RXCHECK',
    });

    const normalizer = createNormalizer();
    const result = await normalizer.normalizeSuspectedDrug({
      drugName: 'warfarin',
    });

    expect(resolveDrugNameImpl).toHaveBeenCalledWith('warfarin');
    expect(result).toEqual({
      rxnormCui: '11289',
      drugName: 'Warfarin',
      lotNumber: undefined,
      batchNumber: undefined,
      ndc: undefined,
    });
  });

  it('propagates UnresolvableDrugError when resolver fails', async () => {
    resolveDrugNameImpl.mockRejectedValue(new UnresolvableDrugError('No match'));

    const normalizer = createNormalizer();

    await expect(
      normalizer.normalizeSuspectedDrug({ drugName: 'Asprin' })
    ).rejects.toMatchObject({
      name: 'UnresolvableDrugError',
      statusCode: 400,
      code: 'unresolvable_drug',
    });
  });

  it('preserves lotNumber, batchNumber, and ndc on resolved output', async () => {
    resolveDrugNameImpl.mockResolvedValue({
      rxcui: '1191',
      name: 'Aspirin',
      source: 'RXNORM',
    });

    const normalizer = createNormalizer();
    const result = await normalizer.normalizeSuspectedDrug({
      drugName: 'aspirin',
      lotNumber: 'LOT-99',
      batchNumber: 'BATCH-7',
      ndc: '99999-111-22',
    });

    expect(result.lotNumber).toBe('LOT-99');
    expect(result.batchNumber).toBe('BATCH-7');
    expect(result.ndc).toBe('99999-111-22');
  });
});
