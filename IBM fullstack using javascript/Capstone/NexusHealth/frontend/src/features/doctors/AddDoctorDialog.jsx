// frontend/src/features/doctors/AddDoctorDialog.jsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import ProviderSearchCombobox from '@/features/consent/ProviderSearchCombobox';

export default function AddDoctorDialog({ open, onOpenChange, onAdd, isAdding, error }) {
  const [selectedProvider, setSelectedProvider] = useState(null);

  const handleOpenChange = (nextOpen) => {
    if (!nextOpen) {
      setSelectedProvider(null);
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedProvider?.id) return;

    const success = await onAdd(selectedProvider.id);
    if (success) {
      setSelectedProvider(null);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add doctor</DialogTitle>
          <DialogDescription>
            Search for a clinician by name or NPI to add them to your care team.
          </DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <ProviderSearchCombobox
            label="Physician"
            value={selectedProvider?.id || null}
            onChange={setSelectedProvider}
            initialLabel={selectedProvider ? `${selectedProvider.displayName} · NPI ${selectedProvider.npiNumber}` : ''}
          />

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!selectedProvider?.id || isAdding}>
              {isAdding ? 'Adding…' : 'Add doctor'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
