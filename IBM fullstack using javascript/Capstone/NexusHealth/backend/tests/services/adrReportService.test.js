// backend/tests/services/adrReportService.test.js
const User = require('../../models/User');
const AdrReport = require('../../models/AdrReport');
const ClinicalRecord = require('../../models/ClinicalRecord');
const AuditLog = require('../../models/AuditLog');
const { createAdrReportService } = require('../../services/adrReportService');
const { buildPatient, buildPhysician, buildAdmin } = require('../helpers/userFactory');
const { buildClinicalRecord } = require('../helpers/clinicalRecordFactory');
const { connectTestDB, disconnectTestDB, clearDatabase } = require('../setup/mongo');

describe('adrReportService', () => {
  let patient;
  let physician;
  let normalizeSuspectedDrugImpl;
  let createAdrReport;

  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearDatabase();

    patient = await User.create(buildPatient({ userId: 'patient-adr-001' }));
    physician = await User.create(buildPhysician({ userId: 'physician-adr-001' }));

    normalizeSuspectedDrugImpl = jest.fn().mockResolvedValue({
      rxnormCui: '1191',
      drugName: 'Aspirin',
      lotNumber: undefined,
      batchNumber: undefined,
      ndc: undefined,
    });

    ({ createAdrReport } = createAdrReportService({
      normalizeSuspectedDrugImpl,
    }));
  });

  const buildPayload = (overrides = {}) => ({
    patientId: patient._id,
    suspectedDrug: { drugName: 'Aspirin' },
    meddraTerms: [{ lltCode: '10037844', lltTerm: 'Rash' }],
    severity: 'NON_SERIOUS',
    outcome: 'UNKNOWN',
    ...overrides,
  });

  it('creates an AdrReport and ADR_REPORTED audit on happy path', async () => {
    const report = await createAdrReport({
      reporterUser: patient,
      payload: buildPayload(),
    });

    expect(report.reportId).toMatch(/^adr-[0-9a-f-]{36}$/i);
    expect(report.suspectedDrug.rxnormCui).toBe('1191');
    expect(report.reportedBy).toBe('PATIENT');

    const persisted = await AdrReport.findOne({ reportId: report.reportId }).lean();
    expect(persisted).not.toBeNull();

    const auditEntry = await AuditLog.findOne({
      eventType: 'ADR_REPORTED',
      targetResourceId: report.reportId,
    }).lean();

    expect(auditEntry).not.toBeNull();
    expect(auditEntry.targetResourceType).toBe('AdrReport');
    expect(auditEntry.payload).toMatchObject({
      reportedBy: 'PATIENT',
      severity: 'NON_SERIOUS',
      suspectedDrugRxnormCui: '1191',
    });
  });

  it('links clinicalRecordId by pushing adrReportIds on the clinical record', async () => {
    const clinicalRecord = await ClinicalRecord.create(
      buildClinicalRecord({ patientId: patient._id })
    );

    const report = await createAdrReport({
      reporterUser: patient,
      payload: buildPayload({ clinicalRecordId: clinicalRecord._id }),
    });

    const updatedRecord = await ClinicalRecord.findById(clinicalRecord._id).lean();
    expect(updatedRecord.adrReportIds.map(String)).toContain(String(report._id));
  });

  it('rejects invalid meddraTerms with 400 and does not persist a report', async () => {
    await expect(
      createAdrReport({
        reporterUser: patient,
        payload: buildPayload({ meddraTerms: [] }),
      })
    ).rejects.toMatchObject({ statusCode: 400 });

    expect(await AdrReport.countDocuments()).toBe(0);
    expect(await AuditLog.countDocuments()).toBe(0);
  });

  it('returns 404 when clinicalRecordId belongs to a different patient', async () => {
    const otherPatient = await User.create(buildPatient({ userId: 'patient-adr-002', patientProfile: { mrn: 'MRN-10002', bloodType: 'A+' } }));
    const clinicalRecord = await ClinicalRecord.create(
      buildClinicalRecord({ patientId: otherPatient._id })
    );

    await expect(
      createAdrReport({
        reporterUser: patient,
        payload: buildPayload({ clinicalRecordId: clinicalRecord._id }),
      })
    ).rejects.toMatchObject({ statusCode: 404 });

    expect(await AdrReport.countDocuments()).toBe(0);
  });

  it('defaults prescribingPhysicianId to reporter when physician omits it', async () => {
    const report = await createAdrReport({
      reporterUser: physician,
      payload: buildPayload(),
    });

    expect(report.reportedBy).toBe('PHYSICIAN');
    expect(String(report.prescribingPhysicianId)).toBe(String(physician._id));

    const auditEntry = await AuditLog.findOne({
      targetResourceId: report.reportId,
    }).lean();

    expect(auditEntry.payload.reportedBy).toBe('PHYSICIAN');
    expect(auditEntry.payload.suspectedDrugRxnormCui).toBe('1191');
  });

  it('rejects unauthorized reporter roles with 403', async () => {
    const admin = await User.create(buildAdmin({ userId: 'admin-adr-svc-001', accountStatus: 'ACTIVE' }));

    await expect(
      createAdrReport({
        reporterUser: admin,
        payload: buildPayload(),
      })
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});
