// backend/models/PrescriptionImage.js
const mongoose = require('mongoose');
const { PRESCRIPTION_IMAGE_MIME_TYPES } = require('../config/enums');

const PRESCRIPTION_IMAGE_ID_PATTERN =
  /^rximg-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MAX_PRESCRIPTION_IMAGE_BYTES = 10 * 1024 * 1024;

const isHttpsUrl = (value) => {
  if (!value || String(value).trim().length === 0) {
    return false;
  }

  try {
    const parsed = new URL(String(value).trim());
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const prescriptionImageSchema = new mongoose.Schema(
  {
    imageId: {
      type: String,
      required: true,
      unique: true,
      validate: {
        validator(value) {
          return PRESCRIPTION_IMAGE_ID_PATTERN.test(value);
        },
        message: 'imageId must match rximg-<uuid> format',
      },
    },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    clinicalRecordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClinicalRecord',
      required: true,
    },
    clinicalRecordRecordId: { type: String, required: true, trim: true },
    cloudinaryPublicId: { type: String, required: true, trim: true },
    secureUrl: { type: String, required: true, trim: true },
    originalFilename: { type: String, required: true, trim: true },
    mimeType: { type: String, enum: PRESCRIPTION_IMAGE_MIME_TYPES, required: true },
    byteSize: { type: Number, required: true, min: 1, max: MAX_PRESCRIPTION_IMAGE_BYTES },
    caption: { type: String, trim: true },
    tags: { type: [String], default: [] },
    comments: {
      type: [
        {
          authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
          authorRole: { type: String, required: true },
          body: { type: String, required: true, trim: true, maxlength: 2000 },
          createdAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    uploadedAt: { type: Date, required: true, default: Date.now },
  },
  {
    collection: 'prescriptionImages',
    timestamps: false,
  }
);

prescriptionImageSchema.pre('validate', function enforcePrescriptionImageRules() {
  if (!isHttpsUrl(this.secureUrl)) {
    this.invalidate('secureUrl', 'secureUrl must be a valid https URL');
  }

  if (
    this.clinicalRecordRecordId &&
    String(this.clinicalRecordRecordId).trim().length === 0
  ) {
    this.invalidate('clinicalRecordRecordId', 'clinicalRecordRecordId is required');
  }
});

module.exports = mongoose.model('PrescriptionImage', prescriptionImageSchema);
