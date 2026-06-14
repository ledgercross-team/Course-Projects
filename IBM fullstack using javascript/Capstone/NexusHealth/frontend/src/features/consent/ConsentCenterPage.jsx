// frontend/src/features/consent/ConsentCenterPage.jsx
import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useGetMeQuery } from '@/features/auth/authApi';
import { useGetClinicalDomainsQuery } from '@/features/meta/metaApi';
import ConsentCard from './ConsentCard';
import ConsentActionModal from './ConsentActionModal';
import ConsentTimeline from './ConsentTimeline';
import ProviderSearchCombobox from './ProviderSearchCombobox';
import {
  useConfirmConsentMutation,
  useCreateConsentMutation,
  useGetMyConsentsQuery,
  useRenewConsentMutation,
  useRevokeConsentMutation,
} from './consentApi';

export default function ConsentCenterPage() {
  const { data: meData } = useGetMeQuery();
  const { data: domainsData } = useGetClinicalDomainsQuery();
  const clinicalDomains = domainsData?.clinicalDomains || [];
  const { data: consentsData, isLoading: isLoadingConsents } = useGetMyConsentsQuery();
  const [createConsent, { isLoading: isCreating }] = useCreateConsentMutation();
  const [confirmConsent, { isLoading: isConfirming }] = useConfirmConsentMutation();
  const [renewConsent, { isLoading: isRenewing }] = useRenewConsentMutation();
  const [revokeConsent, { isLoading: isRevoking }] = useRevokeConsentMutation();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [modalAction, setModalAction] = useState(null);
  const [modalConsent, setModalConsent] = useState(null);
  const [error, setError] = useState('');
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [createForm, setCreateForm] = useState({
    permissionTier: 'VIEW_ONLY',
    allowedDomains: ['CARDIOLOGY'],
    excludedDomains: ['PSYCHIATRY'],
    durationDays: 30,
  });

  const consents = consentsData?.consents || [];
  const primaryPhysician = meData?.user?.patientProfile?.primaryPhysicianId;
  const primaryPhysicianId = useMemo(() => {
    if (!primaryPhysician) return null;
    if (typeof primaryPhysician === 'object') return primaryPhysician._id;
    return primaryPhysician;
  }, [primaryPhysician]);

  const defaultProvider = useMemo(() => {
    if (!primaryPhysicianId) return null;
    const first = primaryPhysician?.demographics?.legalName?.first || '';
    const last = primaryPhysician?.demographics?.legalName?.last || '';
    const displayName = `Dr. ${first} ${last}`.trim();
    return {
      id: primaryPhysicianId,
      displayName,
      npiNumber: primaryPhysician?.physicianProfile?.npiNumber,
      specializations: primaryPhysician?.physicianProfile?.specializations || [],
    };
  }, [primaryPhysicianId, primaryPhysician]);

  const effectiveProvider = selectedProvider ?? defaultProvider;

  const timelineConsent = modalConsent || consents[0];

  const handleCreate = async (event) => {
    event.preventDefault();
    setError('');

    if (!effectiveProvider?.id) {
      setError('Select a physician before creating a consent draft.');
      return;
    }

    try {
      await createConsent({
        providerId: effectiveProvider.id,
        episodeId: `episode-${Date.now()}`,
        ...createForm,
      }).unwrap();

      setShowCreateForm(false);
    } catch (requestError) {
      setError(requestError.data?.error || 'Failed to create consent draft.');
    }
  };

  const openActionModal = (action, consent) => {
    setModalAction(action);
    setModalConsent(consent);
  };

  const handleModalSubmit = async (payload) => {
    if (!modalConsent) return;
    setError('');

    try {
      if (modalAction === 'confirm') {
        await confirmConsent({ consentId: modalConsent.consentId, ...payload }).unwrap();
      } else if (modalAction === 'renew') {
        await renewConsent({ consentId: modalConsent.consentId, ...payload }).unwrap();
      } else if (modalAction === 'revoke') {
        await revokeConsent({ consentId: modalConsent.consentId, ...payload }).unwrap();
      }

      setModalAction(null);
      setModalConsent(null);
    } catch (requestError) {
      setError(requestError.data?.error || 'Consent action failed.');
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Consent Center</h1>
          <p className="mt-2 text-muted-foreground">
            Manage who can access your clinical records and for how long.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => setShowCreateForm((value) => !value)}
        >
          <Plus className="h-4 w-4" />
          Create draft
        </Button>
      </section>

      {error && (
        <div className="alert alert-error text-sm" role="alert">
          {error}
        </div>
      )}

      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>New consent draft</CardTitle>
            <CardDescription>
              Search for your physician by name or NPI. Your primary physician is pre-selected when available.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 md:grid-cols-2" onSubmit={handleCreate}>
              <div className="md:col-span-2">
                <ProviderSearchCombobox
                  value={effectiveProvider?.id}
                  onChange={setSelectedProvider}
                  initialLabel={
                    effectiveProvider
                      ? `${effectiveProvider.displayName}${effectiveProvider.npiNumber ? ` · NPI ${effectiveProvider.npiNumber}` : ''}`
                      : ''
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="durationDays">Duration (days)</Label>
                <input
                  id="durationDays"
                  type="number"
                  min="1"
                  max="90"
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={createForm.durationDays}
                  onChange={(event) =>
                    setCreateForm((prev) => ({ ...prev, durationDays: Number(event.target.value) }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="allowedDomains">Allowed domain</Label>
                <Select
                  value={createForm.allowedDomains[0]}
                  onValueChange={(value) => setCreateForm((prev) => ({ ...prev, allowedDomains: [value] }))}
                >
                  <SelectTrigger id="allowedDomains">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {clinicalDomains.map((domain) => (
                      <SelectItem key={domain} value={domain}>
                        {domain}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="excludedDomains">Excluded domain</Label>
                <Select
                  value={createForm.excludedDomains[0]}
                  onValueChange={(value) => setCreateForm((prev) => ({ ...prev, excludedDomains: [value] }))}
                >
                  <SelectTrigger id="excludedDomains">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {clinicalDomains.map((domain) => (
                      <SelectItem key={domain} value={domain}>
                        {domain}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2">
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? 'Creating…' : 'Save draft'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <section className="grid gap-6 lg:grid-cols-2 lg:items-stretch">
        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold text-foreground">Your consents</h2>
          {isLoadingConsents ? (
            <Card className="min-h-[220px]">
              <CardContent className="flex h-full items-center justify-center py-8 text-muted-foreground">
                Loading consents…
              </CardContent>
            </Card>
          ) : consents.length === 0 ? (
            <Card className="flex min-h-[220px] flex-1 flex-col">
              <CardContent className="flex flex-1 items-center justify-center py-8 text-center text-muted-foreground">
                No consents yet. Create a draft to start sharing records with a provider.
              </CardContent>
            </Card>
          ) : (
            consents.map((consent) => (
              <ConsentCard key={consent.consentId} consent={consent} onAction={openActionModal} />
            ))
          )}
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold text-foreground">Audit timeline</h2>
          <Card className="flex min-h-[220px] flex-1 flex-col">
            <CardContent className="flex flex-1 flex-col justify-center py-6">
              {timelineConsent ? (
                <ConsentTimeline consent={timelineConsent} />
              ) : (
                <p className="text-center text-sm text-muted-foreground">
                  Timeline appears after your first consent action.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <ConsentActionModal
        open={Boolean(modalAction)}
        onOpenChange={(open) => {
          if (!open) {
            setModalAction(null);
            setModalConsent(null);
          }
        }}
        action={modalAction}
        consent={modalConsent}
        onSubmit={handleModalSubmit}
        isLoading={isConfirming || isRenewing || isRevoking}
      />
    </div>
  );
}
