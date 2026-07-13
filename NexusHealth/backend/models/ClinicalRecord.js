const mongoose = require('mongoose');
const {
  CLINICAL_DOMAINS,
  SENSITIVITY_CLASSIFICATIONS,
  DIAGNOSIS_STATUSES,
  DOSE_UNITS,
  DOSE_ROUTES,
  ALLERGY_SEVERITIES,
  INTERACTION_TIERS,
  LAB_INTERPRETATIONS,
} = require('../config/enums');

const doseSchema = new mongoose.Schema(
  {
    value: Number,
    unit: { type: String, enum: DOSE_UNITS },
    route: { type: String, enum: DOSE_ROUTES },
    frequency: String,
  },
  { _id: false }
);

const clinicalRecordSchema = new mongoose.Schema(
  {
    recordId: { type: String, required: true, unique: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    domain: { type: String, enum: CLINICAL_DOMAINS, required: true },
    sensitivityClassification: {
      type: String,
      enum: SENSITIVITY_CLASSIFICATIONS,
      default: 'STANDARD',
    },
    episodeId: String,
    recordingPhysicianId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    clinicalNote: {
      subjectiveText: String,
      objectiveText: String,
      assessmentText: String,
      planText: String,
    },
    diagnoses: [
      {
        icd10Code: String,
        description: String,
        diagnosedAt: Date,
        diagnosedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        status: { type: String, enum: DIAGNOSIS_STATUSES },
      },
    ],
    medications: {
      activeList: [
        {
          rxnormCui: String,
          drugName: String,
          ndfrtCode: String,
          dose: doseSchema,
          instructions: String,
          prescriptionId: String,
          prescribedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
          prescribedAt: Date,
          endDate: Date,
          lotNumber: String,
          batchNumber: String,
          ndc: String,
        },
      ],
      discontinuedList: [
        {
          rxnormCui: String,
          drugName: String,
          discontinuedAt: Date,
          discontinuedReason: String,
        },
      ],
    },
    allergies: [
      {
        allergenRxnormCui: String,
        allergenName: String,
        reactionDescription: String,
        meddraLltCode: String,
        meddraLltTerm: String,
        severity: { type: String, enum: ALLERGY_SEVERITIES },
        verifiedAt: Date,
        verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      },
    ],
    drugInteractionFlags: [
      {
        flagId: String,
        tier: { type: String, enum: INTERACTION_TIERS },
        offendingDrugRxnormCui: String,
        conflictingDrugRxnormCui: String,
        interactionMechanism: String,
        prescriberId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        acknowledgementJustification: String,
        flaggedAt: Date,
        acknowledgedAt: Date,
      },
    ],
    adrReportIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'AdrReport' }],
    prescriptionImageIds: [
      { type: mongoose.Schema.Types.ObjectId, ref: 'PrescriptionImage' },
    ],
    vitalSigns: [
      {
        recordedAt: Date,
        bloodPressureSystolic: Number,
        bloodPressureDiastolic: Number,
        heartRateBpm: Number,
        temperatureCelsius: Number,
        oxygenSaturationPercent: Number,
        weightKg: Number,
        heightCm: Number,
      },
    ],
    labResults: [
      {
        loincCode: String,
        testName: String,
        resultValue: mongoose.Schema.Types.Mixed,
        unit: String,
        referenceRange: String,
        interpretation: { type: String, enum: LAB_INTERPRETATIONS },
        collectedAt: Date,
        reportedAt: Date,
      },
    ],
    schemaVersion: { type: Number, default: 1 },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
    collection: 'clinicalRecords',
  }
);

module.exports = mongoose.model('ClinicalRecord', clinicalRecordSchema);
