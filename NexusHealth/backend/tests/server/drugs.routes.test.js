jest.mock('../../services/drugSearchService', () => ({
  searchDrugsForAutocomplete: jest.fn(),
}));

const request = require('supertest');
const User = require('../../models/User');
const { app } = require('../../server');
const { searchDrugsForAutocomplete } = require('../../services/drugSearchService');
const { DrugNotFoundError, RateLimitError } = require('../../services/rxcheckErrors');
const { buildPatient, buildPhysician } = require('../helpers/userFactory');
const { connectTestDB, disconnectTestDB, clearDatabase } = require('../setup/mongo');

describe('drugs routes', () => {
  let physician;
  let patient;

  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearDatabase();
    jest.clearAllMocks();

    physician = await User.create(
      buildPhysician({ userId: 'physician-drugs-001', accountStatus: 'ACTIVE' })
    );
    patient = await User.create(buildPatient({ userId: 'patient-drugs-001', accountStatus: 'ACTIVE' }));
  });

  it('GET /api/drugs/search proxies normalized drug results for physicians', async () => {
    searchDrugsForAutocomplete.mockResolvedValue({
      drugs: [
        {
          rxcui: '1191',
          name: 'Aspirin',
        },
      ],
      source: 'RXNORM',
    });

    const response = await request(app)
      .get('/api/drugs/search')
      .query({ q: 'aspirin' })
      .set('x-user-id', physician.userId);

    expect(response.status).toBe(200);
    expect(response.body.query).toBe('aspirin');
    expect(response.body.results.drugs).toHaveLength(1);
    expect(response.body.results.source).toBe('RXNORM');
    expect(searchDrugsForAutocomplete).toHaveBeenCalledWith('aspirin');
  });

  it('returns 400 when q query parameter is missing', async () => {
    const response = await request(app)
      .get('/api/drugs/search')
      .set('x-user-id', physician.userId);

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/q is required/i);
    expect(searchDrugsForAutocomplete).not.toHaveBeenCalled();
  });

  it('returns 403 for patients attempting drug search', async () => {
    const response = await request(app)
      .get('/api/drugs/search')
      .query({ q: 'aspirin' })
      .set('x-user-id', patient.userId);

    expect(response.status).toBe(403);
    expect(searchDrugsForAutocomplete).not.toHaveBeenCalled();
  });

  it('returns 404 when RxCheck reports drug_not_found', async () => {
    searchDrugsForAutocomplete.mockRejectedValue(new DrugNotFoundError('Input drug cannot be resolved'));

    const response = await request(app)
      .get('/api/drugs/search')
      .query({ q: 'not-a-real-drug' })
      .set('x-user-id', physician.userId);

    expect(response.status).toBe(404);
    expect(response.body.code).toBe('drug_not_found');
  });

  it('returns 429 when RxCheck rate limit is exceeded', async () => {
    searchDrugsForAutocomplete.mockRejectedValue(new RateLimitError('Burst rate limit hit.'));

    const response = await request(app)
      .get('/api/drugs/search')
      .query({ q: 'warfarin' })
      .set('x-user-id', physician.userId);

    expect(response.status).toBe(429);
    expect(response.body.code).toBe('rate_limit_exceeded');
  });
});
