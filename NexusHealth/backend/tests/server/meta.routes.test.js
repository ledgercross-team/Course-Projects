// backend/tests/server/meta.routes.test.js
const request = require('supertest');
const { CLINICAL_DOMAINS } = require('../../config/enums');
const { app } = require('../../server');

describe('meta routes', () => {
  it('GET /api/meta/clinical-domains returns CLINICAL_DOMAINS', async () => {
    const response = await request(app).get('/api/meta/clinical-domains');

    expect(response.status).toBe(200);
    expect(response.body.clinicalDomains).toEqual(CLINICAL_DOMAINS);
  });
});
