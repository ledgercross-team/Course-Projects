const {
  createRxCheckClient,
  resolveApiKey,
} = require('../../services/rxcheckClient');
const {
  DrugNotFoundError,
  RateLimitError,
  InvalidApiKeyError,
} = require('../../services/rxcheckErrors');

const mockFetch = (responseFactory) => jest.fn(responseFactory);

describe('rxcheckClient', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns interaction payload for a successful pairwise check', async () => {
    const interactionPayload = {
      interaction: {
        severity: 'major',
        onc_high_priority: true,
        mechanism: 'Increased bleeding risk',
        clinical_consequence: 'Monitor INR closely',
      },
    };

    const fetchImpl = mockFetch(async (url) => ({
      ok: true,
      status: 200,
      json: async () => interactionPayload,
      headers: new Map(),
    }));

    const client = createRxCheckClient({
      apiKey: 'test-key',
      fetchImpl,
    });

    const result = await client.checkInteraction('warfarin', 'aspirin');

    expect(result).toEqual(interactionPayload);
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    const calledUrl = fetchImpl.mock.calls[0][0];
    expect(calledUrl).toContain('/v1/interactions');
    expect(calledUrl).toContain('drug1=warfarin');
    expect(calledUrl).toContain('drug2=aspirin');
    expect(calledUrl).toContain('format=full');

    const options = fetchImpl.mock.calls[0][1];
    expect(options.headers['X-API-Key']).toBe('test-key');
  });

  it('throws DrugNotFoundError when RxCheck returns drug_not_found', async () => {
    const fetchImpl = mockFetch(async () => ({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: async () => ({
        error: 'drug_not_found',
        message: 'Input drug cannot be resolved to a known drug.',
      }),
    }));

    const client = createRxCheckClient({ apiKey: 'test-key', fetchImpl });

    await expect(client.checkInteraction('unknown-drug', 'aspirin')).rejects.toBeInstanceOf(
      DrugNotFoundError
    );
  });

  it('throws RateLimitError when RxCheck returns rate_limit_exceeded', async () => {
    const fetchImpl = mockFetch(async () => ({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
      json: async () => ({
        error: 'rate_limit_exceeded',
        message: 'Burst rate limit hit.',
      }),
    }));

    const client = createRxCheckClient({ apiKey: 'test-key', fetchImpl });

    await expect(client.checkInteraction('warfarin', 'aspirin')).rejects.toBeInstanceOf(
      RateLimitError
    );
  });

  it('throws InvalidApiKeyError when RxCheck returns invalid_api_key', async () => {
    const fetchImpl = mockFetch(async () => ({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: async () => ({
        error: 'invalid_api_key',
        message: 'Key not found or inactive.',
      }),
    }));

    const client = createRxCheckClient({ apiKey: 'bad-key', fetchImpl });

    await expect(client.searchDrugs('aspirin')).rejects.toBeInstanceOf(InvalidApiKeyError);
  });

  it('resolves API key from RX_CHECK_API_KEY env var', () => {
    process.env.RX_CHECK_API_KEY = 'rxck_live_from_env';
    delete process.env.RXCHECK_API_KEY;

    expect(resolveApiKey()).toBe('rxck_live_from_env');
  });

  it('rejects empty drug search query before calling RxCheck', async () => {
    const fetchImpl = mockFetch(async () => {
      throw new Error('fetch should not be called');
    });

    const client = createRxCheckClient({ apiKey: 'test-key', fetchImpl });

    await expect(client.searchDrugs('   ')).rejects.toMatchObject({ statusCode: 400 });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
