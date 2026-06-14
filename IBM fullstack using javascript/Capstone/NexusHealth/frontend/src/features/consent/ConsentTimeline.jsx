// frontend/src/features/consent/ConsentTimeline.jsx
import { formatDate } from '@/lib/utils';

export default function ConsentTimeline({ consent }) {
  const events = consent?.stateChangeLog || [];

  if (!events.length) {
    return (
      <p className="text-sm text-muted-foreground">No audit events recorded yet.</p>
    );
  }

  return (
    <ul className="steps steps-vertical w-full">
      {events.map((event, index) => (
        <li key={`${event.changedAt}-${index}`} className="step step-primary text-left">
          <div className="mb-4 rounded-md border bg-muted/40 p-4">
            <p className="text-sm font-medium">
              {event.fromStatus} → {event.toStatus}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{event.reason}</p>
            <p className="mt-2 font-mono text-xs text-muted-foreground">{formatDate(event.changedAt)}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
