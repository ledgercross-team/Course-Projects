// backend/services/prescriptionImageService.js
const crypto = require('crypto');
const { PrescriptionImage, ClinicalRecord } = require('../models');
const { PRESCRIPTION_IMAGE_MIME_TYPES } = require('../config/enums');
const { appendAuditLog } = require('../utils/auditLogWriter');
const {
  assertPrescriptionImageUploadAccess,
  assertPrescriptionImageDeleteAccess,
} = require('../utils/prescriptionImageAccess');
const { toObjectId } = require('../utils/objectId');
const {
  uploadPrescriptionImage,
  deletePrescriptionImage,
} = require('../utils/cloudinaryClient');

const buildImageId = () => `rximg-${crypto.randomUUID()}`;

const assertMimeType = (mimeType) => {
  if (!mimeType || !PRESCRIPTION_IMAGE_MIME_TYPES.includes(mimeType)) {
    const error = new Error('Invalid mimeType');
    error.statusCode = 400;
    throw error;
  }
};

const createPrescriptionImageService = ({
  uploadPrescriptionImageImpl = uploadPrescriptionImage,
  deletePrescriptionImageImpl = deletePrescriptionImage,
  appendAuditLogImpl = appendAuditLog,
  PrescriptionImageModel = PrescriptionImage,
  ClinicalRecordModel = ClinicalRecord,
} = {}) => {
  const resolveClinicalRecord = async (patientObjectId, recordId) => {
    if (!recordId || String(recordId).trim().length === 0) {
      const error = new Error('recordId is required');
      error.statusCode = 400;
      throw error;
    }

    const clinicalRecord = await ClinicalRecordModel.findOne({
      recordId: String(recordId).trim(),
      patientId: patientObjectId,
    }).lean();

    if (!clinicalRecord) {
      const error = new Error('Clinical record not found');
      error.statusCode = 404;
      throw error;
    }

    return clinicalRecord;
  };

  const createPrescriptionImage = async ({
    patientUser,
    patientId,
    recordId,
    buffer,
    mimeType,
    originalFilename,
    caption,
    tags,
  }) => {
    const patientObjectId = assertPrescriptionImageUploadAccess(patientUser, patientId);

    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
      const error = new Error('A non-empty file buffer is required');
      error.statusCode = 400;
      throw error;
    }

    if (!originalFilename || String(originalFilename).trim().length === 0) {
      const error = new Error('originalFilename is required');
      error.statusCode = 400;
      throw error;
    }

    assertMimeType(mimeType);

    const clinicalRecord = await resolveClinicalRecord(patientObjectId, recordId);

    const cloudinaryResult = await uploadPrescriptionImageImpl({
      buffer,
      patientId: patientObjectId.toString(),
      mimeType,
      originalFilename: String(originalFilename).trim(),
    });

    const uploadedAt = new Date();
    const imageId = buildImageId();

    let image;

    try {
      image = await PrescriptionImageModel.create({
        imageId,
        patientId: patientObjectId,
        clinicalRecordId: clinicalRecord._id,
        clinicalRecordRecordId: clinicalRecord.recordId,
        cloudinaryPublicId: cloudinaryResult.publicId,
        secureUrl: cloudinaryResult.secureUrl,
        originalFilename: String(originalFilename).trim(),
        mimeType,
        byteSize: cloudinaryResult.byteSize,
        caption: caption ? String(caption).trim() : undefined,
        tags: Array.isArray(tags)
          ? tags.map((t) => String(t).trim()).filter(Boolean)
          : [],
        uploadedAt,
      });
    } catch (error) {
      await deletePrescriptionImageImpl(cloudinaryResult.publicId).catch(() => {});
      throw error;
    }

    const updateResult = await ClinicalRecordModel.updateOne(
      { _id: clinicalRecord._id },
      { $push: { prescriptionImageIds: image._id } }
    );

    if (updateResult.matchedCount === 0) {
      await PrescriptionImageModel.deleteOne({ _id: image._id });
      await deletePrescriptionImageImpl(cloudinaryResult.publicId).catch(() => {});
      const error = new Error('Clinical record not found');
      error.statusCode = 404;
      throw error;
    }

    await appendAuditLogImpl({
      eventType: 'PRESCRIPTION_IMAGE_UPLOADED',
      actorId: patientUser._id,
      targetResourceType: 'PrescriptionImage',
      targetResourceId: image.imageId,
      payload: {
        patientId: patientObjectId.toString(),
        clinicalRecordId: clinicalRecord._id.toString(),
        clinicalRecordRecordId: clinicalRecord.recordId,
        cloudinaryPublicId: image.cloudinaryPublicId,
        mimeType: image.mimeType,
        byteSize: image.byteSize,
      },
    });

    return image.toObject();
  };

  const getPrescriptionImageById = async (imageId) => {
    if (!imageId || String(imageId).trim().length === 0) {
      const error = new Error('imageId is required');
      error.statusCode = 400;
      throw error;
    }

    return PrescriptionImageModel.findOne({ imageId: String(imageId).trim() }).lean();
  };

  const listPrescriptionImagesForRecord = async (patientId, recordId) => {
    const patientObjectId = toObjectId(patientId);

    if (!recordId || String(recordId).trim().length === 0) {
      const error = new Error('recordId is required');
      error.statusCode = 400;
      throw error;
    }

    return PrescriptionImageModel.find({
      patientId: patientObjectId,
      clinicalRecordRecordId: String(recordId).trim(),
    })
      .sort({ uploadedAt: -1 })
      .lean();
  };

  const listImagesForPatient = async (patientId) => {
    const patientObjectId = toObjectId(patientId);
    return PrescriptionImageModel.find({ patientId: patientObjectId })
      .sort({ uploadedAt: -1 })
      .lean();
  };

  const addComment = async ({ imageId, author, body }) => {
    if (!body || String(body).trim().length === 0) {
      const error = new Error('Comment body is required');
      error.statusCode = 400;
      throw error;
    }

    const image = await PrescriptionImageModel.findOne({
      imageId: String(imageId).trim(),
    });

    if (!image) {
      const error = new Error('Prescription image not found');
      error.statusCode = 404;
      throw error;
    }

    image.comments.push({
      authorId: author._id,
      authorRole: author.role,
      body: String(body).trim(),
      createdAt: new Date(),
    });

    await image.save();
    return image.comments[image.comments.length - 1].toObject();
  };

  const getComments = async (imageId) => {
    const image = await PrescriptionImageModel.findOne({
      imageId: String(imageId).trim(),
    })
      .populate('comments.authorId', 'demographics role')
      .lean();

    if (!image) {
      const error = new Error('Prescription image not found');
      error.statusCode = 404;
      throw error;
    }

    return image.comments;
  };

  const deletePrescriptionImageById = async ({ patientUser, imageId }) => {
    if (!imageId || String(imageId).trim().length === 0) {
      const error = new Error('imageId is required');
      error.statusCode = 400;
      throw error;
    }

    const image = await PrescriptionImageModel.findOne({ imageId: String(imageId).trim() });

    if (!image) {
      const error = new Error('Prescription image not found');
      error.statusCode = 404;
      throw error;
    }

    assertPrescriptionImageDeleteAccess(patientUser, image.patientId.toString());

    const cloudinaryPublicId = image.cloudinaryPublicId;
    const deletedImageId = image.imageId;
    const auditPayload = {
      patientId: image.patientId.toString(),
      clinicalRecordId: image.clinicalRecordId.toString(),
      clinicalRecordRecordId: image.clinicalRecordRecordId,
      cloudinaryPublicId,
    };

    await PrescriptionImageModel.deleteOne({ _id: image._id });
    await ClinicalRecordModel.updateOne(
      { _id: image.clinicalRecordId },
      { $pull: { prescriptionImageIds: image._id } }
    );

    await deletePrescriptionImageImpl(cloudinaryPublicId);

    await appendAuditLogImpl({
      eventType: 'PRESCRIPTION_IMAGE_DELETED',
      actorId: patientUser._id,
      targetResourceType: 'PrescriptionImage',
      targetResourceId: deletedImageId,
      payload: auditPayload,
    });

    return {
      imageId: deletedImageId,
      deleted: true,
    };
  };

  return {
    createPrescriptionImage,
    getPrescriptionImageById,
    listPrescriptionImagesForRecord,
    listImagesForPatient,
    addComment,
    getComments,
    deletePrescriptionImageById,
  };
};

const defaultService = createPrescriptionImageService();

module.exports = {
  buildImageId,
  createPrescriptionImageService,
  createPrescriptionImage: (...args) => defaultService.createPrescriptionImage(...args),
  getPrescriptionImageById: (...args) => defaultService.getPrescriptionImageById(...args),
  listPrescriptionImagesForRecord: (...args) =>
    defaultService.listPrescriptionImagesForRecord(...args),
  listImagesForPatient: (...args) => defaultService.listImagesForPatient(...args),
  addComment: (...args) => defaultService.addComment(...args),
  getComments: (...args) => defaultService.getComments(...args),
  deletePrescriptionImageById: (...args) => defaultService.deletePrescriptionImageById(...args),
};
