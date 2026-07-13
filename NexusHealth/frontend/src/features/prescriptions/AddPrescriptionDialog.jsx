// frontend/src/features/prescriptions/AddPrescriptionDialog.jsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useAcknowledgePrescriptionMutation,
  useCommitPrescriptionMutation,
  useValidatePrescriptionMutation,
} from './prescriptionsApi';
import InteractionWarningCard from './InteractionWarningCard';
import DrugSearchCombobox from './DrugSearchCombobox';

const DOSE_UNITS = ['mg', 'mcg', 'mL', 'units'];
const DOSE_ROUTES = ['ORAL', 'IV', 'IM', 'SUBCUTANEOUS', 'TOPICAL', 'INHALED'];
const DEFAULT_DOSE = { value: '', unit: 'mg', route: 'ORAL', frequency: 'daily' };

function formatDoseSummary(dose) {
  const parts = [dose.value, dose.unit, dose.route, dose.frequency].filter(Boolean);
  return parts.join(' · ');
}

function buildOrderItemId(drug) {
  return `${drug.rxcui}-${Date.now()}`;
}

export default function AddPrescriptionDialog({ open, onOpenChange, patientId, patientName }) {
  const [selectedDrug, setSelectedDrug] = useState(null);
  const [dose, setDose] = useState(DEFAULT_DOSE);
  const [orderItems, setOrderItems] = useState([]);
  const [prescriptionNote, setPrescriptionNote] = useState('');
  const [justification, setJustification] = useState('');
  const [validationResult, setValidationResult] = useState(null);
  const [error, setError] = useState('');

  const [validatePrescription, { isLoading: isValidating }] = useValidatePrescriptionMutation();
  const [acknowledgePrescription, { isLoading: isAcknowledging }] = useAcknowledgePrescriptionMutation();
  const [commitPrescription, { isLoading: isCommitting }] = useCommitPrescriptionMutation();

  const resetEntryForm = () => {
    setSelectedDrug(null);
    setDose(DEFAULT_DOSE);
  };

  const resetForm = () => {
    resetEntryForm();
    setOrderItems([]);
    setPrescriptionNote('');
    setJustification('');
    setValidationResult(null);
    setError('');
  };

  const handleOpenChange = (nextOpen) => {
    if (!nextOpen) resetForm();
    onOpenChange(nextOpen);
  };

  const buildDosePayload = (doseState = dose) => ({
    value: Number(doseState.value),
    unit: doseState.unit,
    route: doseState.route,
    frequency: doseState.frequency.trim(),
  });

  const validateCurrentEntry = () => {
    if (!selectedDrug) {
      setError('Select a drug from search results.');
      return null;
    }

    if (!dose.value || Number(dose.value) <= 0) {
      setError('Enter a valid dose value.');
      return null;
    }

    const duplicate = orderItems.some((item) => item.drug.rxcui === selectedDrug.rxcui);
    if (duplicate) {
      setError('This drug is already in the order.');
      return null;
    }

    return {
      id: buildOrderItemId(selectedDrug),
      drug: selectedDrug,
      dose: buildDosePayload(),
    };
  };

  const handleAddMedication = () => {
    setError('');
    const entry = validateCurrentEntry();
    if (!entry) return;

    setOrderItems((prev) => [...prev, entry]);
    setValidationResult(null);
    resetEntryForm();
  };

  const handleRemoveMedication = (itemId) => {
    setOrderItems((prev) => prev.filter((item) => item.id !== itemId));
    setValidationResult(null);
  };

  const buildMedicationsPayload = () => {
    if (orderItems.length > 0) {
      return orderItems.map((item) => ({
        newDrugName: item.drug.name,
        newDrugRxnormCui: item.drug.rxcui,
        dose: item.dose,
      }));
    }

    const entry = validateCurrentEntry();
    if (!entry) return null;

    return [
      {
        newDrugName: entry.drug.name,
        newDrugRxnormCui: entry.drug.rxcui,
        dose: entry.dose,
      },
    ];
  };

  const handleValidateAndProceed = async (event) => {
    event.preventDefault();
    setError('');

    const medications = buildMedicationsPayload();
    if (!medications) return;

    const trimmedNote = prescriptionNote.trim();

    try {
      const result = await validatePrescription({
        patientId,
        medications,
        prescriptionNote: trimmedNote || undefined,
      }).unwrap();

      setValidationResult(result);

      if (result.decision === 'SAFE') {
        await commitPrescription({
          validationEventId: result.validationEventId,
          patientId,
          prescriptionNote: trimmedNote || undefined,
        }).unwrap();
        handleOpenChange(false);
        return;
      }

      const needsJustification =
        result.requiresAcknowledgement ||
        result.decision === 'SOFT_WARNING' ||
        result.decision === 'HARD_STOP';

      if (needsJustification && !justification.trim()) {
        setError('Clinical justification is required to override this warning.');
        return;
      }

      if (needsJustification) {
        await acknowledgePrescription({
          validationEventId: result.validationEventId,
          acknowledgementJustification: justification.trim(),
        }).unwrap();
        await commitPrescription({
          validationEventId: result.validationEventId,
          patientId,
          prescriptionNote: trimmedNote || undefined,
        }).unwrap();
        handleOpenChange(false);
      }
    } catch (err) {
      setError(err?.data?.error || 'Unable to process prescription.');
    }
  };

  const needsAcknowledgement =
    validationResult?.requiresAcknowledgement ||
    validationResult?.decision === 'SOFT_WARNING' ||
    validationResult?.decision === 'HARD_STOP';
  const isHardStop = validationResult?.decision === 'HARD_STOP';
  const isBusy = isValidating || isAcknowledging || isCommitting;
  const canSubmit = orderItems.length > 0 || selectedDrug;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add prescription</DialogTitle>
          <DialogDescription>
            Prescribe one or more medications for {patientName}. Add each drug to the order, include
            notes for follow-up or checkups, then validate and commit.
          </DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-4" onSubmit={handleValidateAndProceed}>
          {orderItems.length > 0 && (
            <div className="space-y-2 rounded-md border bg-muted/20 p-4">
              <p className="text-sm font-medium text-foreground">
                Order ({orderItems.length} medication{orderItems.length === 1 ? '' : 's'})
              </p>
              <ul className="space-y-2">
                {orderItems.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start justify-between gap-3 rounded-md border bg-background px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium text-foreground">{item.drug.name}</p>
                      <p className="text-muted-foreground">{formatDoseSummary(item.dose)}</p>
                      <p className="font-mono text-xs text-muted-foreground">RxCUI {item.drug.rxcui}</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveMedication(item.id)}
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <DrugSearchCombobox
            value={selectedDrug}
            onChange={(drug) => {
              setSelectedDrug(drug);
              setValidationResult(null);
            }}
            onInputChange={() => setValidationResult(null)}
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="doseValue">Dose</Label>
              <Input
                id="doseValue"
                type="number"
                min="0"
                step="any"
                value={dose.value}
                onChange={(event) => setDose((prev) => ({ ...prev, value: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="doseUnit">Unit</Label>
              <Select value={dose.unit} onValueChange={(value) => setDose((prev) => ({ ...prev, unit: value }))}>
                <SelectTrigger id="doseUnit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOSE_UNITS.map((unit) => (
                    <SelectItem key={unit} value={unit}>
                      {unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="doseRoute">Route</Label>
              <Select value={dose.route} onValueChange={(value) => setDose((prev) => ({ ...prev, route: value }))}>
                <SelectTrigger id="doseRoute">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOSE_ROUTES.map((route) => (
                    <SelectItem key={route} value={route}>
                      {route}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="doseFrequency">Frequency</Label>
              <Input
                id="doseFrequency"
                value={dose.frequency}
                onChange={(event) => setDose((prev) => ({ ...prev, frequency: event.target.value }))}
                placeholder="e.g. daily"
              />
            </div>
          </div>

          <Button type="button" variant="secondary" onClick={handleAddMedication} disabled={!selectedDrug}>
            Add medication to order
          </Button>

          <div className="space-y-2">
            <Label htmlFor="prescriptionNote">Notes for patient</Label>
            <textarea
              id="prescriptionNote"
              value={prescriptionNote}
              onChange={(event) => setPrescriptionNote(event.target.value)}
              placeholder="Follow-up checkups, lab work, lifestyle advice, or other instructions"
              rows={4}
              className="flex min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {validationResult &&
            (validationResult.interactions?.length > 0 || validationResult.allergyFlags?.length > 0) && (
              <InteractionWarningCard
                interactions={validationResult.interactions}
                allergyFlags={validationResult.allergyFlags}
              />
            )}

          {needsAcknowledgement && (
            <div className="space-y-2">
              <Label htmlFor="justification">
                Clinical justification (required to override {isHardStop ? 'hard stop' : 'warning'})
              </Label>
              <Input
                id="justification"
                value={justification}
                onChange={(event) => setJustification(event.target.value)}
                placeholder="Why benefit outweighs risk"
              />
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isBusy || !canSubmit}>
              {isBusy
                ? 'Processing…'
                : needsAcknowledgement
                  ? isHardStop
                    ? 'Override & prescribe'
                    : 'Acknowledge & prescribe'
                  : orderItems.length > 1
                    ? `Validate & prescribe ${orderItems.length} medications`
                    : 'Validate & prescribe'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
