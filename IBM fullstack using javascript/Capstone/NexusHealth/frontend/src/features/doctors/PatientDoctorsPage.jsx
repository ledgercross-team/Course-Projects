// frontend/src/features/doctors/PatientDoctorsPage.jsx
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  useAddDoctorMutation,
  useGetMyDoctorsQuery,
  useRemoveDoctorMutation,
} from '@/features/users/usersApi';
import AddDoctorDialog from './AddDoctorDialog';
import DoctorCard from './DoctorCard';

export default function PatientDoctorsPage() {
  const { data, isLoading, isError } = useGetMyDoctorsQuery();
  const [addDoctor, { isLoading: isAdding }] = useAddDoctorMutation();
  const [removeDoctor, { isLoading: isRemoving }] = useRemoveDoctorMutation();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [addError, setAddError] = useState('');
  const [removeError, setRemoveError] = useState('');

  const doctors = data?.doctors || [];

  const handleAdd = async (physicianId) => {
    setAddError('');
    try {
      await addDoctor(physicianId).unwrap();
      return true;
    } catch (err) {
      setAddError(err?.data?.error || 'Unable to add doctor. Please try again.');
      return false;
    }
  };

  const handleRemove = async (physicianId) => {
    setRemoveError('');
    try {
      await removeDoctor(physicianId).unwrap();
    } catch (err) {
      setRemoveError(err?.data?.error || 'Unable to remove doctor. Please try again.');
    }
  };

  return (
    <section className="relative mx-auto w-full max-w-6xl pb-24">
      <header className="mb-8 flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">My Doctors</h1>
        <p className="max-w-2xl text-base text-muted-foreground">
          Manage clinicians on your care team. Adding a doctor here does not grant record access — use
          Consent Center for that.
        </p>
      </header>

      {removeError && (
        <p className="mb-4 text-sm text-destructive" role="alert">
          {removeError}
        </p>
      )}

      {isLoading && (
        <p className="text-sm text-muted-foreground" aria-live="polite">
          Loading your care team…
        </p>
      )}

      {isError && (
        <p className="text-sm text-destructive" role="alert">
          Unable to load your doctors. Please refresh and try again.
        </p>
      )}

      {!isLoading && !isError && doctors.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">No doctors yet</CardTitle>
            <CardDescription>
              Tap the plus button to search and add your first clinician.
            </CardDescription>
          </CardHeader>
          <CardContent />
        </Card>
      )}

      {!isLoading && !isError && doctors.length > 0 && (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {doctors.map((doctor) => (
            <li key={doctor.id}>
              <DoctorCard doctor={doctor} onRemove={handleRemove} isRemoving={isRemoving} />
            </li>
          ))}
        </ul>
      )}

      <Button
        type="button"
        size="icon"
        aria-label="Add doctor"
        className="fixed bottom-6 right-6 z-10 h-14 w-14 rounded-full shadow-lg motion-safe:transition-transform motion-safe:duration-200 hover:shadow-xl"
        onClick={() => {
          setAddError('');
          setDialogOpen(true);
        }}
      >
        <Plus className="h-6 w-6" aria-hidden="true" />
      </Button>

      <AddDoctorDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onAdd={handleAdd}
        isAdding={isAdding}
        error={addError}
      />
    </section>
  );
}
