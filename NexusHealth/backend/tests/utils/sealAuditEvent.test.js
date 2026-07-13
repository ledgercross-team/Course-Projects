const {
  sealAuditEvent,
  verifyAuditEventSeal,
  verifyLogIntegrity,
  verifyBreakGlassLogIntegrity,
  rebuildSealPayloadFromBreakGlassLog,
  buildTier1SealPayload,
  resolveAuditSealSecret,
} = require('../../utils/sealAuditEvent');

describe('sealAuditEvent', () => {
  it('produces identical hashes for the same payload regardless of key order', () => {
    const payloadA = {
      eventId: 'breakglass-001',
      tier: 'TIER_1_SOFT_OVERRIDE',
      initiatedBy: '507f1f77bcf86cd799439011',
      eventCreatedAt: new Date('2026-06-13T10:00:00.000Z'),
    };

    const payloadB = {
      eventCreatedAt: new Date('2026-06-13T10:00:00.000Z'),
      initiatedBy: '507f1f77bcf86cd799439011',
      tier: 'TIER_1_SOFT_OVERRIDE',
      eventId: 'breakglass-001',
    };

    expect(sealAuditEvent(payloadA)).toBe(sealAuditEvent(payloadB));
  });

  it('sorts keys alphabetically in the deterministic payload', () => {
    const { buildDeterministicPayload } = require('../../utils/sealAuditEvent');
    const payload = buildDeterministicPayload({
      zebra: 'z',
      alpha: 'a',
    });

    expect(Object.keys(payload)).toEqual(['alpha', 'zebra']);
  });

  it('changes hash when sealed payload content changes', () => {
    const base = {
      eventId: 'breakglass-001',
      tier: 'TIER_1_SOFT_OVERRIDE',
    };

    const altered = {
      eventId: 'breakglass-002',
      tier: 'TIER_1_SOFT_OVERRIDE',
    };

    expect(sealAuditEvent(base)).not.toBe(sealAuditEvent(altered));
  });

  it('verifies a valid seal and rejects tampered payloads', () => {
    const sealPayload = buildTier1SealPayload({
      eventId: 'breakglass-verify-001',
      initiatedBy: '507f1f77bcf86cd799439011',
      targetPatientId: '507f1f77bcf86cd799439012',
      clinicalJustificationCode: 'EMERGENCY_DEPARTMENT',
      freeTextReason: 'Emergency access',
      affectedDomains: ['CARDIOLOGY'],
      eventCreatedAt: new Date('2026-06-13T10:00:00.000Z'),
    });

    const signatureHash = sealAuditEvent(sealPayload);

    expect(verifyAuditEventSeal(sealPayload, signatureHash)).toBe(true);
    expect(verifyLogIntegrity(sealPayload, signatureHash)).toBe(true);
    expect(
      verifyAuditEventSeal(
        { ...sealPayload, freeTextReason: 'Tampered reason' },
        signatureHash
      )
    ).toBe(false);
  });

  it('requires AUDIT_SEAL_SECRET in production', () => {
    const previousNodeEnv = process.env.NODE_ENV;
    const previousSecret = process.env.AUDIT_SEAL_SECRET;

    process.env.NODE_ENV = 'production';
    delete process.env.AUDIT_SEAL_SECRET;

    expect(() => resolveAuditSealSecret()).toThrow(/AUDIT_SEAL_SECRET is required in production/);

    process.env.NODE_ENV = previousNodeEnv;
    if (previousSecret) {
      process.env.AUDIT_SEAL_SECRET = previousSecret;
    }
  });
});
