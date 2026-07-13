// frontend/src/features/prescriptions/PatientPrescriptionsSection.jsx
import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import { useGetMyPrescriptionsQuery } from './prescriptionsApi';
import PrescriptionDetailDialog from './PrescriptionDetailDialog';

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

function PrescriptionOrderTile({ order, onOpenDetail }) {
  const [expanded, setExpanded] = useState(false);
  const isMulti = order.medications.length > 1;
  const primary = order.medications[0];

  const openDetail = (medication) => {
    onOpenDetail({
      ...medication,
      orderMedications: order.medications,
      orderInstructions: order.instructions,
    });
  };

  if (!isMulti) {
    return (
      <li>
        <button
          type="button"
          className="flex h-full min-h-[44px] w-full flex-col rounded-lg border bg-card p-6 text-left shadow-sm transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          onClick={() => openDetail(primary)}
        >
          <span className="text-lg font-semibold text-foreground">{primary.drugName}</span>
          <span className="mt-1 text-sm text-muted-foreground">{formatDose(primary.dose)}</span>
          <span className="mt-3 text-sm text-muted-foreground">
            Prescribed by {primary.prescribedBy?.displayName || 'your care team'}
            {primary.prescribedAt ? ` · ${formatDate(primary.prescribedAt)}` : ''}
          </span>
          {order.instructions && (
            <span className="mt-2 line-clamp-2 text-sm text-foreground/80">{order.instructions}</span>
          )}
          {order.interactionWarnings?.length > 0 && (
            <div className="mt-3 space-y-2">
              {order.interactionWarnings.map((warning) => (
                <div
                  key={`${warning.offendingDrugRxnormCui}-${warning.conflictingDrugRxnormCui}`}
                  className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-left"
                >
                  <Badge variant="outline" className="border-amber-500/50 text-amber-700 dark:text-amber-400">
                    Interaction overridden
                  </Badge>
                  {warning.mechanism && (
                    <p className="mt-1 text-xs text-muted-foreground">{warning.mechanism}</p>
                  )}
                  {warning.overrideJustification && (
                    <p className="mt-1 text-xs text-foreground">
                      Doctor note: {warning.overrideJustification}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </button>
      </li>
    );
  }

  return (
    <li>
      <div className="flex h-full min-h-[44px] w-full flex-col rounded-lg border bg-card p-6 text-left shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <button
            type="button"
            className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            onClick={() => openDetail(primary)}
          >
            <span className="text-lg font-semibold text-foreground">
              {summarizeOrderDrugs(order.medications)}
            </span>
            <span className="mt-1 block text-sm text-muted-foreground">
              {order.medicationCount} medications in this prescription
            </span>
            <span className="mt-3 block text-sm text-muted-foreground">
              Prescribed by {order.prescribedBy?.displayName || 'your care team'}
              {order.prescribedAt ? ` · ${formatDate(order.prescribedAt)}` : ''}
            </span>
            {order.instructions && (
              <span className="mt-2 line-clamp-2 text-sm text-foreground/80">{order.instructions}</span>
            )}
          </button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0"
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            <span className="ml-1 text-xs">{expanded ? 'Less' : 'Show more'}</span>
          </Button>
        </div>

        {expanded && (
          <ul className="mt-4 space-y-2 border-t pt-3">
            {order.medications.map((medication) => (
              <li key={`${medication.recordId}-${medication.rxnormCui}`}>
                <button
                  type="button"
                  className="w-full rounded-md border bg-muted/20 px-3 py-2 text-left text-sm hover:bg-muted/40"
                  onClick={() => openDetail(medication)}
                >
                  <span className="font-medium text-foreground">{medication.drugName}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {formatDose(medication.dose)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {order.interactionWarnings?.length > 0 && (
          <div className="mt-3 space-y-2">
            {order.interactionWarnings.map((warning) => (
              <div
                key={`${warning.offendingDrugRxnormCui}-${warning.conflictingDrugRxnormCui}`}
                className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-left"
              >
                <Badge variant="outline" className="border-amber-500/50 text-amber-700 dark:text-amber-400">
                  Interaction overridden
                </Badge>
                {warning.mechanism && (
                  <p className="mt-1 text-xs text-muted-foreground">{warning.mechanism}</p>
                )}
                {warning.overrideJustification && (
                  <p className="mt-1 text-xs text-foreground">
                    Doctor note: {warning.overrideJustification}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </li>
  );
}

export default function PatientPrescriptionsSection() {
  const { data, isLoading, isError } = useGetMyPrescriptionsQuery();
  const [selected, setSelected] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const prescriptionOrders =
    data?.prescriptionOrders?.length > 0
      ? data.prescriptionOrders
      : (data?.prescriptions || []).map((rx) => ({
          prescriptionId: `${rx.recordId}-${rx.rxnormCui}`,
          medications: [rx],
          medicationCount: 1,
          prescribedAt: rx.prescribedAt,
          prescribedBy: rx.prescribedBy,
          instructions: rx.instructions,
          interactionWarnings: rx.interactionWarnings || [],
        }));

  const openDetail = (rx) => {
    setSelected(rx);
    setDetailOpen(true);
  };

  return (
    <section>
      {isLoading && (
        <p className="text-sm text-muted-foreground" aria-live="polite">
          Loading prescriptions…
        </p>
      )}

      {isError && (
        <p className="text-sm text-destructive" role="alert">
          Unable to load prescriptions.
        </p>
      )}

      {!isLoading && !isError && prescriptionOrders.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">No prescriptions yet</CardTitle>
            <CardDescription>
              When a doctor prescribes medication for you, it will appear here.
            </CardDescription>
          </CardHeader>
          <CardContent />
        </Card>
      )}

      {!isLoading && !isError && prescriptionOrders.length > 0 && (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {prescriptionOrders.map((order) => (
            <PrescriptionOrderTile
              key={order.prescriptionId}
              order={order}
              onOpenDetail={openDetail}
            />
          ))}
        </ul>
      )}

      <PrescriptionDetailDialog
        prescription={selected}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </section>
  );
}
