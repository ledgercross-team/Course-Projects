// backend/tests/utils/cloudinaryClient.test.js
const {
  createCloudinaryClient,
  resolveCloudinaryConfig,
  resolveUploadFolder,
  DEFAULT_UPLOAD_FOLDER,
} = require('../../utils/cloudinaryClient');

const buildMockUploader = ({ uploadResult, destroyResult, uploadError, destroyError } = {}) => ({
  upload_stream: jest.fn((options, callback) => ({
    end: jest.fn((buffer) => {
      if (uploadError) {
        callback(uploadError);
        return;
      }

      callback(null, {
        public_id: uploadResult?.public_id || 'healthplatform/prescriptions/patient/sample',
        secure_url:
          uploadResult?.secure_url ||
          'https://res.cloudinary.com/demo/image/upload/v1/sample.jpg',
        bytes: uploadResult?.bytes ?? buffer.length,
        resource_type: 'image',
        ...uploadResult,
      });
    }),
  })),
  destroy: jest.fn(async () => {
    if (destroyError) {
      throw destroyError;
    }

    return destroyResult || { result: 'ok' };
  }),
});

describe('cloudinaryClient', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.CLOUDINARY_URL;
    delete process.env.CLOUDINARY_CLOUD_NAME;
    delete process.env.CLOUDINARY_API_KEY;
    delete process.env.CLOUDINARY_API_SECRET;
    delete process.env.CLOUDINARY_UPLOAD_FOLDER;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('resolveCloudinaryConfig returns configured true when CLOUDINARY_URL is set', () => {
    process.env.CLOUDINARY_URL = 'cloudinary://key:secret@demo';

    expect(resolveCloudinaryConfig()).toEqual({
      configured: true,
      uploadFolder: DEFAULT_UPLOAD_FOLDER,
      usesUrl: true,
    });
  });

  it('resolveCloudinaryConfig returns configured true for discrete env vars', () => {
    process.env.CLOUDINARY_CLOUD_NAME = 'demo';
    process.env.CLOUDINARY_API_KEY = 'key';
    process.env.CLOUDINARY_API_SECRET = 'secret';
    process.env.CLOUDINARY_UPLOAD_FOLDER = 'custom/prescriptions';

    expect(resolveCloudinaryConfig()).toEqual({
      configured: true,
      uploadFolder: 'custom/prescriptions',
      cloudName: 'demo',
      apiKey: 'key',
      apiSecret: 'secret',
      usesUrl: false,
    });
  });

  it('uploadPrescriptionImage returns Cloudinary metadata for a valid buffer', async () => {
    const uploaderImpl = buildMockUploader();
    const client = createCloudinaryClient({
      uploaderImpl,
      config: { configured: true, uploadFolder: DEFAULT_UPLOAD_FOLDER },
    });

    const buffer = Buffer.from('fake-image-bytes');
    const patientId = '665f1c2d3e4f5a6b7c8d9e0f';

    const result = await client.uploadPrescriptionImage({
      buffer,
      patientId,
      mimeType: 'image/jpeg',
      originalFilename: 'prescription.jpg',
    });

    expect(result).toEqual({
      publicId: 'healthplatform/prescriptions/patient/sample',
      secureUrl: 'https://res.cloudinary.com/demo/image/upload/v1/sample.jpg',
      byteSize: buffer.length,
      mimeType: 'image/jpeg',
      originalFilename: 'prescription.jpg',
    });

    expect(uploaderImpl.upload_stream).toHaveBeenCalledWith(
      expect.objectContaining({
        folder: `${DEFAULT_UPLOAD_FOLDER}/${patientId}`,
        resource_type: 'auto',
        use_filename: true,
        unique_filename: true,
        filename_override: 'prescription.jpg',
      }),
      expect.any(Function)
    );
  });

  it('throws CLOUDINARY_NOT_CONFIGURED when credentials are missing', async () => {
    const client = createCloudinaryClient({
      config: resolveCloudinaryConfig(),
    });

    await expect(
      client.uploadPrescriptionImage({
        buffer: Buffer.from('x'),
        patientId: '665f1c2d3e4f5a6b7c8d9e0f',
      })
    ).rejects.toMatchObject({
      code: 'CLOUDINARY_NOT_CONFIGURED',
      statusCode: 503,
    });
  });

  it('throws 400 when upload buffer is empty', async () => {
    const client = createCloudinaryClient({
      uploaderImpl: buildMockUploader(),
      config: { configured: true, uploadFolder: DEFAULT_UPLOAD_FOLDER },
    });

    await expect(
      client.uploadPrescriptionImage({
        buffer: Buffer.alloc(0),
        patientId: '665f1c2d3e4f5a6b7c8d9e0f',
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: 'A non-empty file buffer is required',
    });
  });

  it('deletePrescriptionImage destroys the Cloudinary asset by publicId', async () => {
    const uploaderImpl = buildMockUploader();
    const client = createCloudinaryClient({
      uploaderImpl,
      config: { configured: true, uploadFolder: DEFAULT_UPLOAD_FOLDER },
    });

    const result = await client.deletePrescriptionImage(
      'healthplatform/prescriptions/patient/sample'
    );

    expect(result).toEqual({
      publicId: 'healthplatform/prescriptions/patient/sample',
      result: 'ok',
    });
    expect(uploaderImpl.destroy).toHaveBeenCalledWith(
      'healthplatform/prescriptions/patient/sample',
      { resource_type: 'auto' }
    );
  });

  it('resolveUploadFolder falls back to default when env unset', () => {
    expect(resolveUploadFolder()).toBe(DEFAULT_UPLOAD_FOLDER);
  });
});
