// frontend/src/features/breakGlass/PatientBreakGlassBanner.jsx
import { useMemo, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGetPatientBreakGlassAlertsQuery } from './breakGlassApi';
import { dismissAlertId, readDismissedAlertIds } from './breakGlassConstants';
import { formatDate } from '@/lib/utils';

export default function PatientBreakGlassBanner() {
  const { data } = useGetPatientBreakGlassAlertsQuery();
  const [dismissedVersion, setDismissedVersion] = useState(0);

  const alerts = useMemo(() => {
    const dismissed = new Set(readDismissedAlertIds());
    return (data?.alerts || []).filter((alert) => !dismissed.has(alert.eventId));
  }, [data?.alerts, dismissedVersion]);

  if (alerts.length === 0) {
    return null;
  }

  const handleDismiss = (eventId) => {
    dismissAlertId(eventId);
    setDismissedVersion((value) => value + 1);
  };

  return (
    <div className="mb-6 flex flex-col gap-3" aria-live="polite">
      {alerts.map((alert) => (
        <div
          key={alert.eventId}
          className="flex items-start justify-between gap-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-amber-950"
          role="alert"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-medium">Emergency access notice</p>
              <p className="text-sm text-amber-900/90">{alert.message}</p>
              <p className="mt-1 text-xs text-amber-900/70">{formatDate(alert.eventCreatedAt)}</p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 text-amber-900 hover:bg-amber-100"
            onClick={() => handleDismiss(alert.eventId)}
            aria-label="Dismiss alert"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}
