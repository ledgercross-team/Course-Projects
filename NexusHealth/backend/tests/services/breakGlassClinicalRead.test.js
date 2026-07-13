const User = require('../../models/User');
const ClinicalRecord = require('../../models/ClinicalRecord');
const { initiateTier1SoftOverride } = require('../../services/breakGlassService');
const { listPatientRecords } = require('../../services/clinicalRecordQueryService');
const { buildPatient, buildPhysician } = require('../helpers/userFactory');
const { buildClinicalRecord } = require('../helpers/clinicalRecordFactory');
const { connectTestDB, disconnectTestDB, clearDatabase } = require('../setup/mongo');

describe('break-glass clinical read integration', () => {
  let patient;
  let physician;

  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearDatabase();

    patient = await User.create(buildPatient({ userId: 'patient-bg-read-001', accountStatus: 'ACTIVE' }));
    physician = await User.create(
      buildPhysician({ userId: 'physician-bg-read-001', accountStatus: 'ACTIVE' })
    );

    await ClinicalRecord.create(
      buildClinicalRecord({
        recordId: 'rec-cardio-bg',
        patientId: patient._id,
        domain: 'CARDIOLOGY',
        episodeId: 'episode-bg-001',
      })
    );

    await ClinicalRecord.create(
      buildClinicalRecord({
        recordId: 'rec-psych-bg',
        patientId: patient._id,
        domain: 'PSYCHIATRY',
        episodeId: 'episode-bg-001',
        clinicalNote: { assessmentText: 'Restricted psychiatric note' },
      })
    );
  });

  it('grants full patient record access during an active Tier 1 override', async () => {
    const { breakGlassLog } = await initiateTier1SoftOverride({
      physicianMongoId: physician._id,
      targetPatientId: patient._id,
      clinicalJustificationCode: 'EMERGENCY_DEPARTMENT',
      freeTextReason: 'Emergency department evaluation',
    });

    const records = await listPatientRecords({
      clinicalReadScope: {
        type: 'BREAK_GLASS_TIER1',
        unrestricted: true,
        patientId: patient._id.toString(),
        breakGlassEventId: breakGlassLog.eventId,
      },
      patientId: patient._id,
    });

    expect(records).toHaveLength(2);
    expect(records.map((record) => record.domain)).toEqual(
      expect.arrayContaining(['CARDIOLOGY', 'PSYCHIATRY'])
    );
  });
});
