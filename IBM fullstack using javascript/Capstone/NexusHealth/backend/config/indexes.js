const {
  User,
  ClinicalRecord,
  ConsentRule,
  BreakGlassAuditLog,
  DrugInteractionRule,
  AuditLog,
  AdrReport,
  PrescriptionImage,
} = require('../models');

const createNamedIndex = async (collection, keys, options) => {
  try {
    await collection.createIndex(keys, options);
  } catch (error) {
    const isNameConflict =
      error.codeName === 'IndexOptionsConflict' ||
      error.message?.includes('already exists with a different name');

    if (!isNameConflict) {
      throw error;
    }

    const keySignature = JSON.stringify(keys);
    const existingIndexes = await collection.indexes();

    for (const index of existingIndexes) {
      if (JSON.stringify(index.key) === keySignature && index.name !== options.name) {
        await collection.dropIndex(index.name);
      }
    }

    await collection.createIndex(keys, options);
  }
};

const ensureIndexes = async () => {
  await User.collection.createIndex(
    { 'physicianProfile.npiNumber': 1 },
    { unique: true, sparse: true, name: 'physician_npi_unique' }
  );
  await User.collection.createIndex(
    { 'patientProfile.mrn': 1 },
    { unique: true, sparse: true, name: 'patient_mrn_unique' }
  );
  await User.collection.createIndex(
    { role: 1, accountStatus: 1 },
    { name: 'role_account_status' }
  );
  await User.collection.createIndex(
    { 'demographics.contactInfo.email': 1 },
    { unique: true, sparse: true, name: 'user_email_unique' }
  );

  await ClinicalRecord.collection.createIndex(
    { patientId: 1, domain: 1, createdAt: -1 },
    { name: 'patient_domain_date' }
  );
  await ClinicalRecord.collection.createIndex(
    { patientId: 1, createdAt: -1 },
    { name: 'patient_longitudinal_export' }
  );
  await ClinicalRecord.collection.createIndex(
    { patientId: 1, 'medications.activeList.rxnormCui': 1 },
    {
      partialFilterExpression: {
        'medications.activeList.0': { $exists: true },
      },
      name: 'patient_active_medications_rxnorm',
    }
  );
  await ClinicalRecord.collection.createIndex(
    { patientId: 1, 'allergies.allergenRxnormCui': 1 },
    { name: 'patient_allergy_rxnorm' }
  );
  await ClinicalRecord.collection.createIndex(
    { recordingPhysicianId: 1, createdAt: -1 },
    { name: 'physician_records_by_date' }
  );

  await ConsentRule.collection.createIndex(
    { patientId: 1, providerId: 1, status: 1 },
    {
      partialFilterExpression: { status: 'ACTIVE' },
      name: 'active_consent_provider_patient',
    }
  );
  await ConsentRule.collection.createIndex(
    { expiresAt: 1 },
    { expireAfterSeconds: 0, name: 'consent_ttl_expiry' }
  );
  await ConsentRule.collection.createIndex(
    { consentId: 1, versionNumber: -1 },
    { name: 'consent_version_chain' }
  );
  await ConsentRule.collection.createIndex(
    { episodeId: 1, status: 1 },
    { name: 'episode_consent_status' }
  );

  await BreakGlassAuditLog.collection.createIndex(
    {
      'complianceEscalation.reviewStatus': 1,
      'complianceEscalation.escalatedToQueueAt': 1,
    },
    {
      partialFilterExpression: {
        'complianceEscalation.reviewStatus': 'PENDING',
      },
      name: 'pending_compliance_review',
    }
  );
  await BreakGlassAuditLog.collection.createIndex(
    { targetPatientId: 1, eventCreatedAt: -1 },
    { name: 'patient_breakglass_history' }
  );
  await BreakGlassAuditLog.collection.createIndex(
    { initiatedBy: 1, eventCreatedAt: -1 },
    { name: 'physician_override_history' }
  );
  await BreakGlassAuditLog.collection.createIndex(
    { requestEventId: 1, recordPhase: 1 },
    { name: 'tier2_request_resolution' }
  );
  await BreakGlassAuditLog.collection.createIndex(
    {
      'tier2Authorization.retrospectiveReviewFlag': 1,
      'tier2Authorization.reviewDueBy': 1,
    },
    {
      partialFilterExpression: {
        tier: 'TIER_2_HARD_OVERRIDE',
        'tier2Authorization.retrospectiveReviewFlag': true,
      },
      name: 'tier2_retrospective_review_queue',
    }
  );

  await createNamedIndex(
    DrugInteractionRule.collection,
    { interactionPairHash: 1 },
    { unique: true, name: 'interaction_pair_hash_unique' }
  );
  await DrugInteractionRule.collection.createIndex(
    { drug1RxnormCui: 1, drug2RxnormCui: 1 },
    { name: 'drug_pair_lookup' }
  );
  await DrugInteractionRule.collection.createIndex(
    { tier: 1 },
    { name: 'interaction_tier' }
  );

  await AuditLog.collection.createIndex(
    { targetResourceType: 1, targetResourceId: 1, eventCreatedAt: -1 },
    { name: 'audit_resource_timeline' }
  );
  await AuditLog.collection.createIndex(
    { eventType: 1, eventCreatedAt: -1 },
    { name: 'audit_event_type_timeline' }
  );

  await AdrReport.collection.createIndex(
    { patientId: 1, reportedAt: -1 },
    { name: 'patient_adr_timeline' }
  );
  await createNamedIndex(
    AdrReport.collection,
    { reportId: 1 },
    { unique: true, name: 'adr_report_id_unique' }
  );
  await AdrReport.collection.createIndex(
    { severity: 1, reportedAt: -1 },
    { name: 'adr_severity_queue' }
  );
  await AdrReport.collection.createIndex(
    { 'regulatorySubmission.submittedToFda': 1, reportedAt: -1 },
    {
      partialFilterExpression: {
        'regulatorySubmission.submittedToFda': { $eq: false },
        severity: { $in: ['SERIOUS', 'LIFE_THREATENING', 'FATAL'] },
      },
      name: 'adr_unsubmitted_serious_queue',
    }
  );

  await PrescriptionImage.collection.createIndex(
    { patientId: 1, clinicalRecordRecordId: 1, uploadedAt: -1 },
    { name: 'patient_record_prescription_images' }
  );
  await createNamedIndex(
    PrescriptionImage.collection,
    { imageId: 1 },
    { unique: true, name: 'prescription_image_id_unique' }
  );
  await PrescriptionImage.collection.createIndex(
    { clinicalRecordId: 1 },
    { name: 'prescription_images_by_clinical_record' }
  );

  console.log('All collection indexes ensured');
};

module.exports = { ensureIndexes };
