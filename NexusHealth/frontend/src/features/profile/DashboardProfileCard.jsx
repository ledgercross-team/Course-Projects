// frontend/src/features/profile/DashboardProfileCard.jsx
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Pencil, Trash2, UserRound } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  useChangePasswordMutation,
  useDeleteAccountMutation,
  useGetMeQuery,
  useUpdateProfileMutation,
} from '@/features/auth/authApi';
import { clearCredentials, selectCurrentUser, updateCurrentUser } from '@/features/auth/authSlice';
import { baseApi } from '@/app/baseApi';
import { clearConsents } from '@/features/consent/consentSlice';
import {
  getAvatarColorClass,
  getProfileDisplayName,
  getProfileEmail,
  getProfileInitials,
  getProfilePhone,
} from './profileUtils';

function ProfileAvatar({ user }) {
  return (
    <div
      className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-full text-2xl font-semibold ${getAvatarColorClass(user?.role)}`}
      aria-hidden="true"
    >
      {getProfileInitials(user)}
    </div>
  );
}

export default function DashboardProfileCard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  // Auth slice always reflects the current logged-in user (set on login/bootstrap).
  // getMe provides supplemental data like phone that may not be in the login payload.
  const authUser = useSelector(selectCurrentUser);
  const { data, isLoading, isError } = useGetMeQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  const [updateProfile, { isLoading: isSavingPhone }] = useUpdateProfileMutation();
  const [changePassword, { isLoading: isChangingPassword }] = useChangePasswordMutation();
  const [deleteAccount, { isLoading: isDeletingAccount }] = useDeleteAccountMutation();

  // Use authUser for identity (always correct); getMe user for phone (server-persisted).
  const meUser = data?.user;
  const user = authUser ?? meUser;
  const savedPhone = getProfilePhone(meUser);
  const [phone, setPhone] = useState('');
  const [editingPhone, setEditingPhone] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [profileError, setProfileError] = useState('');

  const [passwordOpen, setPasswordOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    setPhone(savedPhone);
    // reset edit mode when getMe refreshes (e.g. after save)
    if (savedPhone) setEditingPhone(false);
  }, [savedPhone]);

  const handleSavePhone = async () => {
    setProfileError('');
    setProfileMessage('');
    try {
      const result = await updateProfile({ primaryPhone: phone }).unwrap();
      dispatch(updateCurrentUser(result.user));
      setEditingPhone(false);
      setProfileMessage('Phone number updated.');
    } catch (err) {
      setProfileError(err?.data?.error || 'Unable to update phone number.');
    }
  };

  const resetPasswordForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setActionError('');
  };

  const handleChangePassword = async (event) => {
    event.preventDefault();
    setActionError('');

    if (newPassword !== confirmPassword) {
      setActionError('New passwords do not match.');
      return;
    }

    try {
      await changePassword({ currentPassword, newPassword }).unwrap();
      setPasswordOpen(false);
      resetPasswordForm();
      setProfileMessage('Password updated successfully.');
    } catch (err) {
      setActionError(err?.data?.error || 'Unable to change password.');
    }
  };

  const handleDeleteAccount = async (event) => {
    event.preventDefault();
    setActionError('');

    try {
      await deleteAccount({ password: deletePassword }).unwrap();
      dispatch(baseApi.util.resetApiState());
      dispatch(clearCredentials());
      dispatch(clearConsents());
      navigate('/login', { replace: true });
    } catch (err) {
      setActionError(err?.data?.error || 'Unable to delete account.');
    }
  };

  if (isLoading && !authUser) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-sm text-muted-foreground">Loading profile…</p>
        </CardContent>
      </Card>
    );
  }

  if (isError && !user) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-sm text-destructive" role="alert">
            Unable to load profile.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserRound className="h-5 w-5" aria-hidden="true" />
            Profile
          </CardTitle>
          <CardDescription>Your account details and security settings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <ProfileAvatar user={user} />
            <div className="min-w-0 space-y-1">
              <p className="text-xl font-semibold text-foreground">{getProfileDisplayName(user)}</p>
              <p className="text-sm text-muted-foreground">{getProfileEmail(user)}</p>
              <p className="text-xs font-mono uppercase text-muted-foreground">{user.role}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Phone number (optional)</Label>
            {savedPhone && !editingPhone ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-foreground">{savedPhone}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => { setPhone(savedPhone); setEditingPhone(true); }}
                  aria-label="Edit phone number"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id="profilePhone"
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="e.g. +1 555 0100"
                  autoComplete="tel"
                />
                <div className="flex gap-2">
                  <Button type="button" variant="secondary" disabled={isSavingPhone} onClick={handleSavePhone}>
                    {isSavingPhone ? 'Saving…' : 'Save phone'}
                  </Button>
                  {savedPhone && (
                    <Button type="button" variant="ghost" onClick={() => setEditingPhone(false)}>
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>

          {profileMessage && (
            <p className="text-sm text-emerald-600 dark:text-emerald-400" role="status">
              {profileMessage}
            </p>
          )}
          {profileError && (
            <p className="text-sm text-destructive" role="alert">
              {profileError}
            </p>
          )}

          <div className="flex flex-wrap gap-2 border-t pt-4">
            <Button type="button" variant="outline" onClick={() => { resetPasswordForm(); setPasswordOpen(true); }}>
              <KeyRound className="h-4 w-4" aria-hidden="true" />
              Reset password
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                setDeletePassword('');
                setActionError('');
                setDeleteOpen(true);
              }}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Delete account
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
        <DialogContent>
          <form onSubmit={handleChangePassword}>
            <DialogHeader>
              <DialogTitle>Reset password</DialogTitle>
              <DialogDescription>Enter your current password and choose a new one.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm new password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>
              {actionError && passwordOpen && (
                <p className="text-sm text-destructive" role="alert">
                  {actionError}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPasswordOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isChangingPassword}>
                {isChangingPassword ? 'Updating…' : 'Update password'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <form onSubmit={handleDeleteAccount}>
            <DialogHeader>
              <DialogTitle>Delete account</DialogTitle>
              <DialogDescription>
                This will suspend your account and sign you out. Enter your password to confirm.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="deletePassword">Password</Label>
                <Input
                  id="deletePassword"
                  type="password"
                  value={deletePassword}
                  onChange={(event) => setDeletePassword(event.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>
              {actionError && deleteOpen && (
                <p className="text-sm text-destructive" role="alert">
                  {actionError}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="destructive" disabled={isDeletingAccount}>
                {isDeletingAccount ? 'Deleting…' : 'Delete account'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
