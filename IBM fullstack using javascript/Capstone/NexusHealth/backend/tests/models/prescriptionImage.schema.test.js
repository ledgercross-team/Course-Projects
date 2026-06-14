// backend/tests/models/prescriptionImage.schema.test.js
const PrescriptionImage = require('../../models/PrescriptionImage');
const { buildPrescriptionImage } = require('../helpers/prescriptionImageFactory');

describe('PrescriptionImage schema', () => {
  it('accepts a valid minimal prescription image document', async () => {
    const doc = new PrescriptionImage(buildPrescriptionImage());

    await expect(doc.validate()).resolves.toBeUndefined();
  });

  it('rejects missing patientId', async () => {
    const doc = new PrescriptionImage(
      buildPrescriptionImage({
        patientId: undefined,
      })
    );

    await expect(doc.validate()).rejects.toMatchObject({
      errors: expect.objectContaining({
        patientId: expect.anything(),
      }),
    });
  });

  it('rejects invalid imageId format', async () => {
    const doc = new PrescriptionImage(
      buildPrescriptionImage({
        imageId: 'bad-id',
      })
    );

    await expect(doc.validate()).rejects.toMatchObject({
      errors: expect.objectContaining({
        imageId: expect.anything(),
      }),
    });
  });

  it('rejects invalid mimeType enum values', async () => {
    const doc = new PrescriptionImage(
      buildPrescriptionImage({
        mimeType: 'image/gif',
      })
    );

    await expect(doc.validate()).rejects.toMatchObject({
      errors: expect.objectContaining({
        mimeType: expect.anything(),
      }),
    });
  });

  it('rejects byteSize of zero', async () => {
    const doc = new PrescriptionImage(
      buildPrescriptionImage({
        byteSize: 0,
      })
    );

    await expect(doc.validate()).rejects.toMatchObject({
      errors: expect.objectContaining({
        byteSize: expect.anything(),
      }),
    });
  });
});
