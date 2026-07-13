// backend/tests/models/adrReport.schema.test.js
const AdrReport = require('../../models/AdrReport');
const { buildAdrReport } = require('../helpers/adrReportFactory');

describe('AdrReport schema', () => {
  it('accepts a valid minimal ADR report document', async () => {
    const doc = new AdrReport(buildAdrReport());

    await expect(doc.validate()).resolves.toBeUndefined();
  });

  it('rejects missing patientId', async () => {
    const doc = new AdrReport(
      buildAdrReport({
        patientId: undefined,
      })
    );

    await expect(doc.validate()).rejects.toMatchObject({
      errors: expect.objectContaining({
        patientId: expect.anything(),
      }),
    });
  });

  it('rejects invalid severity enum values', async () => {
    const doc = new AdrReport(
      buildAdrReport({
        severity: 'MILD',
      })
    );

    await expect(doc.validate()).rejects.toMatchObject({
      errors: expect.objectContaining({
        severity: expect.anything(),
      }),
    });
  });

  it('rejects onsetDate after reportedAt', async () => {
    const reportedAt = new Date('2026-06-13T12:00:00.000Z');

    const doc = new AdrReport(
      buildAdrReport({
        reportedAt,
        onsetDate: new Date('2026-06-14T08:00:00.000Z'),
      })
    );

    await expect(doc.validate()).rejects.toMatchObject({
      errors: expect.objectContaining({
        onsetDate: expect.anything(),
      }),
    });
  });

  it('rejects suspectedDrug without drugName or rxnormCui', async () => {
    const doc = new AdrReport(
      buildAdrReport({
        suspectedDrug: {
          lotNumber: 'LOT-001',
        },
      })
    );

    await expect(doc.validate()).rejects.toMatchObject({
      errors: expect.objectContaining({
        suspectedDrug: expect.anything(),
      }),
    });
  });
});
