// frontend/src/features/profile/profileUtils.js
const AVATAR_COLORS = {
  PATIENT: 'bg-sky-600 text-white',
  PHYSICIAN: 'bg-emerald-600 text-white',
  CMO: 'bg-violet-600 text-white',
  ADMIN: 'bg-amber-600 text-white',
  PHARMACIST: 'bg-cyan-600 text-white',
};

export function getProfileDisplayName(user) {
  if (!user) return 'User';
  const first = user.demographics?.legalName?.first;
  const last = user.demographics?.legalName?.last;
  return [first, last].filter(Boolean).join(' ') || 'User';
}

export function getProfileEmail(user) {
  return user?.demographics?.contactInfo?.email || '—';
}

export function getProfilePhone(user) {
  return user?.demographics?.contactInfo?.primaryPhone || '';
}

export function getProfileInitials(user) {
  const first = user?.demographics?.legalName?.first?.[0] || '';
  const last = user?.demographics?.legalName?.last?.[0] || '';
  const initials = `${first}${last}`.toUpperCase();
  return initials || '?';
}

export function getAvatarColorClass(role) {
  return AVATAR_COLORS[role] || 'bg-primary text-primary-foreground';
}
