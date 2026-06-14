// frontend/src/features/admin/InviteUserPage.jsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useInviteUserMutation } from './adminApi';
import { useGetClinicalDomainsQuery } from '@/features/meta/metaApi';

const CLINICAL_ROLES = ['PHYSICIAN', 'CMO'];

export default function InviteUserPage() {
  const [inviteUser, { isLoading, error }] = useInviteUserMutation();
  const { data: domainsData } = useGetClinicalDomainsQuery();
  const clinicalDomains = domainsData?.clinicalDomains || [];
  const [tempPassword, setTempPassword] = useState('');
  const [form, setForm] = useState({
    role: 'PHYSICIAN',
    email: '',
    firstName: '',
    lastName: '',
    npiNumber: '',
    licenseNumber: '',
    specialization: 'CARDIOLOGY',
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setTempPassword('');

    try {
      const { specialization, ...invitePayload } = form;
      const result = await inviteUser({
        ...invitePayload,
        specializations: specialization ? [specialization] : [],
      }).unwrap();
      setTempPassword(result.tempPassword);
    } catch {
      // Error shown below.
    }
  };

  const isClinical = CLINICAL_ROLES.includes(form.role);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">Invite user</h1>
        <p className="mt-2 text-muted-foreground">
          Create physician, CMO, or admin accounts. Share the one-time password securely.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New invite</CardTitle>
          <CardDescription>Patients self-register; clinical and admin users are invited here.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={form.role} onValueChange={(value) => setForm((prev) => ({ ...prev, role: value }))}>
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PHYSICIAN">PHYSICIAN</SelectItem>
                  <SelectItem value="CMO">CMO</SelectItem>
                  <SelectItem value="ADMIN">ADMIN</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  value={form.firstName}
                  onChange={(event) => setForm((prev) => ({ ...prev, firstName: event.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  value={form.lastName}
                  onChange={(event) => setForm((prev) => ({ ...prev, lastName: event.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                required
              />
            </div>

            {isClinical && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="npiNumber">NPI number</Label>
                    <Input
                      id="npiNumber"
                      value={form.npiNumber}
                      onChange={(event) => setForm((prev) => ({ ...prev, npiNumber: event.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="licenseNumber">License number</Label>
                    <Input
                      id="licenseNumber"
                      value={form.licenseNumber}
                      onChange={(event) => setForm((prev) => ({ ...prev, licenseNumber: event.target.value }))}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="specialization">Specialization</Label>
                  <Select
                    value={form.specialization}
                    onValueChange={(value) => setForm((prev) => ({ ...prev, specialization: value }))}
                  >
                    <SelectTrigger id="specialization">
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
              </>
            )}

            {error && (
              <div className="alert alert-error text-sm" role="alert">
                {error.data?.error || 'Invite failed.'}
              </div>
            )}

            {tempPassword && (
              <div className="alert alert-success text-sm" role="status">
                Account created. One-time password: <code className="font-mono">{tempPassword}</code>
              </div>
            )}

            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating invite…' : 'Create account'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
