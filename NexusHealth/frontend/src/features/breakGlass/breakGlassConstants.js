// frontend/src/features/breakGlass/breakGlassConstants.js
export const CLINICAL_JUSTIFICATION_OPTIONS = [
  { value: 'EMERGENCY_DEPARTMENT', label: 'Emergency department' },
  { value: 'UNCONSCIOUS_PATIENT', label: 'Unconscious patient' },
  { value: 'LIFE_THREATENING_EVENT', label: 'Life-threatening event' },
  { value: 'TRANSFER_OF_CARE', label: 'Transfer of care' },
];

export const MIN_FREE_TEXT_REASON_LENGTH = 20;

export const pendingRequestStorageKey = (patientId) => `breakglass-pending-request:${patientId}`;

export const dismissedAlertStorageKey = 'breakglass-dismissed-alerts';

export const readDismissedAlertIds = () => {
  try {
    const raw = sessionStorage.getItem(dismissedAlertStorageKey);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const dismissAlertId = (eventId) => {
  const current = new Set(readDismissedAlertIds());
  current.add(eventId);
  sessionStorage.setItem(dismissedAlertStorageKey, JSON.stringify([...current]));
};

export const savePendingTier2Request = (patientId, eventId) => {
  localStorage.setItem(
    pendingRequestStorageKey(patientId),
    JSON.stringify({ eventId, savedAt: new Date().toISOString() }),
  );
};

export const readPendingTier2Request = (patientId) => {
  try {
    const raw = localStorage.getItem(pendingRequestStorageKey(patientId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const clearPendingTier2Request = (patientId) => {
  localStorage.removeItem(pendingRequestStorageKey(patientId));
};
