// backend/services/interactionCheckerService.js
const DrugInteractionRule = require('../models/DrugInteractionRule');
const { checkInteraction } = require('./rxcheckClient');
const { getIngredientRxcuis } = require('./rxnormClient');
const { findCriticalPairAmongRxcuis } = require('../config/criticalInteractionRules');
const {
  LOCAL_CACHE_SOURCE,
  PAIR_HASH_PREFIX,
  RXCHECK_SOURCE,
  RXCHECK_NO_INTERACTION_SOURCE,
} = require('../config/drugCacheConstants');

const normalizePair = (rxcui1, rxcui2) => {
  const a = String(rxcui1).trim();
  const b = String(rxcui2).trim();
  return a <= b ? [a, b] : [b, a];
};

const buildPairHash = (rxcui1, rxcui2) => {
  const [drug1RxnormCui, drug2RxnormCui] = normalizePair(rxcui1, rxcui2);
  return `${PAIR_HASH_PREFIX}${drug1RxnormCui}:${drug2RxnormCui}`;
};

const mapSeverityToEvidenceLevel = (severity) => {
  switch (String(severity || '').toLowerCase()) {
    case 'contraindicated':
      return 'CONTRAINDICATED';
    case 'major':
      return 'MAJOR';
    case 'moderate':
      return 'MODERATE';
    case 'minor':
      return 'MINOR';
    default:
      return undefined;
  }
};

const mapSeverityToTier = (severity, oncHighPriority = false) => {
  const normalized = String(severity || '').toLowerCase();

  if (!normalized || normalized === 'none') {
    return 'SAFE';
  }

  switch (normalized) {
    case 'contraindicated':
    case 'major':
      return 'HARD_STOP';
    case 'moderate':
      return oncHighPriority ? 'HARD_STOP' : 'SOFT_WARNING';
    case 'minor':
      return oncHighPriority ? 'SOFT_WARNING' : 'INFORMATIONAL';
    default:
      return 'SAFE';
  }
};

const rxcheckInteractionIsInconclusive = (payload) => {
  const interaction = payload?.interaction;
  if (!interaction) {
    return true;
  }

  if (interaction.found === false) {
    return true;
  }

  const severity = String(interaction.severity || '').toLowerCase();
  return severity === 'none' || severity === '';
};

const parseRxCheckInteraction = (payload) => {
  if (rxcheckInteractionIsInconclusive(payload)) {
    return null;
  }

  const interaction = payload.interaction;
  const oncHighPriority = Boolean(interaction.onc_high_priority);
  const tier = mapSeverityToTier(interaction.severity, oncHighPriority);

  if (tier === 'SAFE') {
    return null;
  }

  return {
    tier,
    mechanismDescription: interaction.mechanism || undefined,
    clinicalConsequence: interaction.clinical_consequence || undefined,
    evidenceLevel: mapSeverityToEvidenceLevel(interaction.severity),
    oncHighPriority,
    rxcheck: {
      severity: interaction.severity,
      mechanism: interaction.mechanism || undefined,
      clinical_consequence: interaction.clinical_consequence || undefined,
      onc_high_priority: oncHighPriority,
      management: interaction.management || undefined,
    },
  };
};

const toCheckPairResult = (rule, source, { cached = false, oncHighPriority, rxcheck } = {}) => ({
  tier: rule.tier,
  drug1RxnormCui: rule.drug1RxnormCui,
  drug2RxnormCui: rule.drug2RxnormCui,
  mechanismDescription: rule.mechanismDescription,
  clinicalConsequence: rule.clinicalConsequence,
  evidenceLevel: rule.evidenceLevel,
  oncHighPriority,
  rxcheck,
  source,
  cached,
});

const readCachedPair = async (DrugInteractionRuleModel, rxcui1, rxcui2) => {
  const interactionPairHash = buildPairHash(rxcui1, rxcui2);

  return DrugInteractionRuleModel.findOne({
    interactionPairHash,
    sourceReference: { $nin: [LOCAL_CACHE_SOURCE, RXCHECK_NO_INTERACTION_SOURCE] },
  }).lean();
};

const upsertInteractionRule = async (
  DrugInteractionRuleModel,
  rxcui1,
  rxcui2,
  interaction
) => {
  const [drug1RxnormCui, drug2RxnormCui] = normalizePair(rxcui1, rxcui2);
  const interactionPairHash = buildPairHash(rxcui1, rxcui2);

  return DrugInteractionRuleModel.findOneAndUpdate(
    { interactionPairHash },
    {
      drug1RxnormCui,
      drug2RxnormCui,
      interactionPairHash,
      tier: interaction.tier,
      mechanismDescription: interaction.mechanismDescription,
      clinicalConsequence: interaction.clinicalConsequence,
      evidenceLevel: interaction.evidenceLevel,
      sourceReference: RXCHECK_SOURCE,
      lastUpdated: new Date(),
    },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  ).lean();
};

const resolveIngredientContext = async (getIngredientRxcuisImpl, rxcui1, rxcui2) => {
  const [ingredients1, ingredients2] = await Promise.all([
    getIngredientRxcuisImpl(rxcui1),
    getIngredientRxcuisImpl(rxcui2),
  ]);

  return {
    rxcuisA: [...new Set([String(rxcui1), ...ingredients1.map(String)])],
    rxcuisB: [...new Set([String(rxcui2), ...ingredients2.map(String)])],
    primary1: ingredients1[0] || String(rxcui1),
    primary2: ingredients2[0] || String(rxcui2),
  };
};

const createInteractionCheckerService = ({
  checkInteractionImpl = checkInteraction,
  getIngredientRxcuisImpl = getIngredientRxcuis,
  DrugInteractionRuleModel = DrugInteractionRule,
} = {}) => {
  const checkPair = async (rxcui1, rxcui2) => {
    if (!rxcui1 || !rxcui2) {
      const error = new Error('rxcui1 and rxcui2 are required');
      error.statusCode = 400;
      throw error;
    }

    const ingredientContext = await resolveIngredientContext(
      getIngredientRxcuisImpl,
      rxcui1,
      rxcui2,
    );

    const critical = findCriticalPairAmongRxcuis(
      ingredientContext.rxcuisA,
      ingredientContext.rxcuisB,
    );

    if (critical) {
      const [drug1RxnormCui, drug2RxnormCui] = normalizePair(rxcui1, rxcui2);
      return toCheckPairResult(
        {
          ...critical,
          drug1RxnormCui,
          drug2RxnormCui,
        },
        LOCAL_CACHE_SOURCE,
        { cached: false },
      );
    }

    const [drug1RxnormCui, drug2RxnormCui] = normalizePair(
      ingredientContext.primary1,
      ingredientContext.primary2,
    );

    const cached = await readCachedPair(
      DrugInteractionRuleModel,
      drug1RxnormCui,
      drug2RxnormCui,
    );

    if (cached) {
      return toCheckPairResult(cached, cached.sourceReference || RXCHECK_SOURCE, { cached: true });
    }

    const payload = await checkInteractionImpl(drug1RxnormCui, drug2RxnormCui);
    const parsed = parseRxCheckInteraction(payload);

    if (!parsed) {
      return {
        tier: 'SAFE',
        drug1RxnormCui,
        drug2RxnormCui,
        source: RXCHECK_NO_INTERACTION_SOURCE,
        cached: false,
      };
    }

    const saved = await upsertInteractionRule(
      DrugInteractionRuleModel,
      drug1RxnormCui,
      drug2RxnormCui,
      parsed,
    );

    return toCheckPairResult(saved, RXCHECK_SOURCE, {
      oncHighPriority: parsed.oncHighPriority,
      rxcheck: parsed.rxcheck,
    });
  };

  return {
    checkPair,
  };
};

const defaultService = createInteractionCheckerService();

module.exports = {
  RXCHECK_SOURCE,
  RXCHECK_NO_INTERACTION_SOURCE,
  PAIR_HASH_PREFIX,
  normalizePair,
  buildPairHash,
  mapSeverityToTier,
  mapSeverityToEvidenceLevel,
  rxcheckInteractionIsInconclusive,
  parseRxCheckInteraction,
  resolveIngredientContext,
  createInteractionCheckerService,
  checkPair: (...args) => defaultService.checkPair(...args),
};
