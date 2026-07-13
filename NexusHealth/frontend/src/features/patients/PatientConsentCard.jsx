// frontend/src/features/patients/PatientConsentCard.jsx
import { useState } from 'react';
import { AlertTriangle, Images, Plus } from 'lucide-react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import ConsentStatusBadge from '@/components/feedback/ConsentStatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { selectCurrentUser } from '@/features/auth/authSlice';
import AddPrescriptionDialog from '@/features/prescriptions/AddPrescriptionDialog';
import PatientMedicationsList from '@/features/prescriptions/PatientMedicationsList';
import { useGetPatientPrescriptionsQuery } from '@/features/prescriptions/prescriptionsApi';
import BreakGlassDialog from '@/features/breakGlass/BreakGlassDialog';
import BreakGlassStatusPanel from '@/features/breakGlass/BreakGlassStatusPanel';
import { formatDate } from '@/lib/utils';

export default function PatientConsentCard({ consent }) {
  const user = useSelector(selectCurrentUser);
  const navigate = useNavigate();
  const { patient } = consent;
  const domains = (consent.allowedDomains || []).join(', ');
  const patientId = patient?.id;
  const canPrescribe = consent.status === 'ACTIVE';
  const currentPhysicianId = user?._id?.toString?.() || user?._id;

  const [addOpen, setAddOpen] = useState(false);
  const [breakGlassOpen, setBreakGlassOpen] = useState(false);

  const { data: rxData, isLoading: isLoadingRx } = useGetPatientPrescriptionsQuery(patientId, {
    skip: !patientId || !canPrescribe,
  });

  return (
    <>
      <Card className="flex h-full flex-col">
        <CardHeader className="gap-2">
          <div className="flex items-start justify-between gap-4">
            <CardTitle className="text-lg">{patient?.displayName || 'Unknown patient'}</CardTitle>
            <ConsentStatusBadge status={consent.status} />
          </div>
          <CardDescription className="font-mono text-xs">MRN {patient?.mrn || '—'}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">Domains:</span> {domains || '—'}
            </p>
            <p>
              <span className="font-medium text-foreground">Tier:</span> {consent.permissionTier}
            </p>
            {consent.expiresAt && (
              <p>
                <span className="font-medium text-foreground">Expires:</span>{' '}
                {formatDate(consent.expiresAt)}
              </p>
            )}
          </div>

          {patientId && <BreakGlassStatusPanel patientId={patientId} />}

          {canPrescribe && patientId && (
            <div className="border-t pt-4">
              <p className="mb-2 text-sm font-medium text-foreground">Active prescriptions</p>
              <PatientMedicationsList
                patientId={patientId}
                prescriptions={rxData?.prescriptions}
                prescriptionOrders={rxData?.prescriptionOrders}
                currentPhysicianId={currentPhysicianId}
                isLoading={isLoadingRx}
              />
            </div>
          )}
        </CardContent>

        {patientId && (
          <CardFooter className="mt-auto flex flex-wrap gap-2 justify-end">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => navigate(`/doctor/patients/${patientId}/images`)}
              aria-label={`View physical prescription images for ${patient?.displayName}`}
            >
              <Images className="h-4 w-4" aria-hidden="true" />
              View Images
            </Button>
            {canPrescribe && (
              <Button
                type="button"
                size="sm"
                onClick={() => setAddOpen(true)}
                aria-label={`Add prescription for ${patient?.displayName}`}
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add prescription
              </Button>
            )}
            {!canPrescribe && user?.role === 'PHYSICIAN' && (
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={() => setBreakGlassOpen(true)}
                aria-label={`Initiate emergency access for ${patient?.displayName}`}
              >
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                Emergency Access
              </Button>
            )}
          </CardFooter>
        )}
      </Card>

      {patientId && user?.role === 'PHYSICIAN' && (
        <BreakGlassDialog
          open={breakGlassOpen}
          onOpenChange={setBreakGlassOpen}
          patientId={patientId}
          patientName={patient?.displayName}
        />
      )}

      {canPrescribe && patientId && (
        <AddPrescriptionDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          patientId={patientId}
          patientName={patient?.displayName || 'patient'}
        />
      )}
    </>
  );
}
