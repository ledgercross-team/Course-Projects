// frontend/src/features/breakGlass/BreakGlassDialog.jsx
import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useExecuteBreakGlassOverrideMutation } from './breakGlassApi';
import {
  CLINICAL_JUSTIFICATION_OPTIONS,
  MIN_FREE_TEXT_REASON_LENGTH,
  savePendingTier2Request,
} from './breakGlassConstants';

export default function BreakGlassDialog({
  open,
  onOpenChange,
  patientId,
  patientName,
  onSuccess,
}) {
  const [clinicalJustificationCode, setClinicalJustificationCode] = useState('');
  const [freeTextReason, setFreeTextReason] = useState('');
  const [error, setError] = useState('');

  const [executeOverride, { isLoading }] = useExecuteBreakGlassOverrideMutation();

  const trimmedReason = freeTextReason.trim();
  const reasonValid = trimmedReason.length >= MIN_FREE_TEXT_REASON_LENGTH;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!clinicalJustificationCode) {
      setError('Select a clinical justification.');
      return;
    }

    if (!reasonValid) {
      setError(`Reason must be at least ${MIN_FREE_TEXT_REASON_LENGTH} characters.`);
      return;
    }

    try {
      const result = await executeOverride({
        targetPatientId: patientId,
        clinicalJustificationCode,
        freeTextReason: trimmedReason,
      }).unwrap();

      if (result.tier === 'TIER_2_HARD_OVERRIDE') {
        savePendingTier2Request(patientId, result.breakGlass.eventId);
      }

      setClinicalJustificationCode('');
      setFreeTextReason('');
      onOpenChange(false);
      onSuccess?.(result);
    } catch (requestError) {
      setError(requestError?.data?.error || 'Unable to initiate emergency access.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" aria-hidden="true" />
            Emergency break-glass access
          </DialogTitle>
          <DialogDescription>
            Initiate audited emergency access for {patientName || 'this patient'}. All actions are
            logged, sealed, and escalated to compliance.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="space-y-2">
            <Label htmlFor="breakglass-justification">Clinical justification</Label>
            <Select value={clinicalJustificationCode} onValueChange={setClinicalJustificationCode}>
              <SelectTrigger id="breakglass-justification">
                <SelectValue placeholder="Select justification code" />
              </SelectTrigger>
              <SelectContent>
                {CLINICAL_JUSTIFICATION_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="breakglass-reason">Free-text reason</Label>
            <textarea
              id="breakglass-reason"
              value={freeTextReason}
              onChange={(event) => setFreeTextReason(event.target.value)}
              rows={4}
              className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="Describe the emergency clinical need (minimum 20 characters)."
            />
            <p className="text-xs text-muted-foreground">
              {trimmedReason.length}/{MIN_FREE_TEXT_REASON_LENGTH} characters minimum
            </p>
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={isLoading}>
              {isLoading ? 'Submitting…' : 'Initiate emergency access'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
