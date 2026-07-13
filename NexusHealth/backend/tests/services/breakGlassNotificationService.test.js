const {
  mapPreferredContactToNotificationChannel,
  resolvePatientNotificationChannel,
  createBreakGlassNotificationService,
} = require('../../services/breakGlassNotificationService');
const { buildPatient } = require('../helpers/userFactory');

describe('breakGlassNotificationService', () => {
  it('maps patient preferred contact methods to notification channels', () => {
    expect(mapPreferredContactToNotificationChannel('SMS')).toBe('SMS');
    expect(mapPreferredContactToNotificationChannel('EMAIL')).toBe('EMAIL');
    expect(mapPreferredContactToNotificationChannel('PORTAL')).toBe('PORTAL_ALERT');
    expect(mapPreferredContactToNotificationChannel(undefined)).toBe('PORTAL_ALERT');
  });

  it('prefers explicit notification channel over patient preference', () => {
    const patient = buildPatient({
      demographics: {
        legalName: { first: 'Jane', last: 'Doe' },
        dateOfBirth: new Date('1990-01-15'),
        contactInfo: {
          email: 'jane@example.com',
          preferredContactMethod: 'SMS',
        },
      },
    });

    expect(resolvePatientNotificationChannel(patient, 'EMAIL')).toBe('EMAIL');
    expect(resolvePatientNotificationChannel(patient)).toBe('SMS');
  });

  it('schedules notifications asynchronously through the mock queue', async () => {
    const delivered = [];
    const service = createBreakGlassNotificationService({
      deliver: async (job) => {
        delivered.push(job);
        return { delivered: true };
      },
    });

    service.scheduleBreakGlassNotification({
      eventId: 'breakglass-test-001',
      tier: 'TIER_1_SOFT_OVERRIDE',
      channel: 'EMAIL',
      notifyParties: ['PATIENT'],
      patientId: '507f1f77bcf86cd799439011',
    });

    expect(service.getQueuedNotifications()).toHaveLength(1);

    const results = await service.flushNotificationQueue();

    expect(results).toHaveLength(1);
    expect(results[0].job.channel).toBe('EMAIL');
    expect(delivered[0].eventId).toBe('breakglass-test-001');
  });

  it('defaults to PORTAL_ALERT when patient has no preferred contact method', () => {
    const patient = buildPatient({
      demographics: {
        legalName: { first: 'Jane', last: 'Doe' },
        dateOfBirth: new Date('1990-01-15'),
        contactInfo: {
          email: 'jane@example.com',
        },
      },
    });

    expect(resolvePatientNotificationChannel(patient)).toBe('PORTAL_ALERT');
  });
});
