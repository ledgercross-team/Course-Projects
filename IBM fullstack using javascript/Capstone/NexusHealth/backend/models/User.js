const mongoose = require('mongoose');
const {
  USER_ROLES,
  ACCOUNT_STATUSES,
  BIOLOGICAL_SEX,
  CONTACT_METHODS,
  BLOOD_TYPES,
  CLINICAL_DOMAINS,
} = require('../config/enums');

const PASSWORD_MIN_LENGTH = 3;

const credentialsSchema = new mongoose.Schema(
  {
    hashedPassword: { type: String, required: true },
    mfaSecret: String,
    lastAuthenticatedAt: Date,
    authSessionToken: String,
  },
  { _id: false, select: false },
);

const userSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true },
    role: { type: String, enum: USER_ROLES, required: true },
    credentials: {
      type: credentialsSchema,
      required: true,
      select: false,
    },
    demographics: {
      legalName: {
        first: { type: String, required: true },
        last: { type: String, required: true },
        middle: String,
      },
      dateOfBirth: { type: Date, required: true },
      biologicalSex: { type: String, enum: BIOLOGICAL_SEX },
      contactInfo: {
        primaryPhone: String,
        email: String,
        preferredContactMethod: { type: String, enum: CONTACT_METHODS },
      },
    },
    physicianProfile: {
      licenseNumber: String,
      npiNumber: {
        type: String,
        required: function () {
          const role = this.parent().role;
          return role === 'PHYSICIAN' || role === 'CMO';
        },
        validate: {
          validator: function (value) {
            const role = this.parent().role;
            if (role === 'PHYSICIAN' || role === 'CMO') {
              return value !== undefined && value !== null && value.trim().length > 0;
            }
            return true;
          },
          message: 'npiNumber is strictly required for users with a PHYSICIAN or CMO role.',
        },
      },
      specializations: [{ type: String, enum: CLINICAL_DOMAINS }],
      affiliatedHospitalIds: [{ type: mongoose.Schema.Types.ObjectId }],
      isCMO: {
        type: Boolean,
        default: false,
        validate: {
          validator: function (value) {
            if (value === true) {
              return this.parent().role === 'CMO';
            }
            return true;
          },
          message: 'isCMO may only be true for users with a CMO role.',
        },
      },
    },
    patientProfile: {
      mrn: {
        type: String,
        required: function () {
          return this.parent().role === 'PATIENT';
        },
        validate: {
          validator: function (value) {
            if (this.parent().role === 'PATIENT') {
              return value !== undefined && value !== null && value.trim().length > 0;
            }
            return true;
          },
          message: 'mrn is strictly required for users with a PATIENT role.',
        },
      },
      bloodType: { type: String, enum: BLOOD_TYPES },
      primaryPhysicianId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      careTeamPhysicianIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    },
    accountStatus: {
      type: String,
      enum: ACCOUNT_STATUSES,
      default: 'PENDING_VERIFICATION',
    },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
    collection: 'users',
    toJSON: {
      transform(_doc, ret) {
        delete ret.credentials;
        return ret;
      },
    },
    toObject: {
      transform(_doc, ret) {
        delete ret.credentials;
        return ret;
      },
    },
  }
);

const User = mongoose.model('User', userSchema);

module.exports = User;
module.exports.PASSWORD_MIN_LENGTH = PASSWORD_MIN_LENGTH;
