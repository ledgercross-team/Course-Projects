const mongoose = require('mongoose');
const { INTERACTION_TIERS, EVIDENCE_LEVELS } = require('../config/enums');

const drugInteractionRuleSchema = new mongoose.Schema(
  {
    drug1RxnormCui: { type: String, required: true },
    drug2RxnormCui: { type: String, required: true },
    interactionPairHash: { type: String, required: true },
    tier: { type: String, enum: INTERACTION_TIERS, required: true },
    mechanismNdfrtCode: String,
    mechanismDescription: String,
    clinicalConsequence: String,
    evidenceLevel: { type: String, enum: EVIDENCE_LEVELS },
    sourceReference: String,
    lastUpdated: { type: Date, default: Date.now },
  },
  {
    collection: 'drugInteractionRules',
    timestamps: false,
  }
);

module.exports = mongoose.model('DrugInteractionRule', drugInteractionRuleSchema);
