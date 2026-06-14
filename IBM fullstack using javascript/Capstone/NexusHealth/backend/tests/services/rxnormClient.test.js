const { createRxNormClient } = require('../../services/rxnormClient');

const mockFetch = (responseFactory) => jest.fn(responseFactory);

describe('rxnormClient', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.RXCHECK_API_KEY;
    delete process.env.RX_CHECK_API_KEY;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('resolves a fuzzy drug name to canonical rxcui and name', async () => {
    const fetchImpl = mockFetch(async (url) => ({
      ok: true,
      status: 200,
      json: async () => ({
        idGroup: {
          name: 'aspirin',
          rxnormId: ['1191'],
        },
      }),
    }));

    const client = createRxNormClient({ fetchImpl });
    const result = await client.resolveByName('Asprin');

    expect(result).toEqual({ rxcui: '1191', name: 'aspirin' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    const calledUrl = fetchImpl.mock.calls[0][0];
    expect(calledUrl).toContain('/rxcui.json');
    expect(calledUrl).toContain('name=Asprin');
    expect(calledUrl).toContain('search=1');
  });

  it('returns null when RxNorm cannot resolve the drug name', async () => {
    const fetchImpl = mockFetch(async () => ({
      ok: true,
      status: 200,
      json: async () => ({}),
    }));

    const client = createRxNormClient({ fetchImpl });
    const result = await client.resolveByName('totally-unknown-drug');

    expect(result).toBeNull();
  });

  it('does not require an API key or integration env vars', async () => {
    const fetchImpl = mockFetch(async (url, options) => ({
      ok: true,
      status: 200,
      json: async () => ({
        idGroup: {
          name: 'warfarin',
          rxnormId: ['11289'],
        },
      }),
    }));

    const client = createRxNormClient({ fetchImpl });
    const result = await client.resolveByName('warfarin');

    expect(result).toEqual({ rxcui: '11289', name: 'warfarin' });

    const options = fetchImpl.mock.calls[0][1];
    expect(options.headers['X-API-Key']).toBeUndefined();
    expect(options.headers.Accept).toBe('application/json');
  });
});

const runLiveRxNormIntegration = process.env.RUN_RXNORM_INTEGRATION === 'true';

(runLiveRxNormIntegration ? describe : describe.skip)('rxnormClient integration', () => {
  it('resolves aspirin against live NLM RxNorm API', async () => {
    const { createRxNormClient } = require('../../services/rxnormClient');
    const client = createRxNormClient();
    const result = await client.resolveByName('aspirin');

    expect(result).toMatchObject({
      rxcui: expect.any(String),
      name: expect.any(String),
    });
  });
});
