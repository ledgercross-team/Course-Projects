// backend/utils/auditLogWriter.js
const crypto = require('crypto');
const { AuditLog } = require('../models');

const buildAuditId = () => `audit-${crypto.randomUUID()}`;

const appendAuditLog = async (
  {
    eventType,
    actorId,
    targetResourceType,
    targetResourceId,
    payload,
    eventCreatedAt = new Date(),
  },
  { session } = {},
) => {
  const auditEntry = {
    auditId: buildAuditId(),
    eventType,
    actorId,
    targetResourceType,
    targetResourceId,
    payload,
    eventCreatedAt,
  };

  if (session) {
    await AuditLog.create([auditEntry], { session });
    return auditEntry;
  }

  return AuditLog.create(auditEntry);
};

module.exports = {
  buildAuditId,
  appendAuditLog,
};
