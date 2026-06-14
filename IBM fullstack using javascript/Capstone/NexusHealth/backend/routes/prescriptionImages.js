// backend/routes/prescriptionImages.js
const express = require('express');
const multer = require('multer');
const { PRESCRIPTION_IMAGE_MIME_TYPES } = require('../config/enums');
const { requireAuthenticatedUser, requireRole } = require('../middleware/requestIdentity');
const { assertPrescriptionImageUploadAccess, assertPrescriptionImageReadAccess } = require('../utils/prescriptionImageAccess');
const {
  createPrescriptionImage,
  getPrescriptionImageById,
  listPrescriptionImagesForRecord,
  listImagesForPatient,
  addComment,
  getComments,
  deletePrescriptionImageById,
} = require('../services/prescriptionImageService');
const { ConsentRule } = require('../models');
const { toObjectId } = require('../utils/objectId');

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_FILES = 10;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES },
  fileFilter: (_req, file, callback) => {
    if (PRESCRIPTION_IMAGE_MIME_TYPES.includes(file.mimetype)) {
      callback(null, true);
      return;
    }
    callback(new Error('Invalid file type'));
  },
});

const router = express.Router();

const handleMultiUpload = (req, res, next) => {
  upload.array('files', MAX_FILES)(req, res, (error) => {
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'A file exceeds the maximum upload size (10 MB)' });
      }
      return res.status(400).json({ error: error.message });
    }
    if (error) return res.status(400).json({ error: error.message });
    return next();
  });
};

// PATIENT — upload one or more images
router.post(
  '/',
  requireAuthenticatedUser,
  requireRole('PATIENT'),
  handleMultiUpload,
  async (req, res) => {
    try {
      const { patientId, recordId, caption, tags } = req.body || {};

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'At least one file is required' });
      }

      if (!patientId) return res.status(400).json({ error: 'patientId is required' });
      if (!recordId) return res.status(400).json({ error: 'recordId is required' });

      await assertPrescriptionImageUploadAccess(req.authUser, patientId);

      const parsedTags = tags
        ? String(tags)
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
        : [];

      const results = await Promise.all(
        req.files.map((file) =>
          createPrescriptionImage({
            patientUser: req.authUser,
            patientId,
            recordId,
            buffer: file.buffer,
            mimeType: file.mimetype,
            originalFilename: file.originalname,
            caption,
            tags: parsedTags,
          }),
        ),
      );

      return res.status(201).json({ images: results, count: results.length });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({ error: error.message });
    }
  },
);

// PATIENT — list own images (all, no record filter)
router.get(
  '/patient/:patientId',
  requireAuthenticatedUser,
  requireRole('PATIENT'),
  async (req, res) => {
    try {
      await assertPrescriptionImageReadAccess(req.authUser, req.params.patientId);
      const images = await listImagesForPatient(req.params.patientId);
      return res.status(200).json({ patientId: req.params.patientId, count: images.length, images });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({ error: error.message });
    }
  },
);

// PATIENT — list images for a specific clinical record
router.get(
  '/patient/:patientId/record/:recordId',
  requireAuthenticatedUser,
  requireRole('PATIENT'),
  async (req, res) => {
    try {
      await assertPrescriptionImageReadAccess(req.authUser, req.params.patientId);
      const images = await listPrescriptionImagesForRecord(req.params.patientId, req.params.recordId);
      return res.status(200).json({
        patientId: req.params.patientId,
        recordId: req.params.recordId,
        count: images.length,
        images,
      });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({ error: error.message });
    }
  },
);

// PHYSICIAN — view all images for a care-team patient
router.get(
  '/physician/patient/:patientId',
  requireAuthenticatedUser,
  requireRole('PHYSICIAN', 'CMO'),
  async (req, res) => {
    try {
      const patientObjectId = toObjectId(req.params.patientId);

      // Consent-based access: physician must have any consent record with this patient
      const hasConsent = await ConsentRule.exists({
        providerId: req.authUser._id,
        patientId: patientObjectId,
      });

      if (!hasConsent) {
        return res.status(403).json({ error: 'No consent record found for this patient' });
      }

      const images = await listImagesForPatient(patientObjectId.toString());
      return res.status(200).json({ patientId: req.params.patientId, count: images.length, images });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({ error: error.message });
    }
  },
);

// PHYSICIAN — add comment to an image
router.post(
  '/:imageId/comments',
  requireAuthenticatedUser,
  requireRole('PHYSICIAN', 'CMO'),
  async (req, res) => {
    try {
      const { body } = req.body || {};
      const comment = await addComment({ imageId: req.params.imageId, author: req.authUser, body });
      return res.status(201).json({ comment });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({ error: error.message });
    }
  },
);

// PHYSICIAN / PATIENT — list comments on an image
router.get(
  '/:imageId/comments',
  requireAuthenticatedUser,
  async (req, res) => {
    try {
      const comments = await getComments(req.params.imageId);
      return res.status(200).json({ imageId: req.params.imageId, comments });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({ error: error.message });
    }
  },
);

// PATIENT — delete own image
router.delete(
  '/:imageId',
  requireAuthenticatedUser,
  requireRole('PATIENT'),
  async (req, res) => {
    try {
      const result = await deletePrescriptionImageById({
        patientUser: req.authUser,
        imageId: req.params.imageId,
      });
      return res.status(200).json(result);
    } catch (error) {
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({ error: error.message });
    }
  },
);

// PATIENT — detail (kept for backward compat)
router.get(
  '/:imageId',
  requireAuthenticatedUser,
  requireRole('PATIENT'),
  async (req, res) => {
    try {
      const image = await getPrescriptionImageById(req.params.imageId);

      if (!image) return res.status(404).json({ error: 'Prescription image not found' });

      if (req.authUser._id.toString() !== image.patientId.toString()) {
        return res.status(404).json({ error: 'Prescription image not found' });
      }

      await assertPrescriptionImageReadAccess(req.authUser, image.patientId.toString());
      return res.status(200).json({ image });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({ error: error.message });
    }
  },
);

module.exports = router;
