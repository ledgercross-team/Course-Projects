// frontend/src/features/consent/ConsentActionModal.jsx
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const CONFIRMATION_METHODS = ['PORTAL_2FA', 'BIOMETRIC', 'SIGNED_FORM', 'VERBAL_WITNESSED'];

const ACTION_COPY = {
  confirm: {
    title: 'Confirm consent',
    description: 'Confirm this consent draft to grant provider access.',
    submitLabel: 'Confirm consent',
  },
  renew: {
    title: 'Renew consent',
    description: 'Request renewal. A new draft will require re-confirmation.',
    submitLabel: 'Request renewal',
  },
  revoke: {
    title: 'Revoke consent',
    description: 'Revoke access immediately. This action is audited.',
    submitLabel: 'Revoke consent',
  },
};

export default function ConsentActionModal({
  open,
  onOpenChange,
  action,
  consent,
  onSubmit,
  isLoading,
}) {
  const [confirmedViaMethod, setConfirmedViaMethod] = useState('PORTAL_2FA');
  const [revokedReason, setRevokedReason] = useState('');
  const [durationDays, setDurationDays] = useState('30');

  const copy = ACTION_COPY[action];

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (action === 'confirm') {
      await onSubmit({
        confirmedViaMethod,
        durationDays: Number(durationDays),
      });
    } else if (action === 'renew') {
      await onSubmit({
        durationDays: Number(durationDays),
      });
    } else if (action === 'revoke') {
      await onSubmit({
        revokedReason,
      });
    }

    onOpenChange(false);
  };

  if (!copy) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <p className="font-mono text-xs text-muted-foreground">{consent?.consentId}</p>

          {action === 'confirm' && (
            <div className="space-y-2">
              <Label htmlFor="confirmedViaMethod">Confirmation method</Label>
              <Select value={confirmedViaMethod} onValueChange={setConfirmedViaMethod}>
                <SelectTrigger id="confirmedViaMethod">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONFIRMATION_METHODS.map((method) => (
                    <SelectItem key={method} value={method}>
                      {method}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {(action === 'confirm' || action === 'renew') && (
            <div className="space-y-2">
              <Label htmlFor="durationDays">Duration (days)</Label>
              <Input
                id="durationDays"
                type="number"
                min="1"
                max="90"
                value={durationDays}
                onChange={(event) => setDurationDays(event.target.value)}
              />
            </div>
          )}

          {action === 'revoke' && (
            <div className="space-y-2">
              <Label htmlFor="revokedReason">Revocation reason</Label>
              <Input
                id="revokedReason"
                value={revokedReason}
                onChange={(event) => setRevokedReason(event.target.value)}
                placeholder="Why are you revoking this consent?"
                required
              />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant={action === 'revoke' ? 'destructive' : 'default'} disabled={isLoading}>
              {isLoading ? 'Saving…' : copy.submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
