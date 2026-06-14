// backend/services/breakGlassNotificationService.js
const { NOTIFICATION_CHANNELS } = require('../config/enums');

const PREFERRED_CONTACT_TO_CHANNEL = {
  SMS: 'SMS',
  EMAIL: 'EMAIL',
  PORTAL: 'PORTAL_ALERT',
};

const DEFAULT_NOTIFICATION_CHANNEL = 'PORTAL_ALERT';

const mapPreferredContactToNotificationChannel = (preferredContactMethod) => {
  if (!preferredContactMethod) {
    return DEFAULT_NOTIFICATION_CHANNEL;
  }

  return PREFERRED_CONTACT_TO_CHANNEL[preferredContactMethod] || DEFAULT_NOTIFICATION_CHANNEL;
};

const resolvePatientNotificationChannel = (patient, explicitChannel) => {
  if (explicitChannel && NOTIFICATION_CHANNELS.includes(explicitChannel)) {
    return explicitChannel;
  }

  const preferredContactMethod = patient?.demographics?.contactInfo?.preferredContactMethod;
  return mapPreferredContactToNotificationChannel(preferredContactMethod);
};

const createBreakGlassNotificationService = ({
  deliver = async (job) => ({ delivered: true, job }),
  scheduleFn = (callback) => setImmediate(callback),
} = {}) => {
  const queue = [];
  const deliveredJobs = [];

  const scheduleBreakGlassNotification = (job) => {
    queue.push(job);
    scheduleFn(async () => {
      const result = await deliver(job);
      deliveredJobs.push({ job, result, deliveredAt: new Date() });
    });

    return { queued: true, eventId: job.eventId };
  };

  const flushNotificationQueue = () =>
    new Promise((resolve) => {
      const poll = () => {
        if (queue.length === 0) {
          resolve([]);
          return;
        }

        if (deliveredJobs.length >= queue.length) {
          resolve([...deliveredJobs]);
          return;
        }

        setImmediate(poll);
      };

      setImmediate(poll);
    });

  const clearNotificationQueue = () => {
    queue.length = 0;
    deliveredJobs.length = 0;
  };

  return {
    mapPreferredContactToNotificationChannel,
    resolvePatientNotificationChannel,
    scheduleBreakGlassNotification,
    flushNotificationQueue,
    clearNotificationQueue,
    getQueuedNotifications: () => [...queue],
    getDeliveredNotifications: () => [...deliveredJobs],
  };
};

const defaultService = createBreakGlassNotificationService();

module.exports = {
  DEFAULT_NOTIFICATION_CHANNEL,
  PREFERRED_CONTACT_TO_CHANNEL,
  mapPreferredContactToNotificationChannel,
  resolvePatientNotificationChannel,
  createBreakGlassNotificationService,
  scheduleBreakGlassNotification: (...args) =>
    defaultService.scheduleBreakGlassNotification(...args),
  flushNotificationQueue: (...args) => defaultService.flushNotificationQueue(...args),
  clearNotificationQueue: (...args) => defaultService.clearNotificationQueue(...args),
  getQueuedNotifications: (...args) => defaultService.getQueuedNotifications(...args),
  getDeliveredNotifications: (...args) => defaultService.getDeliveredNotifications(...args),
};
