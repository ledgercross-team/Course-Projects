// frontend/src/features/patients/PhysicianPatientsPage.jsx
import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useGetProviderConsentsQuery } from '@/features/consent/consentApi';
import PatientConsentCard from './PatientConsentCard';

export default function PhysicianPatientsPage() {
  const [mrnInput, setMrnInput] = useState('');
  const [mrnFilter, setMrnFilter] = useState('');

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setMrnFilter(mrnInput);
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [mrnInput]);

  const { data, isLoading, isFetching, isError } = useGetProviderConsentsQuery(mrnFilter);
  const consents = data?.consents || [];

  return (
    <section className="mx-auto w-full max-w-6xl">
      <header className="mb-8 flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Patient Consents</h1>
        <p className="max-w-2xl text-base text-muted-foreground">
          Patients with consent records. Filter by MRN. Active consents allow prescribing.
        </p>
      </header>

      <div className="mb-8 max-w-md space-y-2">
        <Label htmlFor="mrnFilter">Filter by MRN</Label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="mrnFilter"
            value={mrnInput}
            onChange={(event) => setMrnInput(event.target.value)}
            placeholder="e.g. MRN-ALPHA-001"
            className="pl-11 font-mono"
            autoComplete="off"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {isFetching ? 'Filtering…' : 'Partial MRN match, case-insensitive.'}
        </p>
      </div>

      {isLoading && (
        <p className="text-sm text-muted-foreground" aria-live="polite">
          Loading consent reports…
        </p>
      )}

      {isError && (
        <p className="text-sm text-destructive" role="alert">
          Unable to load patient consents. Please refresh and try again.
        </p>
      )}

      {!isLoading && !isError && consents.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">No matching patients</CardTitle>
            <CardDescription>
              {mrnFilter.trim()
                ? 'No consent records match that MRN filter.'
                : 'No patients have consent records with you yet.'}
            </CardDescription>
          </CardHeader>
          <CardContent />
        </Card>
      )}

      {!isLoading && !isError && consents.length > 0 && (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {consents.map((consent) => (
            <li key={`${consent.consentId}-${consent.versionNumber}`}>
              <PatientConsentCard consent={consent} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
