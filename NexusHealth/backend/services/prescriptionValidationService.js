// backend/services/prescriptionValidationService.js
const crypto = require('crypto');
const { ClinicalRecord, AuditLog, User } = require('../models');
const { appendAuditLog } = require('../utils/auditLogWriter');
const { resolveDrugName } = require('./drugResolverService');
const { checkPair } = require('./interactionCheckerService');
const { checkAllergyInteractions, buildOpenFdaExcerpts } = require('./allergyInteractionService');
const { fetchDrugLabel, OpenFdaNotFoundError } = require('./openFdaClient');
const { formatPrescriber } = require('./prescriptionListService');
const {
  loadPatientClinicalContext,
  findClinicalRecordForInteractionFlag,
} = require('./patientClinicalContext');

const buildValidationEventId = () => `val-${crypto.randomUUID()}`;
const buildFlagId = () => `flag-${crypto.randomUUID()}`;

const mapInteractionTierToDecision = (tier) => {
  if (tier === 'HARD_STOP') {
    return 'HARD_STOP';
  }

  if (tier === 'SOFT_WARNING') {
    return 'SOFT_WARNING';
  }

  return 'SAFE';
};

const computeWorstDecision = (interactionDecisions, allergyDecision) => {
  const decisions = [...interactionDecisions, allergyDecision];

  if (decisions.includes('HARD_STOP')) {
    return 'HARD_STOP';
  }

  if (decisions.includes('SOFT_WARNING')) {
    return 'SOFT_WARNING';
  }

  return 'SAFE';
};

const computeOverrideType = (interactions = [], allergyFlags = []) => {
  const hasInteractions = interactions.length > 0;
  const hasAllergies = allergyFlags.length > 0;

  if (hasInteractions && hasAllergies) {
    return 'MIXED';
  }

  if (hasAllergies) {
    return 'ALLERGY';
  }

  if (hasInteractions) {
    return 'DRUG_DRUG';
  }

  return null;
};

const computeRequiresAcknowledgement = (decision) => decision !== 'SAFE';

const createPrescriptionValidationService = ({
  resolveDrugNameImpl = resolveDrugName,
  checkPairImpl = checkPair,
  checkAllergyInteractionsImpl = checkAllergyInteractions,
  appendAuditLogImpl = appendAuditLog,
  loadPatientClinicalContextImpl = loadPatientClinicalContext,
  ClinicalRecordModel = ClinicalRecord,
  AuditLogModel = AuditLog,
  UserModel = User,
} = {}) => {
  const validatePrescription = async ({
    patientId,
    newDrugName,
    newDrugRxnormCui,
    icdCodeContext,
    dose,
    physicianMongoId,
    consent,
  }) => {
    if (!newDrugName || String(newDrugName).trim().length === 0) {
      const error = new Error('newDrugName is required');
      error.statusCode = 400;
      throw error;
    }

    const { patientObjectId, activeMedications, allergies } =
      await loadPatientClinicalContextImpl(patientId, {
        consent,
        prescribingPhysicianId: physicianMongoId,
        autoBootstrap: true,
      });

    let resolvedDrug;

    if (newDrugRxnormCui) {
      resolvedDrug = {
        rxcui: String(newDrugRxnormCui).trim(),
        name: String(newDrugName).trim(),
        source: 'PROVIDED',
      };
    } else {
      resolvedDrug = await resolveDrugNameImpl(String(newDrugName).trim());
    }

    const interactions = [];

    const prescriberIds = [
      ...new Set(
        activeMedications
          .map((medication) => medication.prescribedBy?.toString())
          .filter(Boolean),
      ),
    ];
    const prescribers = prescriberIds.length
      ? await UserModel.find({ _id: { $in: prescriberIds } }).lean()
      : [];
    const prescriberById = Object.fromEntries(
      prescribers.map((user) => [user._id.toString(), user]),
    );

    for (const medication of activeMedications) {
      if (medication.rxnormCui === resolvedDrug.rxcui) {
        continue;
      }

      const pairResult = await checkPairImpl(medication.rxnormCui, resolvedDrug.rxcui);
      if (pairResult.tier !== 'SAFE') {
        const prescriber = formatPrescriber(
          prescriberById[medication.prescribedBy?.toString()],
        );

        interactions.push({
          tier: pairResult.tier,
          drug1RxnormCui: pairResult.drug1RxnormCui,
          drug2RxnormCui: pairResult.drug2RxnormCui,
          activeDrugName: medication.drugName,
          newDrugName: resolvedDrug.name,
          prescribedByPhysicianId: prescriber?.id,
          prescribedByName: prescriber?.displayName,
          mechanismDescription: pairResult.mechanismDescription,
          clinicalConsequence: pairResult.clinicalConsequence,
          evidenceLevel: pairResult.evidenceLevel,
          oncHighPriority: pairResult.oncHighPriority,
          rxcheck: pairResult.rxcheck,
        });
      }
    }

    const allergyResult = await checkAllergyInteractionsImpl(resolvedDrug.rxcui, allergies);

    let openFdaForNewDrug = allergyResult.openFda;
    if (!openFdaForNewDrug && interactions.length > 0) {
      try {
        const labelSections = await fetchDrugLabel(resolvedDrug.rxcui);
        openFdaForNewDrug = buildOpenFdaExcerpts(labelSections);
      } catch (error) {
        if (!(error instanceof OpenFdaNotFoundError)) {
          throw error;
        }
      }
    }

    if (openFdaForNewDrug) {
      for (const interaction of interactions) {
        interaction.openFda = openFdaForNewDrug;
      }
    }

    const allergyFlags = allergyResult.matchedAllergens.map((allergen) => ({
      ...allergen,
      tier: 'HARD_STOP',
      newDrugRxnormCui: resolvedDrug.rxcui,
      newDrugName: resolvedDrug.name,
      openFda: allergyResult.openFda,
    }));

    const interactionDecisions = interactions.map((interaction) =>
      mapInteractionTierToDecision(interaction.tier)
    );
    const decision = computeWorstDecision(interactionDecisions, allergyResult.decision);
    const requiresAcknowledgement = computeRequiresAcknowledgement(decision);
    const overrideType = requiresAcknowledgement
      ? computeOverrideType(interactions, allergyFlags)
      : null;
    const validationEventId = buildValidationEventId();

    await appendAuditLogImpl({
      eventType: 'PRESCRIPTION_VALIDATED',
      actorId: physicianMongoId,
      targetResourceType: 'PrescriptionValidation',
      targetResourceId: validationEventId,
      payload: {
        patientId: patientObjectId.toString(),
        decision,
        blocked: false,
        requiresAcknowledgement,
        overrideType,
        newDrugName: resolvedDrug.name,
        newDrugRxnormCui: resolvedDrug.rxcui,
        drugResolutionSource: resolvedDrug.source,
        icdCodeContext,
        dose,
        interactions,
        allergyFlags,
      },
    });

    return {
      validationEventId,
      decision,
      blocked: false,
      requiresAcknowledgement,
      overrideType,
      newDrugName: resolvedDrug.name,
      newDrugRxnormCui: resolvedDrug.rxcui,
      interactions,
      allergyFlags,
    };
  };

  const validatePrescriptionBatch = async ({
    patientId,
    medications,
    prescriptionNote,
    physicianMongoId,
    consent,
  }) => {
    if (!Array.isArray(medications) || medications.length === 0) {
      const error = new Error('medications must be a non-empty array');
      error.statusCode = 400;
      throw error;
    }

    const { patientObjectId, activeMedications, allergies } =
      await loadPatientClinicalContextImpl(patientId, {
        consent,
        prescribingPhysicianId: physicianMongoId,
        autoBootstrap: true,
      });

    const resolvedMedications = [];
    const seenRxcuis = new Set();

    for (const medication of medications) {
      if (!medication?.newDrugName || String(medication.newDrugName).trim().length === 0) {
        const error = new Error('Each medication requires newDrugName');
        error.statusCode = 400;
        throw error;
      }

      let resolvedDrug;
      if (medication.newDrugRxnormCui) {
        resolvedDrug = {
          rxcui: String(medication.newDrugRxnormCui).trim(),
          name: String(medication.newDrugName).trim(),
          source: 'PROVIDED',
        };
      } else {
        resolvedDrug = await resolveDrugNameImpl(String(medication.newDrugName).trim());
      }

      if (seenRxcuis.has(resolvedDrug.rxcui)) {
        const error = new Error('Duplicate drugs are not allowed in the same order');
        error.statusCode = 400;
        throw error;
      }

      seenRxcuis.add(resolvedDrug.rxcui);
      resolvedMedications.push({
        resolvedDrug,
        dose: medication.dose,
      });
    }

    const prescriberIds = [
      ...new Set(
        activeMedications
          .map((medication) => medication.prescribedBy?.toString())
          .filter(Boolean),
      ),
    ];
    const prescribers = prescriberIds.length
      ? await UserModel.find({ _id: { $in: prescriberIds } }).lean()
      : [];
    const prescriberById = Object.fromEntries(
      prescribers.map((user) => [user._id.toString(), user]),
    );

    const interactions = [];
    const allergyFlags = [];
    const allergyDecisions = [];
    const virtualActive = [...activeMedications];

    for (const item of resolvedMedications) {
      const { resolvedDrug, dose } = item;
      const allergyResult = await checkAllergyInteractionsImpl(resolvedDrug.rxcui, allergies);
      allergyDecisions.push(allergyResult.decision);

      for (const allergen of allergyResult.matchedAllergens) {
        allergyFlags.push({
          ...allergen,
          tier: 'HARD_STOP',
          newDrugRxnormCui: resolvedDrug.rxcui,
          newDrugName: resolvedDrug.name,
          openFda: allergyResult.openFda,
        });
      }

      for (const medication of virtualActive) {
        if (medication.rxnormCui === resolvedDrug.rxcui) {
          continue;
        }

        const pairResult = await checkPairImpl(medication.rxnormCui, resolvedDrug.rxcui);
        if (pairResult.tier !== 'SAFE') {
          const prescriber = formatPrescriber(
            prescriberById[medication.prescribedBy?.toString()],
          );

          interactions.push({
            tier: pairResult.tier,
            drug1RxnormCui: pairResult.drug1RxnormCui,
            drug2RxnormCui: pairResult.drug2RxnormCui,
            activeDrugName: medication.drugName,
            newDrugName: resolvedDrug.name,
            prescribedByPhysicianId: prescriber?.id,
            prescribedByName: prescriber?.displayName,
            mechanismDescription: pairResult.mechanismDescription,
            clinicalConsequence: pairResult.clinicalConsequence,
            evidenceLevel: pairResult.evidenceLevel,
            oncHighPriority: pairResult.oncHighPriority,
            rxcheck: pairResult.rxcheck,
          });
        }
      }

      virtualActive.push({
        rxnormCui: resolvedDrug.rxcui,
        drugName: resolvedDrug.name,
        prescribedBy: physicianMongoId,
        dose,
      });
    }

    if (interactions.length > 0) {
      for (const item of resolvedMedications) {
        try {
          const labelSections = await fetchDrugLabel(item.resolvedDrug.rxcui);
          const openFdaForDrug = buildOpenFdaExcerpts(labelSections);
          for (const interaction of interactions) {
            if (interaction.newDrugName === item.resolvedDrug.name) {
              interaction.openFda = openFdaForDrug;
            }
          }
        } catch (error) {
          if (!(error instanceof OpenFdaNotFoundError)) {
            throw error;
          }
        }
      }
    }

    const interactionDecisions = interactions.map((interaction) =>
      mapInteractionTierToDecision(interaction.tier),
    );
    const allergyDecision = allergyDecisions.reduce(
      (worst, current) => computeWorstDecision([worst], current),
      'SAFE',
    );
    const decision = computeWorstDecision(interactionDecisions, allergyDecision);
    const requiresAcknowledgement = computeRequiresAcknowledgement(decision);
    const overrideType = requiresAcknowledgement
      ? computeOverrideType(interactions, allergyFlags)
      : null;
    const validationEventId = buildValidationEventId();
    const normalizedMedications = resolvedMedications.map((item) => ({
      newDrugName: item.resolvedDrug.name,
      newDrugRxnormCui: item.resolvedDrug.rxcui,
      dose: item.dose,
    }));
    const trimmedNote = prescriptionNote?.trim() || undefined;

    await appendAuditLogImpl({
      eventType: 'PRESCRIPTION_VALIDATED',
      actorId: physicianMongoId,
      targetResourceType: 'PrescriptionValidation',
      targetResourceId: validationEventId,
      payload: {
        patientId: patientObjectId.toString(),
        decision,
        blocked: false,
        requiresAcknowledgement,
        overrideType,
        medications: normalizedMedications,
        prescriptionNote: trimmedNote,
        newDrugName: normalizedMedications[0].newDrugName,
        newDrugRxnormCui: normalizedMedications[0].newDrugRxnormCui,
        interactions,
        allergyFlags,
      },
    });

    return {
      validationEventId,
      decision,
      blocked: false,
      requiresAcknowledgement,
      overrideType,
      medications: normalizedMedications,
      prescriptionNote: trimmedNote,
      interactions,
      allergyFlags,
    };
  };

  const acknowledgePrescriptionWarning = async ({
    validationEventId,
    acknowledgementJustification,
    physicianMongoId,
  }) => {
    if (!validationEventId || String(validationEventId).trim().length === 0) {
      const error = new Error('validationEventId is required');
      error.statusCode = 400;
      throw error;
    }

    if (!acknowledgementJustification || String(acknowledgementJustification).trim().length === 0) {
      const error = new Error('acknowledgementJustification is required');
      error.statusCode = 400;
      throw error;
    }

    const validationAudit = await AuditLogModel.findOne({
      targetResourceId: validationEventId,
      eventType: 'PRESCRIPTION_VALIDATED',
    }).lean();

    if (!validationAudit) {
      const error = new Error('Validation event not found');
      error.statusCode = 404;
      throw error;
    }

    if (!['SOFT_WARNING', 'HARD_STOP'].includes(validationAudit.payload?.decision)) {
      const error = new Error('Only warning validations may be acknowledged');
      error.statusCode = 409;
      throw error;
    }

    const existingAck = await AuditLogModel.findOne({
      targetResourceId: validationEventId,
      eventType: 'PRESCRIPTION_ACKNOWLEDGED',
    }).lean();

    if (existingAck) {
      const error = new Error('Validation event has already been acknowledged');
      error.statusCode = 409;
      throw error;
    }

    const patientObjectId = validationAudit.payload.patientId;
    const { records } = await loadPatientClinicalContextImpl(patientObjectId, {
      prescribingPhysicianId: physicianMongoId,
      autoBootstrap: true,
    });

    const primaryInteraction = validationAudit.payload.interactions?.[0];
    const primaryAllergy = validationAudit.payload.allergyFlags?.[0];
    const conflictingDrugRxnormCui =
      primaryInteraction?.drug1RxnormCui === validationAudit.payload.newDrugRxnormCui
        ? primaryInteraction?.drug2RxnormCui
        : primaryInteraction?.drug1RxnormCui || primaryAllergy?.allergenRxnormCui;

    const interactionMechanism =
      primaryInteraction?.mechanismDescription ||
      (primaryAllergy
        ? `Allergy contraindication: ${primaryAllergy.allergenName}`
        : undefined);

    const targetRecordSnapshot = findClinicalRecordForInteractionFlag(records, {
      newDrugRxnormCui: validationAudit.payload.newDrugRxnormCui,
      conflictingDrugRxnormCui,
    });

    if (!targetRecordSnapshot) {
      const error = new Error('Clinical record not found for validation patient');
      error.statusCode = 404;
      throw error;
    }

    const clinicalRecord = await ClinicalRecordModel.findOne({
      recordId: targetRecordSnapshot.recordId,
      patientId: patientObjectId,
    }).exec();

    if (!clinicalRecord) {
      const error = new Error('Clinical record not found for validation patient');
      error.statusCode = 404;
      throw error;
    }

    const flaggedAt = new Date();
    const trimmedJustification = String(acknowledgementJustification).trim();

    clinicalRecord.drugInteractionFlags.push({
      flagId: buildFlagId(),
      tier: validationAudit.payload.decision,
      offendingDrugRxnormCui: validationAudit.payload.newDrugRxnormCui,
      conflictingDrugRxnormCui,
      interactionMechanism,
      prescriberId: physicianMongoId,
      acknowledgedBy: physicianMongoId,
      acknowledgementJustification: trimmedJustification,
      flaggedAt,
      acknowledgedAt: flaggedAt,
    });

    await clinicalRecord.save();

    await appendAuditLogImpl({
      eventType: 'PRESCRIPTION_ACKNOWLEDGED',
      actorId: physicianMongoId,
      targetResourceType: 'PrescriptionValidation',
      targetResourceId: validationEventId,
      payload: {
        patientId: validationAudit.payload.patientId,
        acknowledgementJustification: trimmedJustification,
        overrideType: validationAudit.payload.overrideType,
        flagId: clinicalRecord.drugInteractionFlags.at(-1).flagId,
        clinicalRecordId: clinicalRecord.recordId,
      },
    });

    return {
      validationEventId,
      flagId: clinicalRecord.drugInteractionFlags.at(-1).flagId,
      clinicalRecordId: clinicalRecord.recordId,
      acknowledgedAt: flaggedAt.toISOString(),
    };
  };

  return {
    validatePrescription,
    validatePrescriptionBatch,
    acknowledgePrescriptionWarning,
    mapInteractionTierToDecision,
    computeWorstDecision,
    computeOverrideType,
    computeRequiresAcknowledgement,
  };
};

const defaultService = createPrescriptionValidationService();

module.exports = {
  buildValidationEventId,
  mapInteractionTierToDecision,
  computeWorstDecision,
  computeOverrideType,
  computeRequiresAcknowledgement,
  createPrescriptionValidationService,
  validatePrescription: (...args) => defaultService.validatePrescription(...args),
  validatePrescriptionBatch: (...args) => defaultService.validatePrescriptionBatch(...args),
  acknowledgePrescriptionWarning: (...args) =>
    defaultService.acknowledgePrescriptionWarning(...args),
};
