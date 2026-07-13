// backend/services/polypharmacyService.js
const { checkPair } = require('./interactionCheckerService');
const { loadPatientClinicalContext } = require('./patientClinicalContext');

const mapPairTierToRiskLevel = (tier) => {
  if (tier === 'HARD_STOP') {
    return 'HIGH';
  }

  if (tier === 'SOFT_WARNING' || tier === 'INFORMATIONAL') {
    return 'MODERATE';
  }

  return 'LOW';
};

const computePolypharmacyRiskLevel = (flaggedPairs) => {
  if (flaggedPairs.some((pair) => pair.tier === 'HARD_STOP')) {
    return 'HIGH';
  }

  if (flaggedPairs.some((pair) => pair.tier === 'SOFT_WARNING' || pair.tier === 'INFORMATIONAL')) {
    return 'MODERATE';
  }

  return 'LOW';
};

const buildMedicationPairs = (activeMedications) => {
  const pairs = [];

  for (let i = 0; i < activeMedications.length; i += 1) {
    for (let j = i + 1; j < activeMedications.length; j += 1) {
      pairs.push([activeMedications[i], activeMedications[j]]);
    }
  }

  return pairs;
};

const createPolypharmacyService = ({
  checkPairImpl = checkPair,
  loadPatientClinicalContextImpl = loadPatientClinicalContext,
} = {}) => {
  const runPolypharmacyCheck = async (patientId) => {
    const { activeMedications } = await loadPatientClinicalContextImpl(patientId);
    const checkedAt = new Date();

    if (activeMedications.length < 2) {
      return {
        riskLevel: 'LOW',
        flaggedPairs: [],
        checkedAt: checkedAt.toISOString(),
        activeDrugCount: activeMedications.length,
      };
    }

    const flaggedPairs = [];

    for (const [drugA, drugB] of buildMedicationPairs(activeMedications)) {
      const pairResult = await checkPairImpl(drugA.rxnormCui, drugB.rxnormCui);

      if (pairResult.tier !== 'SAFE') {
        flaggedPairs.push({
          tier: pairResult.tier,
          riskLevel: mapPairTierToRiskLevel(pairResult.tier),
          drug1RxnormCui: pairResult.drug1RxnormCui,
          drug2RxnormCui: pairResult.drug2RxnormCui,
          drug1Name: drugA.drugName,
          drug2Name: drugB.drugName,
          mechanismDescription: pairResult.mechanismDescription,
          clinicalConsequence: pairResult.clinicalConsequence,
          evidenceLevel: pairResult.evidenceLevel,
          cached: pairResult.cached,
        });
      }
    }

    return {
      riskLevel: computePolypharmacyRiskLevel(flaggedPairs),
      flaggedPairs,
      checkedAt: checkedAt.toISOString(),
      activeDrugCount: activeMedications.length,
    };
  };

  return {
    runPolypharmacyCheck,
    computePolypharmacyRiskLevel,
    buildMedicationPairs,
  };
};

const defaultService = createPolypharmacyService();

module.exports = {
  mapPairTierToRiskLevel,
  computePolypharmacyRiskLevel,
  buildMedicationPairs,
  createPolypharmacyService,
  runPolypharmacyCheck: (...args) => defaultService.runPolypharmacyCheck(...args),
};
