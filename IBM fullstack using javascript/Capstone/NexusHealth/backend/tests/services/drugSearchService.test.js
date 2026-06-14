jest.mock('../../services/rxcheckClient', () => ({
  searchDrugs: jest.fn(),
}));

jest.mock('../../services/rxnormClient', () => ({
  searchApproximate: jest.fn(),
}));

const { searchDrugs } = require('../../services/rxcheckClient');
const { searchApproximate } = require('../../services/rxnormClient');
const {
  normalizeRxCheckDrugs,
  createDrugSearchService,
} = require('../../services/drugSearchService');

describe('drugSearchService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('normalizes legacy RxCheck drugs array', () => {
    const drugs = normalizeRxCheckDrugs({
      drugs: [{ rxcui: '1191', name: 'Aspirin' }],
    });

    expect(drugs).toEqual([{ rxcui: '1191', name: 'Aspirin' }]);
  });

  it('normalizes live RxCheck results array', () => {
    const drugs = normalizeRxCheckDrugs({
      results: [{ rxcui: '855290', name: 'Warfarin' }],
      count: 1,
    });

    expect(drugs).toEqual([{ rxcui: '855290', name: 'Warfarin' }]);
  });

  it('queries RxNorm and RxCheck in parallel and prefers RxCheck matches', async () => {
    searchDrugs.mockResolvedValue({
      results: [{ rxcui: '855290', name: 'Warfarin' }],
      count: 1,
    });
    searchApproximate.mockResolvedValue([
      { rxcui: '1191', name: 'Aspirin' },
    ]);

    const service = createDrugSearchService();
    const result = await service.searchDrugsForAutocomplete('warfarin');

    expect(searchDrugs).toHaveBeenCalledWith('warfarin');
    expect(searchApproximate).toHaveBeenCalledWith('warfarin', { maxEntries: 12 });
    expect(result).toEqual({
      drugs: [
        { rxcui: '855290', name: 'Warfarin' },
        { rxcui: '1191', name: 'Aspirin' },
      ],
      source: 'RXCHECK',
    });
  });

  it('uses RxNorm results when RxCheck returns no matches', async () => {
    searchDrugs.mockResolvedValue({ results: [], count: 0 });
    searchApproximate.mockResolvedValue([
      { rxcui: '1191', name: 'Aspirin' },
    ]);

    const service = createDrugSearchService();
    const result = await service.searchDrugsForAutocomplete('aspi');

    expect(searchDrugs).toHaveBeenCalledWith('aspi');
    expect(searchApproximate).toHaveBeenCalledWith('aspi', { maxEntries: 12 });
    expect(result).toEqual({
      drugs: [{ rxcui: '1191', name: 'Aspirin' }],
      source: 'RXNORM',
    });
  });
});
