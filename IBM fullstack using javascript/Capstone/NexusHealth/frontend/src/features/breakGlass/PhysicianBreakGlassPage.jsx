// frontend/src/features/breakGlass/PhysicianBreakGlassPage.jsx
import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useGetProviderConsentsQuery } from '@/features/consent/consentApi';
import BreakGlassDialog from './BreakGlassDialog';

export default function PhysicianBreakGlassPage() {
  const { data, isLoading, isError } = useGetProviderConsentsQuery('');
  const consents = data?.consents || [];
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const openDialog = (consent) => {
    setSelectedPatient(consent.patient);
    setSuccessMessage('');
    setDialogOpen(true);
  };

  return (
    <section className="mx-auto w-full max-w-4xl">
      <header className="mb-8 flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Emergency Access</h1>
        <p className="max-w-2xl text-base text-muted-foreground">
          Initiate HIPAA-compliant break-glass override when consent is missing or insufficient.
          Tier routing is determined automatically from clinical domain sensitivity.
        </p>
      </header>

      {successMessage && (
        <p className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900" role="status">
          {successMessage}
        </p>
      )}

      {isLoading && <p className="text-sm text-muted-foreground">Loading patients…</p>}
      {isError && (
        <p className="text-sm text-destructive" role="alert">
          Unable to load patients.
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {consents.map((consent) => (
          <li key={`${consent.consentId}-${consent.versionNumber}`}>
            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                <div>
                  <CardTitle className="text-lg">{consent.patient?.displayName || 'Unknown patient'}</CardTitle>
                  <CardDescription className="font-mono text-xs">
                    MRN {consent.patient?.mrn || '—'} · Consent {consent.status}
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => openDialog(consent)}
                  disabled={!consent.patient?.id}
                >
                  <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                  Emergency Access
                </Button>
              </CardHeader>
              <CardContent />
            </Card>
          </li>
        ))}
      </ul>

      {selectedPatient?.id && (
        <BreakGlassDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          patientId={selectedPatient.id}
          patientName={selectedPatient.displayName}
          onSuccess={(result) => {
            if (result.tier === 'TIER_2_HARD_OVERRIDE') {
              setSuccessMessage(
                `Tier 2 request submitted for ${selectedPatient.displayName}. CMO review is required.`,
              );
            } else {
              setSuccessMessage(
                `Tier 1 emergency access granted for ${selectedPatient.displayName} (4-hour session).`,
              );
            }
          }}
        />
      )}
    </section>
  );
}
