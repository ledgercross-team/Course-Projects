// backend/models/AuditLog.js
const mongoose = require('mongoose');
const { AUDIT_EVENT_TYPES } = require('../config/enums');
const { applyAppendOnlyGuards, applyAppendOnlyNativeCollectionGuards } = require('../utils/appendOnlySchema');

const auditLogSchema = new mongoose.Schema(
  {
    auditId: { type: String, required: true, unique: true },
    eventType: { type: String, enum: AUDIT_EVENT_TYPES, required: true },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    targetResourceType: { type: String, required: true },
    targetResourceId: { type: String, required: true },
    payload: mongoose.Schema.Types.Mixed,
    eventCreatedAt: { type: Date, required: true, default: Date.now },
    signatureHash: String,
    schemaVersion: { type: Number, default: 1 },
  },
  {
    collection: 'audit_logs',
    timestamps: false,
  }
);

applyAppendOnlyGuards(auditLogSchema, 'audit_logs');

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

applyAppendOnlyNativeCollectionGuards(AuditLog, 'audit_logs');

module.exports = AuditLog;
