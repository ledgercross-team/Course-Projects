const User = require('./User');
const { CLINICAL_DOMAINS } = require('../config/enums');

module.exports = {
  User,
  PASSWORD_MIN_LENGTH: User.PASSWORD_MIN_LENGTH,
  CLINICAL_DOMAINS,
  ClinicalRecord: require('./ClinicalRecord'),
  ConsentRule: require('./ConsentRule'),
  BreakGlassAuditLog: require('./BreakGlassAuditLog'),
  AdrReport: require('./AdrReport'),
  PrescriptionImage: require('./PrescriptionImage'),
  DrugInteractionRule: require('./DrugInteractionRule'),
  AuditLog: require('./AuditLog'),
};
