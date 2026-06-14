const mongoose = require('mongoose');
const {
  BREAK_GLASS_TIERS,
  BREAK_GLASS_RECORD_PHASES,
  CLINICAL_JUSTIFICATION_CODES,
  NOTIFICATION_CHANNELS,
  REVIEW_STATUSES,
} = require('../config/enums');
const { applyAppendOnlyGuards, applyAppendOnlyNativeCollectionGuards } = require('../utils/appendOnlySchema');

const breakGlassAuditLogSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true, unique: true },
    tier: { type: String, enum: BREAK_GLASS_TIERS, required: true },
    recordPhase: { type: String, enum: BREAK_GLASS_RECORD_PHASES },
    requestEventId: { type: String },
    initiatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    targetPatientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    affectedDomains: [String],
    justification: {
      clinicalJustificationCode: String,
      freeTextReason: { type: String, required: true },
      icdCodeContext: String,
    },
    tier2Authorization: {
      authorizedByCmoId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      authorizedAt: Date,
      retrospectiveReviewFlag: { type: Boolean, default: false },
      reviewDueBy: Date,
    },
    patientNotification: {
      notificationSentAt: Date,
      notificationChannel: { type: String, enum: NOTIFICATION_CHANNELS },
      notificationDelivered: Boolean,
    },
    complianceEscalation: {
      escalatedToQueueAt: Date,
      escalationQueueId: String,
      reviewStatus: { type: String, enum: REVIEW_STATUSES },
      reviewDueBy: Date,
      reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      reviewedAt: Date,
      reviewOutcome: String,
    },
    accessReport: {
      reportGeneratedAt: Date,
      recordsAccessedIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ClinicalRecord' }],
      reportAvailableForPatientDispute: Boolean,
    },
    signatureHash: String,
    eventCreatedAt: { type: Date, required: true, default: Date.now },
    schemaVersion: { type: Number, default: 1 },
  },
  {
    collection: 'breakGlassAuditLogs',
    timestamps: false,
  }
);

breakGlassAuditLogSchema.pre('validate', function enforceTierRules() {
  if (this.tier === 'TIER_1_SOFT_OVERRIDE') {
    if (!this.justification?.clinicalJustificationCode) {
      this.invalidate(
        'justification.clinicalJustificationCode',
        'clinicalJustificationCode is required for Tier 1 break-glass'
      );
    } else if (!CLINICAL_JUSTIFICATION_CODES.includes(this.justification.clinicalJustificationCode)) {
      this.invalidate(
        'justification.clinicalJustificationCode',
        'clinicalJustificationCode is invalid for Tier 1 break-glass'
      );
    }

    if (this.tier2Authorization?.authorizedByCmoId) {
      this.invalidate(
        'tier2Authorization.authorizedByCmoId',
        'CMO authorization must not be set on Tier 1 break-glass events'
      );
    }

    if (this.recordPhase) {
      this.invalidate('recordPhase', 'recordPhase must not be set on Tier 1 break-glass events');
    }
  }

  if (this.tier === 'TIER_2_HARD_OVERRIDE') {
    if (!this.recordPhase) {
      this.invalidate('recordPhase', 'recordPhase is required for Tier 2 break-glass events');
    }

    if (!this.justification?.clinicalJustificationCode) {
      this.invalidate(
        'justification.clinicalJustificationCode',
        'clinicalJustificationCode is required for Tier 2 break-glass'
      );
    } else if (!CLINICAL_JUSTIFICATION_CODES.includes(this.justification.clinicalJustificationCode)) {
      this.invalidate(
        'justification.clinicalJustificationCode',
        'clinicalJustificationCode is invalid for Tier 2 break-glass'
      );
    }

    if (this.recordPhase === 'REQUEST') {
      if (this.tier2Authorization?.authorizedByCmoId) {
        this.invalidate(
          'tier2Authorization.authorizedByCmoId',
          'CMO authorization must not be set on Tier 2 request events'
        );
      }

      if (this.complianceEscalation?.reviewStatus !== 'PENDING') {
        this.invalidate(
          'complianceEscalation.reviewStatus',
          'Tier 2 request events must start in PENDING review status'
        );
      }
    }

    if (this.recordPhase === 'APPROVAL') {
      if (!this.requestEventId) {
        this.invalidate('requestEventId', 'requestEventId is required for Tier 2 approval events');
      }

      if (!this.tier2Authorization?.authorizedByCmoId) {
        this.invalidate(
          'tier2Authorization.authorizedByCmoId',
          'authorizedByCmoId is required for Tier 2 approval events'
        );
      }

      if (this.complianceEscalation?.reviewStatus !== 'CLEARED') {
        this.invalidate(
          'complianceEscalation.reviewStatus',
          'Tier 2 approval events must have CLEARED review status'
        );
      }
    }

    if (this.recordPhase === 'DENIAL') {
      if (!this.requestEventId) {
        this.invalidate('requestEventId', 'requestEventId is required for Tier 2 denial events');
      }

      if (this.complianceEscalation?.reviewStatus !== 'FLAGGED_FOR_INVESTIGATION') {
        this.invalidate(
          'complianceEscalation.reviewStatus',
          'Tier 2 denial events must have FLAGGED_FOR_INVESTIGATION review status'
        );
      }
    }
  }

  if (this.complianceEscalation?.escalatedToQueueAt && !this.complianceEscalation?.reviewStatus) {
    this.invalidate(
      'complianceEscalation.reviewStatus',
      'reviewStatus is required when escalatedToQueueAt is set'
    );
  }

  if (!this.signatureHash) {
    this.invalidate('signatureHash', 'signatureHash is required for immutable break-glass logs');
  }
});

applyAppendOnlyGuards(breakGlassAuditLogSchema, 'breakGlassAuditLogs');

const BreakGlassAuditLog = mongoose.model('BreakGlassAuditLog', breakGlassAuditLogSchema);

applyAppendOnlyNativeCollectionGuards(BreakGlassAuditLog, 'breakGlassAuditLogs');

module.exports = BreakGlassAuditLog;
