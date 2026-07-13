const ConsentRule = require('../../models/ConsentRule');
const { buildConsentRule, buildActiveConsent } = require('../helpers/consentFactory');

const expectValidationError = async (doc) => {
  await expect(doc.validate()).rejects.toThrow();
};

describe('ConsentRule schema', () => {
  it('rejects overlapping allowedDomains and excludedDomains', async () => {
    const doc = new ConsentRule(
      buildConsentRule({
        allowedDomains: ['CARDIOLOGY', 'PSYCHIATRY'],
        excludedDomains: ['PSYCHIATRY'],
      })
    );

    await expect(doc.validate()).rejects.toMatchObject({
      errors: expect.objectContaining({
        allowedDomains: expect.anything(),
      }),
    });
  });

  it('requires patient confirmation fields when status is ACTIVE', async () => {
    const doc = new ConsentRule(
      buildActiveConsent({
        patientConfirmation: undefined,
      })
    );

    await expectValidationError(doc);
  });

  it('rejects consent windows longer than 90 days', async () => {
    const grantedAt = new Date('2026-01-01T10:00:00.000Z');
    const expiresAt = new Date('2026-06-01T10:00:00.000Z');

    const doc = new ConsentRule(
      buildActiveConsent({
        grantedAt,
        expiresAt,
      })
    );

    await expect(doc.validate()).rejects.toMatchObject({
      errors: expect.objectContaining({
        expiresAt: expect.anything(),
      }),
    });
  });

  it('requires revokedReason when status is REVOKED', async () => {
    const doc = new ConsentRule(
      buildActiveConsent({
        status: 'REVOKED',
        revokedAt: new Date(),
        revokedReason: '',
      })
    );

    await expect(doc.validate()).rejects.toMatchObject({
      errors: expect.objectContaining({
        revokedReason: expect.anything(),
      }),
    });
  });

  it('rejects grantedAt on pending consents awaiting confirmation', async () => {
    const doc = new ConsentRule(
      buildConsentRule({
        grantedAt: new Date(),
      })
    );

    await expect(doc.validate()).rejects.toMatchObject({
      errors: expect.objectContaining({
        grantedAt: expect.anything(),
      }),
    });
  });
});
