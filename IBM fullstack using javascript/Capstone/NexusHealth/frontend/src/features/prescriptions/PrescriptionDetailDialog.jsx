// frontend/src/features/prescriptions/PrescriptionDetailDialog.jsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';

function formatDose(dose) {
  if (!dose) return 'Not specified';
  const parts = [dose.value, dose.unit, dose.route, dose.frequency].filter(Boolean);
  return parts.join(' · ');
}

export default function PrescriptionDetailDialog({ prescription, open, onOpenChange }) {
  if (!prescription) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-start justify-between gap-3">
            <DialogTitle>{prescription.drugName}</DialogTitle>
            <Badge variant="secondary" className="shrink-0">
              Active
            </Badge>
          </div>
          <DialogDescription className="font-mono text-xs">
            RxCUI {prescription.rxnormCui}
          </DialogDescription>
        </DialogHeader>

        <dl className="grid gap-3 text-sm">
          <div>
            <dt className="font-medium text-foreground">Prescribed by</dt>
            <dd className="text-muted-foreground">
              {prescription.prescribedBy?.displayName || 'Your care team'}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-foreground">Dose</dt>
            <dd className="text-muted-foreground">{formatDose(prescription.dose)}</dd>
          </div>
          {prescription.instructions && (
            <div>
              <dt className="font-medium text-foreground">Instructions</dt>
              <dd className="whitespace-pre-wrap text-muted-foreground">{prescription.instructions}</dd>
            </div>
          )}
          {prescription.interactionWarnings?.length > 0 && (
            <div>
              <dt className="font-medium text-foreground">Interaction overrides</dt>
              <dd className="space-y-2">
                {prescription.interactionWarnings.map((warning) => (
                  <div
                    key={`${warning.offendingDrugRxnormCui}-${warning.conflictingDrugRxnormCui}`}
                    className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3"
                  >
                    <Badge variant="outline" className="border-amber-500/50 text-amber-700 dark:text-amber-400">
                      {warning.tier === 'HARD_STOP' ? 'Hard stop overridden' : 'Warning overridden'}
                    </Badge>
                    {warning.mechanism && (
                      <p className="mt-2 text-sm text-muted-foreground">{warning.mechanism}</p>
                    )}
                    {warning.overrideJustification && (
                      <p className="mt-2 text-sm text-foreground">
                        Doctor note: {warning.overrideJustification}
                      </p>
                    )}
                  </div>
                ))}
              </dd>
            </div>
          )}
          <div>
            <dt className="font-medium text-foreground">Clinical domain</dt>
            <dd className="text-muted-foreground">{prescription.clinicalDomain || '—'}</dd>
          </div>
          <div>
            <dt className="font-medium text-foreground">Prescribed on</dt>
            <dd className="text-muted-foreground">
              {prescription.prescribedAt ? formatDate(prescription.prescribedAt) : '—'}
            </dd>
          </div>
          {prescription.endDate && (
            <div>
              <dt className="font-medium text-foreground">End date</dt>
              <dd className="text-muted-foreground">{formatDate(prescription.endDate)}</dd>
            </div>
          )}
          <div>
            <dt className="font-medium text-foreground">Record ID</dt>
            <dd className="font-mono text-xs text-muted-foreground">{prescription.recordId}</dd>
          </div>
        </dl>
      </DialogContent>
    </Dialog>
  );
}
