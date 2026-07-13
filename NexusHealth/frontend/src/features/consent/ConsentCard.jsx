// frontend/src/features/consent/ConsentCard.jsx
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import ConsentStatusBadge from '@/components/feedback/ConsentStatusBadge';
import { daysUntil, formatDate } from '@/lib/utils';

function countdownStyle(value, digits = 2) {
  return {
    '--value': value,
    '--digits': digits,
  };
}

function CountdownUnit({ value, digits, label, unitLabel }) {
  return (
    <div className="text-center">
      <span className="countdown font-mono text-4xl text-foreground">
        <span
          style={countdownStyle(value, digits)}
          aria-live="polite"
          aria-label={`${value} ${label}`}
        >
          {value}
        </span>
      </span>
      <span className="mt-1 block text-xs text-muted-foreground">{unitLabel}</span>
    </div>
  );
}

function ExpiryCountdown({ expiresAt }) {
  const [remaining, setRemaining] = useState(() => {
    if (!expiresAt) return null;
    return Math.max(0, new Date(expiresAt).getTime() - Date.now());
  });

  useEffect(() => {
    if (!expiresAt) return undefined;

    const interval = window.setInterval(() => {
      setRemaining(Math.max(0, new Date(expiresAt).getTime() - Date.now()));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [expiresAt]);

  const totalSeconds = remaining === null ? 0 : Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (remaining === null) return null;

  return (
    <div className="consent-expiry-countdown rounded-md border bg-muted/30 p-4">
      <p className="mb-3 text-sm font-medium">Expires in</p>
      <div className="flex flex-wrap justify-center gap-5 sm:justify-start">
        <CountdownUnit value={days} digits={days >= 100 ? 3 : 2} label="days" unitLabel="days" />
        <CountdownUnit value={hours} digits={2} label="hours" unitLabel="hours" />
        <CountdownUnit value={minutes} digits={2} label="minutes" unitLabel="min" />
        <CountdownUnit value={seconds} digits={2} label="seconds" unitLabel="sec" />
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{formatDate(expiresAt)}</p>
    </div>
  );
}

function formatConsentTitle(consentId) {
  if (!consentId) return 'Consent';
  return consentId.startsWith('consent-') ? consentId : `Consent ${consentId}`;
}

export default function ConsentCard({ consent, onAction }) {
  const daysLeft = daysUntil(consent.expiresAt);
  const isPending = consent.status === 'PENDING_PATIENT_CONFIRMATION';
  const isActive = consent.status === 'ACTIVE';
  const canRenew = isActive && daysLeft !== null && daysLeft <= 30 && !consent.renewalRequested;
  const isTerminal = ['EXPIRED', 'REVOKED', 'SUPERSEDED'].includes(consent.status);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate text-lg">{formatConsentTitle(consent.consentId)}</CardTitle>
            <CardDescription className="truncate">
              Version {consent.versionNumber} · Episode {consent.episodeId}
            </CardDescription>
          </div>
          <ConsentStatusBadge status={consent.status} />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase text-muted-foreground">Permission tier</p>
            <p className="font-medium">{consent.permissionTier}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-muted-foreground">Allowed domains</p>
            <p className="font-medium">{consent.allowedDomains?.join(', ')}</p>
          </div>
        </div>

        {consent.excludedDomains?.length > 0 && (
          <div>
            <p className="text-xs uppercase text-muted-foreground">Excluded domains</p>
            <p className="text-sm">{consent.excludedDomains.join(', ')}</p>
          </div>
        )}

        {consent.patientConfirmation?.confirmedViaMethod && (
          <div className="alert alert-info text-sm">
            Confirmed via {consent.patientConfirmation.confirmedViaMethod} on{' '}
            {formatDate(consent.patientConfirmation.confirmedAt)}
          </div>
        )}

        {consent.renewalRequested && (
          <div className="alert alert-warning text-sm">
            Renewal pending — confirm the new draft to reactivate access.
          </div>
        )}

        {isActive && <ExpiryCountdown expiresAt={consent.expiresAt} />}
      </CardContent>

      <CardFooter className="flex flex-wrap gap-2">
        {isPending && (
          <Button type="button" onClick={() => onAction('confirm', consent)}>
            Confirm now
          </Button>
        )}
        {canRenew && (
          <Button type="button" variant="secondary" onClick={() => onAction('renew', consent)}>
            Renew now
          </Button>
        )}
        {(isActive || isPending) && (
          <Button type="button" variant="destructive" onClick={() => onAction('revoke', consent)}>
            Revoke
          </Button>
        )}
        {isTerminal && (
          <p className="text-sm text-muted-foreground">
            This consent is no longer active. Create a new draft to restore sharing.
          </p>
        )}
      </CardFooter>
    </Card>
  );
}
