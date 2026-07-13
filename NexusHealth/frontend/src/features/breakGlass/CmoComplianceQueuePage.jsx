// frontend/src/features/breakGlass/CmoComplianceQueuePage.jsx
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  useApproveTier2RequestMutation,
  useDenyTier2RequestMutation,
  useGetComplianceQueueQuery,
} from './breakGlassApi';
import { formatDate } from '@/lib/utils';

export default function CmoComplianceQueuePage() {
  const { data, isLoading, isError, refetch } = useGetComplianceQueueQuery();
  const [approve, { isLoading: isApproving }] = useApproveTier2RequestMutation();
  const [deny, { isLoading: isDenying }] = useDenyTier2RequestMutation();

  const requests = data?.requests || [];

  const handleApprove = async (eventId) => {
    await approve(eventId).unwrap();
    refetch();
  };

  const handleDeny = async (eventId) => {
    await deny(eventId).unwrap();
    refetch();
  };

  return (
    <section className="mx-auto w-full max-w-5xl">
      <header className="mb-8 flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Compliance Queue</h1>
        <p className="max-w-2xl text-base text-muted-foreground">
          Review pending Tier 2 break-glass emergency access requests from physicians.
        </p>
      </header>

      {isLoading && <p className="text-sm text-muted-foreground">Loading queue…</p>}
      {isError && (
        <p className="text-sm text-destructive" role="alert">
          Unable to load compliance queue.
        </p>
      )}

      {!isLoading && !isError && requests.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>No pending requests</CardTitle>
            <CardDescription>All Tier 2 break-glass requests have been resolved.</CardDescription>
          </CardHeader>
        </Card>
      )}

      <ul className="flex flex-col gap-4">
        {requests.map((request) => (
          <li key={request.eventId}>
            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                <div className="space-y-1">
                  <CardTitle className="text-lg">Request {request.eventId}</CardTitle>
                  <CardDescription>
                    Submitted {formatDate(request.eventCreatedAt)} · Patient{' '}
                    {request.targetPatientId?.toString?.() || request.targetPatientId}
                  </CardDescription>
                </div>
                <Badge variant="outline">{request.complianceEscalation?.reviewStatus || 'PENDING'}</Badge>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="text-sm text-muted-foreground">
                  <p>
                    <span className="font-medium text-foreground">Justification:</span>{' '}
                    {request.justification?.clinicalJustificationCode}
                  </p>
                  <p className="mt-2">{request.justification?.freeTextReason}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleApprove(request.eventId)}
                    disabled={isApproving || isDenying}
                  >
                    <Check className="h-4 w-4" aria-hidden="true" />
                    Approve
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeny(request.eventId)}
                    disabled={isApproving || isDenying}
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                    Deny
                  </Button>
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
