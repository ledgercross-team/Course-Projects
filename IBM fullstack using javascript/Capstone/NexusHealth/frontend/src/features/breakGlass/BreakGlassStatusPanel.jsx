// frontend/src/features/breakGlass/BreakGlassStatusPanel.jsx
import { useEffect, useState } from 'react';
import { Clock3, ShieldCheck, ShieldX } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useGetTier2RequestStatusQuery } from './breakGlassApi';
import { clearPendingTier2Request, readPendingTier2Request } from './breakGlassConstants';
import { formatDate } from '@/lib/utils';

const TERMINAL_STATUSES = new Set(['CLEARED', 'FLAGGED_FOR_INVESTIGATION']);

export default function BreakGlassStatusPanel({ patientId }) {
  const pending = readPendingTier2Request(patientId);
  const eventId = pending?.eventId;
  const [stopPolling, setStopPolling] = useState(false);

  const { data, isFetching } = useGetTier2RequestStatusQuery(eventId, {
    skip: !eventId || stopPolling,
    pollingInterval: eventId && !stopPolling ? 5000 : 0,
  });

  useEffect(() => {
    if (data?.reviewStatus && TERMINAL_STATUSES.has(data.reviewStatus)) {
      clearPendingTier2Request(patientId);
      setStopPolling(true);
    }
  }, [data?.reviewStatus, patientId]);

  if (!eventId) {
    return null;
  }

  const reviewStatus = data?.reviewStatus || 'PENDING';

  return (
    <div
      className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          {reviewStatus === 'CLEARED' ? (
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          ) : reviewStatus === 'FLAGGED_FOR_INVESTIGATION' ? (
            <ShieldX className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          ) : (
            <Clock3 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          )}
          <div>
            <p className="font-medium">Tier 2 emergency request</p>
            <p className="text-xs text-amber-900/80">
              {reviewStatus === 'PENDING' && 'Awaiting CMO approval for emergency chart access.'}
              {reviewStatus === 'CLEARED' &&
                `Approved. Session expires ${data?.sessionExpiresAt ? formatDate(data.sessionExpiresAt) : 'soon'}.`}
              {reviewStatus === 'FLAGGED_FOR_INVESTIGATION' &&
                'Request denied and flagged for compliance investigation.'}
            </p>
          </div>
        </div>
        <Badge variant="outline" className="shrink-0 border-amber-300 bg-white text-amber-900">
          {isFetching ? 'Updating…' : reviewStatus}
        </Badge>
      </div>
    </div>
  );
}
