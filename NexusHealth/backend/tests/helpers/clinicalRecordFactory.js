const mongoose = require('mongoose');

const buildClinicalRecord = (overrides = {}) => ({
  recordId: `rec-${Math.random().toString(36).slice(2, 10)}`,
  patientId: new mongoose.Types.ObjectId(),
  domain: 'CARDIOLOGY',
  sensitivityClassification: 'STANDARD',
  episodeId: 'referral-episode-88',
  clinicalNote: {
    subjectiveText: 'Patient reports chest tightness during exertion.',
    assessmentText: 'Stable angina under evaluation.',
  },
  medications: {
    activeList: [
      {
        rxnormCui: '153165',
        drugName: 'Lisinopril 10 MG',
        prescribedAt: new Date('2026-01-10T10:00:00.000Z'),
      },
    ],
    discontinuedList: [],
  },
  allergies: [],
  ...overrides,
});

module.exports = { buildClinicalRecord };
