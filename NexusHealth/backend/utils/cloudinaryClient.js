// backend/utils/cloudinaryClient.js
const cloudinary = require('cloudinary').v2;

const DEFAULT_UPLOAD_FOLDER = 'healthplatform/prescriptions';

const resolveUploadFolder = () =>
  process.env.CLOUDINARY_UPLOAD_FOLDER || DEFAULT_UPLOAD_FOLDER;

const resolveCloudinaryConfig = () => {
  const uploadFolder = resolveUploadFolder();

  if (process.env.CLOUDINARY_URL) {
    return { configured: true, uploadFolder, usesUrl: true };
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (cloudName && apiKey && apiSecret) {
    return {
      configured: true,
      uploadFolder,
      cloudName,
      apiKey,
      apiSecret,
      usesUrl: false,
    };
  }

  return { configured: false, uploadFolder };
};

const configureCloudinary = (config = resolveCloudinaryConfig()) => {
  if (!config.configured) {
    return;
  }

  if (config.usesUrl) {
    cloudinary.config({ secure: true });
    return;
  }

  cloudinary.config({
    cloud_name: config.cloudName,
    api_key: config.apiKey,
    api_secret: config.apiSecret,
    secure: true,
  });
};

const uploadBuffer = (uploader, buffer, options) =>
  new Promise((resolve, reject) => {
    const uploadStream = uploader.upload_stream(options, (error, result) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(result);
    });

    uploadStream.end(buffer);
  });

const createCloudinaryClient = ({
  uploaderImpl,
  config = resolveCloudinaryConfig(),
  configureImpl = configureCloudinary,
} = {}) => {
  const getUploader = () => {
    if (uploaderImpl) {
      return uploaderImpl;
    }

    configureImpl(config);
    return cloudinary.uploader;
  };

  const assertConfigured = () => {
    if (!config.configured) {
      const error = new Error('Cloudinary credentials are not configured');
      error.statusCode = 503;
      error.code = 'CLOUDINARY_NOT_CONFIGURED';
      throw error;
    }
  };

  const buildUploadFolder = (patientId) => {
    const patientSegment = String(patientId).trim();
    return `${config.uploadFolder}/${patientSegment}`;
  };

  const uploadPrescriptionImage = async ({
    buffer,
    patientId,
    mimeType,
    originalFilename,
  }) => {
    assertConfigured();

    if (!patientId || String(patientId).trim().length === 0) {
      const error = new Error('patientId is required for prescription image upload');
      error.statusCode = 400;
      throw error;
    }

    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
      const error = new Error('A non-empty file buffer is required');
      error.statusCode = 400;
      throw error;
    }

    const uploader = getUploader();
    const folder = buildUploadFolder(patientId);

    const uploadOptions = {
      folder,
      resource_type: 'auto',
    };

    if (originalFilename) {
      uploadOptions.public_id = undefined;
      uploadOptions.use_filename = true;
      uploadOptions.unique_filename = true;
      uploadOptions.filename_override = String(originalFilename).trim();
    }

    if (mimeType) {
      uploadOptions.format = mimeType === 'application/pdf' ? 'pdf' : undefined;
    }

    try {
      const result = await uploadBuffer(uploader, buffer, uploadOptions);

      if (!result?.public_id || !result?.secure_url) {
        const error = new Error('Cloudinary upload returned an incomplete response');
        error.statusCode = 502;
        error.code = 'CLOUDINARY_UPLOAD_FAILED';
        throw error;
      }

      return {
        publicId: result.public_id,
        secureUrl: result.secure_url,
        byteSize: result.bytes ?? buffer.length,
        mimeType: mimeType || result.resource_type,
        originalFilename: originalFilename ? String(originalFilename).trim() : undefined,
      };
    } catch (error) {
      if (error.statusCode) {
        throw error;
      }

      const wrapped = new Error(`Cloudinary upload failed: ${error.message}`);
      wrapped.statusCode = 502;
      wrapped.code = 'CLOUDINARY_UPLOAD_FAILED';
      throw wrapped;
    }
  };

  const deletePrescriptionImage = async (publicId) => {
    assertConfigured();

    if (!publicId || String(publicId).trim().length === 0) {
      const error = new Error('cloudinaryPublicId is required');
      error.statusCode = 400;
      throw error;
    }

    const uploader = getUploader();

    try {
      const result = await uploader.destroy(String(publicId).trim(), { resource_type: 'auto' });

      if (result?.result !== 'ok' && result?.result !== 'not found') {
        const error = new Error('Cloudinary delete returned an unexpected result');
        error.statusCode = 502;
        error.code = 'CLOUDINARY_DELETE_FAILED';
        throw error;
      }

      return { publicId: String(publicId).trim(), result: result.result };
    } catch (error) {
      if (error.statusCode) {
        throw error;
      }

      const wrapped = new Error(`Cloudinary delete failed: ${error.message}`);
      wrapped.statusCode = 502;
      wrapped.code = 'CLOUDINARY_DELETE_FAILED';
      throw wrapped;
    }
  };

  return {
    uploadPrescriptionImage,
    deletePrescriptionImage,
    buildUploadFolder,
  };
};

const defaultClient = createCloudinaryClient();

module.exports = {
  DEFAULT_UPLOAD_FOLDER,
  resolveUploadFolder,
  resolveCloudinaryConfig,
  configureCloudinary,
  createCloudinaryClient,
  uploadPrescriptionImage: (...args) => defaultClient.uploadPrescriptionImage(...args),
  deletePrescriptionImage: (...args) => defaultClient.deletePrescriptionImage(...args),
};
