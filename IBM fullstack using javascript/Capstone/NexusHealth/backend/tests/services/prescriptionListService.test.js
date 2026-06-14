// backend/tests/services/prescriptionListService.test.js
const {
  dedupeInteractionWarnings,
  groupPrescriptionOrders,
} = require('../../services/prescriptionListService');

describe('prescriptionListService', () => {
  describe('dedupeInteractionWarnings', () => {
    it('should keep one warning when the same interaction is attached to both medications', () => {
      const warning = {
        tier: 'HARD_STOP',
        mechanism: 'Increased bleeding risk when warfarin is combined with aspirin',
        offendingDrugRxnormCui: '11289',
        conflictingDrugRxnormCui: '1191',
      };

      const result = dedupeInteractionWarnings([warning, warning]);

      expect(result).toHaveLength(1);
      expect(result[0].mechanism).toBe(warning.mechanism);
    });
  });

  describe('groupPrescriptionOrders', () => {
    it('should dedupe order-level interaction warnings for multi-med prescriptions', () => {
      const sharedWarning = {
        tier: 'HARD_STOP',
        mechanism: 'Increased bleeding risk',
        offendingDrugRxnormCui: '11289',
        conflictingDrugRxnormCui: '1191',
      };

      const prescriptions = [
        {
          rxnormCui: '11289',
          drugName: 'warfarin',
          recordId: 'rec-1',
          prescribedAt: '2026-06-14T04:16:00.000Z',
          prescribedBy: { id: 'phys-1', displayName: 'Dr. John Smith' },
          interactionWarnings: [sharedWarning],
        },
        {
          rxnormCui: '1191',
          drugName: 'Aspirin',
          recordId: 'rec-1',
          prescribedAt: '2026-06-14T04:16:00.000Z',
          prescribedBy: { id: 'phys-1', displayName: 'Dr. John Smith' },
          interactionWarnings: [sharedWarning],
        },
      ];

      const orders = groupPrescriptionOrders(prescriptions);

      expect(orders).toHaveLength(1);
      expect(orders[0].interactionWarnings).toHaveLength(1);
    });
  });
});
