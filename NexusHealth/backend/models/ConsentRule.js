const mongoose = require('mongoose');
const {
  CLINICAL_DOMAINS,
  PERMISSION_TIERS,
  CONSENT_STATUSES,
  CONSENT_ORIGINS,
  CONFIRMATION_METHODS,
  MAX_CONSENT_WINDOW_DAYS,
} = require('../config/enums');

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const hasDomainOverlap = (allowedDomains = [], excludedDomains = []) => {
  const excluded = new Set(excludedDomains);
  return allowedDomains.some((domain) => excluded.has(domain));
};

const consentRuleSchema = new mongoose.Schema(
  {
    consentId: { type: String, required: true },
    versionNumber: { type: Number, required: true, default: 1, min: 1 },
    previousVersionId: { type: mongoose.Schema.Types.ObjectId, ref: 'ConsentRule' },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    episodeId: { type: String, required: true },
    permissionTier: { type: String, enum: PERMISSION_TIERS, required: true },
    allowedDomains: {
      type: [{ type: String, enum: CLINICAL_DOMAINS }],
      validate: {
        validator(value) {
          return Array.isArray(value) && value.length > 0;
        },
        message: 'allowedDomains must contain at least one clinical domain',
      },
    },
    excludedDomains: [{ type: String, enum: CLINICAL_DOMAINS }],
    status: {
      type: String,
      enum: CONSENT_STATUSES,
      default: 'PENDING_PATIENT_CONFIRMATION',
    },
    grantedAt: Date,
    expiresAt: Date,
    revokedAt: Date,
    revokedReason: String,
    renewalRequested: { type: Boolean, default: false },
    renewalRequestedAt: Date,
    proposedDurationDays: { type: Number, min: 1, max: MAX_CONSENT_WINDOW_DAYS },
    consentOrigin: { type: String, enum: CONSENT_ORIGINS, default: 'PATIENT_PORTAL' },
    patientConfirmation: {
      confirmedAt: Date,
      confirmedViaMethod: { type: String, enum: CONFIRMATION_METHODS },
      confirmingIdentityHash: String,
    },
    stateChangeLog: [
      {
        fromStatus: { type: String, required: true },
        toStatus: { type: String, required: true },
        changedAt: { type: Date, required: true, default: Date.now },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        reason: String,
      },
    ],
    createdAt: { type: Date, default: Date.now },
  },
  {
    collection: 'consentRules',
    timestamps: false,
  }
);

consentRuleSchema.path('allowedDomains').validate(function validateDomainSeparation(value) {
  if (hasDomainOverlap(value, this.excludedDomains)) {
    return false;
  }
  return true;
}, 'allowedDomains and excludedDomains cannot overlap');

consentRuleSchema.pre('validate', function enforceStatusRules() {
  if (this.status === 'ACTIVE') {
    if (!this.grantedAt) {
      this.invalidate('grantedAt', 'grantedAt is required when consent status is ACTIVE');
    }
    if (!this.expiresAt) {
      this.invalidate('expiresAt', 'expiresAt is required when consent status is ACTIVE');
    }
    if (!this.patientConfirmation?.confirmedAt) {
      this.invalidate(
        'patientConfirmation.confirmedAt',
        'patientConfirmation.confirmedAt is required when consent status is ACTIVE'
      );
    }
    if (!this.patientConfirmation?.confirmedViaMethod) {
      this.invalidate(
        'patientConfirmation.confirmedViaMethod',
        'patientConfirmation.confirmedViaMethod is required when consent status is ACTIVE'
      );
    }
    if (!this.patientConfirmation?.confirmingIdentityHash) {
      this.invalidate(
        'patientConfirmation.confirmingIdentityHash',
        'patientConfirmation.confirmingIdentityHash is required when consent status is ACTIVE'
      );
    }
  }

  if (this.status === 'REVOKED') {
    if (!this.revokedAt) {
      this.invalidate('revokedAt', 'revokedAt is required when consent status is REVOKED');
    }
    if (!this.revokedReason || this.revokedReason.trim().length === 0) {
      this.invalidate('revokedReason', 'revokedReason is required when consent status is REVOKED');
    }
  }

  if (this.status === 'EXPIRED' && !this.expiresAt) {
    this.invalidate('expiresAt', 'expiresAt is required when consent status is EXPIRED');
  }

  if (this.versionNumber > 1 && !this.previousVersionId) {
    this.invalidate(
      'previousVersionId',
      'previousVersionId is required when versionNumber is greater than 1'
    );
  }

  if (this.grantedAt && this.expiresAt) {
    if (this.expiresAt <= this.grantedAt) {
      this.invalidate('expiresAt', 'expiresAt must be after grantedAt');
    } else {
      const windowDays = (this.expiresAt.getTime() - this.grantedAt.getTime()) / MS_PER_DAY;
      if (windowDays > MAX_CONSENT_WINDOW_DAYS) {
        this.invalidate(
          'expiresAt',
          `consent window cannot exceed ${MAX_CONSENT_WINDOW_DAYS} days`
        );
      }
    }
  }

  if (this.status === 'PENDING_PATIENT_CONFIRMATION' && this.grantedAt) {
    this.invalidate(
      'grantedAt',
      'grantedAt must not be set while consent is pending patient confirmation'
    );
  }
});

module.exports = mongoose.model('ConsentRule', consentRuleSchema);
