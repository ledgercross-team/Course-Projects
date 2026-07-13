// backend/config/criticalInteractionRules.js
const { LOCAL_CACHE_SOURCE } = require('./drugCacheConstants');

const CRITICAL_PAIRS = [
  {
    ingredients: ['11289', '1191'],
    tier: 'HARD_STOP',
    mechanismDescription: 'Increased bleeding risk when warfarin is combined with aspirin',
    clinicalConsequence: 'Monitor INR closely; heightened risk of hemorrhage',
    evidenceLevel: 'MAJOR',
  },
];

const normalizePairKey = (a, b) => {
  const left = String(a).trim();
  const right = String(b).trim();
  return left <= right ? `${left}:${right}` : `${right}:${left}`;
};

const lookupCriticalPair = (rxcui1, rxcui2) => {
  const key = normalizePairKey(rxcui1, rxcui2);

  for (const rule of CRITICAL_PAIRS) {
    const [a, b] = rule.ingredients;
    if (normalizePairKey(a, b) === key) {
      const [drug1RxnormCui, drug2RxnormCui] =
        String(rxcui1).trim() <= String(rxcui2).trim()
          ? [String(rxcui1).trim(), String(rxcui2).trim()]
          : [String(rxcui2).trim(), String(rxcui1).trim()];

      return {
        tier: rule.tier,
        drug1RxnormCui,
        drug2RxnormCui,
        mechanismDescription: rule.mechanismDescription,
        clinicalConsequence: rule.clinicalConsequence,
        evidenceLevel: rule.evidenceLevel,
        sourceReference: LOCAL_CACHE_SOURCE,
      };
    }
  }

  return null;
};

const findCriticalPairAmongRxcuis = (rxcuisA = [], rxcuisB = []) => {
  const setA = [...new Set(rxcuisA.map(String))];
  const setB = [...new Set(rxcuisB.map(String))];

  for (const a of setA) {
    for (const b of setB) {
      if (a === b) continue;
      const match = lookupCriticalPair(a, b);
      if (match) return match;
    }
  }

  return null;
};

module.exports = {
  CRITICAL_PAIRS,
  lookupCriticalPair,
  findCriticalPairAmongRxcuis,
};
