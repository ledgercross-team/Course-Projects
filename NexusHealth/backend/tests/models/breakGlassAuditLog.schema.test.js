const BreakGlassAuditLog = require('../../models/BreakGlassAuditLog');
const { buildTier1BreakGlass, buildTier2Request, buildTier2Approval } = require('../helpers/breakGlassFactory');

describe('BreakGlassAuditLog schema', () => {
  it('requires clinicalJustificationCode for Tier 1 events', async () => {
    const doc = new BreakGlassAuditLog(
      buildTier1BreakGlass({
        justification: {
          freeTextReason: 'Emergency access required',
        },
      })
    );

    await expect(doc.validate()).rejects.toMatchObject({
      errors: expect.objectContaining({
        'justification.clinicalJustificationCode': expect.anything(),
      }),
    });
  });

  it('rejects CMO authorization fields on Tier 1 events', async () => {
    const doc = new BreakGlassAuditLog(
      buildTier1BreakGlass({
        tier2Authorization: {
          authorizedByCmoId: new (require('mongoose').Types.ObjectId)(),
        },
      })
    );

    await expect(doc.validate()).rejects.toMatchObject({
      errors: expect.objectContaining({
        'tier2Authorization.authorizedByCmoId': expect.anything(),
      }),
    });
  });

  it('requires signatureHash for immutable break-glass logs', async () => {
    const doc = new BreakGlassAuditLog(
      buildTier1BreakGlass({
        signatureHash: undefined,
      })
    );

    await expect(doc.validate()).rejects.toMatchObject({
      errors: expect.objectContaining({
        signatureHash: expect.anything(),
      }),
    });
  });

  it('accepts a valid Tier 1 break-glass log', async () => {
    const doc = new BreakGlassAuditLog(buildTier1BreakGlass());

    await expect(doc.validate()).resolves.toBeUndefined();
    expect(doc.signatureHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('requires recordPhase for Tier 2 events', async () => {
    const doc = new BreakGlassAuditLog(
      buildTier2Request({
        recordPhase: undefined,
      })
    );

    await expect(doc.validate()).rejects.toMatchObject({
      errors: expect.objectContaining({
        recordPhase: expect.anything(),
      }),
    });
  });

  it('requires CMO authorization on Tier 2 approval events', async () => {
    const doc = new BreakGlassAuditLog(
      buildTier2Approval({
        tier2Authorization: {},
      })
    );

    await expect(doc.validate()).rejects.toMatchObject({
      errors: expect.objectContaining({
        'tier2Authorization.authorizedByCmoId': expect.anything(),
      }),
    });
  });

  it('accepts a valid Tier 2 request log', async () => {
    const doc = new BreakGlassAuditLog(buildTier2Request());

    await expect(doc.validate()).resolves.toBeUndefined();
    expect(doc.recordPhase).toBe('REQUEST');
  });
});
