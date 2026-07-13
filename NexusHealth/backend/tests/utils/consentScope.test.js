const {
  getEffectiveAllowedDomains,
  buildConsentScopedMatch,
  isRecordWithinConsentScope,
  isConsentReadable,
} = require('../../utils/consentScope');
const { buildActiveConsent } = require('../helpers/consentFactory');

describe('consentScope utilities', () => {
  it('computes effective allowed domains by removing exclusions', () => {
    const consent = buildActiveConsent({
      allowedDomains: ['CARDIOLOGY', 'GENERAL_PRACTICE'],
      excludedDomains: ['PSYCHIATRY'],
    });

    expect(getEffectiveAllowedDomains(consent)).toEqual(['CARDIOLOGY', 'GENERAL_PRACTICE']);
  });

  it('builds a match filter that excludes psychiatric domains', () => {
    const patientId = '507f1f77bcf86cd799439011';
    const consent = buildActiveConsent({
      patientId,
      allowedDomains: ['CARDIOLOGY'],
      excludedDomains: ['PSYCHIATRY'],
      episodeId: 'referral-episode-88',
    });

    const match = buildConsentScopedMatch(consent, patientId);

    expect(match.domain).toEqual({ $in: ['CARDIOLOGY'] });
    expect(match.episodeId).toBe('referral-episode-88');
    expect(match.patientId.toString()).toBe(patientId);
  });

  it('rejects records outside allowed domains or episode scope', () => {
    const consent = buildActiveConsent({
      allowedDomains: ['CARDIOLOGY'],
      excludedDomains: ['PSYCHIATRY'],
      episodeId: 'referral-episode-88',
    });

    expect(
      isRecordWithinConsentScope(
        { domain: 'CARDIOLOGY', episodeId: 'referral-episode-88' },
        consent
      )
    ).toBe(true);

    expect(
      isRecordWithinConsentScope(
        { domain: 'PSYCHIATRY', episodeId: 'referral-episode-88' },
        consent
      )
    ).toBe(false);

    expect(
      isRecordWithinConsentScope(
        { domain: 'CARDIOLOGY', episodeId: 'other-episode' },
        consent
      )
    ).toBe(false);
  });

  it('treats expired or revoked consent as unreadable', () => {
    const active = buildActiveConsent({
      status: 'ACTIVE',
      grantedAt: new Date('2026-01-01T00:00:00.000Z'),
      expiresAt: new Date('2026-06-01T00:00:00.000Z'),
    });

    expect(isConsentReadable(active, new Date('2026-03-01T00:00:00.000Z'))).toBe(true);
    expect(isConsentReadable(active, new Date('2026-07-01T00:00:00.000Z'))).toBe(false);

    const notYetGranted = buildActiveConsent({
      status: 'ACTIVE',
      grantedAt: new Date('2026-06-01T00:00:00.000Z'),
      expiresAt: new Date('2026-12-01T00:00:00.000Z'),
    });
    expect(isConsentReadable(notYetGranted, new Date('2026-03-01T00:00:00.000Z'))).toBe(false);

    const revoked = buildActiveConsent({ status: 'REVOKED', revokedAt: new Date(), revokedReason: 'done' });
    expect(isConsentReadable(revoked)).toBe(false);
  });

  it('throws when consent scope resolves to zero effective domains', () => {
    const consent = buildActiveConsent({
      allowedDomains: ['PSYCHIATRY'],
      excludedDomains: ['PSYCHIATRY'],
    });

    expect(() => buildConsentScopedMatch(consent, '507f1f77bcf86cd799439011')).toThrow(
      'Consent scope has no effective allowed domains'
    );
  });
});
