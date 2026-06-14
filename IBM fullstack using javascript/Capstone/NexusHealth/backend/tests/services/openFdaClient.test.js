const {
  createOpenFdaClient,
  extractLabelSections,
  OpenFdaNotFoundError,
} = require('../../services/openFdaClient');

const mockFetch = (responseFactory) => jest.fn(responseFactory);

describe('openFdaClient', () => {
  it('extracts warnings and contraindications from openFDA label payload', () => {
    const sections = extractLabelSections({
      results: [
        {
          warnings: ['May cause dizziness.', 'Avoid alcohol.'],
          contraindications: 'Hypersensitivity to aspirin.',
        },
      ],
    });

    expect(sections).toEqual({
      warnings: 'May cause dizziness. Avoid alcohol.',
      contraindications: 'Hypersensitivity to aspirin.',
    });
  });

  it('returns null when openFDA payload has no results', () => {
    expect(extractLabelSections({ results: [] })).toBeNull();
    expect(extractLabelSections({})).toBeNull();
  });

  it('throws OpenFdaNotFoundError when openFDA responds with 404', async () => {
    const fetchImpl = mockFetch(async () => ({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: async () => ({}),
    }));

    const client = createOpenFdaClient({ fetchImpl });

    await expect(client.fetchDrugLabel('999999')).rejects.toBeInstanceOf(OpenFdaNotFoundError);
  });
});
