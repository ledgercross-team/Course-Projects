// frontend/src/features/prescriptions/PatientMedicationsList.jsx
import { useState } from 'react';
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import { useDiscontinuePrescriptionMutation } from './prescriptionsApi';

function formatDose(dose) {
  if (!dose) return '—';
  const parts = [dose.value, dose.unit, dose.route, dose.frequency].filter(Boolean);
  return parts.join(' · ');
}

function summarizeOrderDrugs(medications) {
  const names = medications.map((med) => med.drugName).filter(Boolean);
  if (names.length <= 2) return names.join(' · ');
  return `${names[0]} · ${names[1]} + ${names.length - 2} more`;
}

function InteractionWarnings({ warnings }) {
  if (!warnings?.length) return null;

  return (
    <div className="mt-2 space-y-1">
      {warnings.map((warning) => (
        <div
          key={`${warning.offendingDrugRxnormCui}-${warning.conflictingDrugRxnormCui}-${warning.mechanism}`}
          className="rounded border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-xs"
        >
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-amber-500/50 text-amber-700 dark:text-amber-400">
              {warning.tier === 'HARD_STOP' ? 'Overridden hard stop' : 'Overridden warning'}
            </Badge>
          </div>
          {warning.mechanism && <p className="mt-1 text-muted-foreground">{warning.mechanism}</p>}
          {warning.overrideJustification && (
            <p className="mt-1 text-foreground">Doctor note: {warning.overrideJustification}</p>
          )}
        </div>
      ))}
    </div>
  );
}

function MedicationRow({ medication, patientId, currentPhysicianId, isDiscontinuing, onDiscontinue }) {
  const isOwn = medication.prescribedBy?.id === currentPhysicianId;

  return (
    <div className="flex items-start justify-between gap-2 border-t border-border/60 pt-2 first:border-t-0 first:pt-0">
      <div className="min-w-0 flex-1">
        <p className="font-medium text-foreground">{medication.drugName}</p>
        <p className="text-xs text-muted-foreground">{formatDose(medication.dose)}</p>
      </div>
      {isOwn && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="shrink-0 text-destructive hover:text-destructive"
          disabled={isDiscontinuing}
          onClick={() => onDiscontinue(medication)}
          aria-label={`Discontinue ${medication.drugName}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

function PrescriptionOrderCard({
  order,
  patientId,
  currentPhysicianId,
  isDiscontinuing,
  onDiscontinue,
}) {
  const [expanded, setExpanded] = useState(false);
  const isMulti = order.medications.length > 1;
  const primary = order.medications[0];

  if (!isMulti) {
    const rx = primary;
    const isOwn = rx.prescribedBy?.id === currentPhysicianId;

    return (
      <li className="rounded-md border bg-muted/20 px-3 py-2 text-sm">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-foreground">{rx.drugName}</p>
            <p className="text-xs text-muted-foreground">{formatDose(rx.dose)}</p>
            <p className="text-xs text-muted-foreground">
              {rx.prescribedBy?.displayName || 'Unknown prescriber'}
              {rx.prescribedAt ? ` · ${formatDate(rx.prescribedAt)}` : ''}
            </p>
            {rx.instructions && (
              <p className="mt-1 text-xs text-foreground/80">{rx.instructions}</p>
            )}
            <InteractionWarnings warnings={rx.interactionWarnings} />
          </div>
          {isOwn && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="shrink-0 text-destructive hover:text-destructive"
              disabled={isDiscontinuing}
              onClick={() => onDiscontinue(rx)}
              aria-label={`Discontinue ${rx.drugName}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </li>
    );
  }

  return (
    <li className="rounded-md border bg-muted/20 px-3 py-2 text-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground">{summarizeOrderDrugs(order.medications)}</p>
          <p className="text-xs text-muted-foreground">
            {order.medicationCount} medications in this prescription
          </p>
          <p className="text-xs text-muted-foreground">
            {order.prescribedBy?.displayName || primary.prescribedBy?.displayName || 'Unknown prescriber'}
            {order.prescribedAt ? ` · ${formatDate(order.prescribedAt)}` : ''}
          </p>
          {order.instructions && (
            <p className="mt-1 text-xs text-foreground/80">{order.instructions}</p>
          )}
          <InteractionWarnings warnings={order.interactionWarnings} />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="shrink-0"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          aria-label={expanded ? 'Show less medications' : 'Show more medications'}
        >
          {expanded ? (
            <>
              <ChevronUp className="h-4 w-4" />
              <span className="sr-only">Show less</span>
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" />
              <span className="ml-1 text-xs">Show more</span>
            </>
          )}
        </Button>
      </div>

      {expanded && (
        <div className="mt-3 space-y-2">
          {order.medications.map((medication) => (
            <MedicationRow
              key={`${medication.recordId}-${medication.rxnormCui}`}
              medication={medication}
              patientId={patientId}
              currentPhysicianId={currentPhysicianId}
              isDiscontinuing={isDiscontinuing}
              onDiscontinue={onDiscontinue}
            />
          ))}
        </div>
      )}
    </li>
  );
}

export default function PatientMedicationsList({
  patientId,
  prescriptions,
  prescriptionOrders,
  currentPhysicianId,
  isLoading,
}) {
  const [discontinue, { isLoading: isDiscontinuing }] = useDiscontinuePrescriptionMutation();

  const orders =
    prescriptionOrders?.length > 0
      ? prescriptionOrders
      : (prescriptions || []).map((rx) => ({
          prescriptionId: `${rx.recordId}-${rx.rxnormCui}`,
          medications: [rx],
          medicationCount: 1,
          prescribedAt: rx.prescribedAt,
          prescribedBy: rx.prescribedBy,
          instructions: rx.instructions,
          interactionWarnings: rx.interactionWarnings || [],
        }));

  if (isLoading) {
    return <p className="text-xs text-muted-foreground">Loading medications…</p>;
  }

  if (!orders.length) {
    return <p className="text-xs text-muted-foreground">No active prescriptions.</p>;
  }

  const handleDiscontinue = async (rx) => {
    try {
      await discontinue({
        patientId,
        recordId: rx.recordId,
        rxnormCui: rx.rxnormCui,
      }).unwrap();
    } catch {
      // Parent may show global error later; keep list simple
    }
  };

  return (
    <ul className="flex flex-col gap-2">
      {orders.map((order) => (
        <PrescriptionOrderCard
          key={order.prescriptionId}
          order={order}
          patientId={patientId}
          currentPhysicianId={currentPhysicianId}
          isDiscontinuing={isDiscontinuing}
          onDiscontinue={handleDiscontinue}
        />
      ))}
    </ul>
  );
}
