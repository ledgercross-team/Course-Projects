// backend/tests/helpers/prescriptionImageFactory.js
const crypto = require('crypto');
const mongoose = require('mongoose');

const buildImageId = () => `rximg-${crypto.randomUUID()}`;

const buildPrescriptionImage = (overrides = {}) => ({
  imageId: buildImageId(),
  patientId: new mongoose.Types.ObjectId(),
  clinicalRecordId: new mongoose.Types.ObjectId(),
  clinicalRecordRecordId: 'rec-test-001',
  cloudinaryPublicId: 'healthplatform/prescriptions/sample',
  secureUrl: 'https://res.cloudinary.com/demo/image/upload/v1/sample.jpg',
  originalFilename: 'prescription.jpg',
  mimeType: 'image/jpeg',
  byteSize: 1024,
  uploadedAt: new Date('2026-06-13T12:00:00.000Z'),
  ...overrides,
});

module.exports = {
  buildImageId,
  buildPrescriptionImage,
};
