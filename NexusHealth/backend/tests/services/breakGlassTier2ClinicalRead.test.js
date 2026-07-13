const User = require('../../models/User');
const ClinicalRecord = require('../../models/ClinicalRecord');
const {
  initiateTier2Request,
  approveTier2Request,
} = require('../../services/breakGlassService');
const { listPatientRecords } = require('../../services/clinicalRecordQueryService');
const { buildPatient, buildPhysician, buildCmo } = require('../helpers/userFactory');
const { buildClinicalRecord } = require('../helpers/clinicalRecordFactory');
const { connectTestDB, disconnectTestDB, clearDatabase } = require('../setup/mongo');

describe('break-glass Tier 2 clinical read integration', () => {
  let patient;
  let physician;
  let cmo;

  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearDatabase();

    patient = await User.create(buildPatient({ userId: 'patient-tier2-read-001', accountStatus: 'ACTIVE' }));
    physician = await User.create(
      buildPhysician({ userId: 'physician-tier2-read-001', accountStatus: 'ACTIVE' })
    );
    cmo = await User.create(buildCmo({ userId: 'cmo-tier2-read-001', accountStatus: 'ACTIVE' }));

    await ClinicalRecord.create(
      buildClinicalRecord({
        recordId: 'rec-tier2-cardio',
        patientId: patient._id,
        domain: 'CARDIOLOGY',
        episodeId: 'episode-tier2-read-001',
      })
    );

    await ClinicalRecord.create(
      buildClinicalRecord({
        recordId: 'rec-tier2-psych',
        patientId: patient._id,
        domain: 'PSYCHIATRY',
        episodeId: 'episode-tier2-read-001',
      })
    );
  });

  it('grants full patient record access after CMO approves Tier 2 request', async () => {
    const { breakGlassLog } = await initiateTier2Request({
      physicianMongoId: physician._id,
      targetPatientId: patient._id,
      clinicalJustificationCode: 'LIFE_THREATENING_EVENT',
      freeTextReason: 'Post-approval unrestricted read',
    });

    const approval = await approveTier2Request({
      requestEventId: breakGlassLog.eventId,
      cmoMongoId: cmo._id,
    });

    const records = await listPatientRecords({
      clinicalReadScope: {
        type: 'BREAK_GLASS_TIER2',
        unrestricted: true,
        patientId: patient._id.toString(),
        breakGlassEventId: approval.approvalLog.eventId,
        requestEventId: breakGlassLog.eventId,
      },
      patientId: patient._id,
    });

    expect(records).toHaveLength(2);
    expect(records.map((record) => record.domain)).toEqual(
      expect.arrayContaining(['CARDIOLOGY', 'PSYCHIATRY'])
    );
  });
});
