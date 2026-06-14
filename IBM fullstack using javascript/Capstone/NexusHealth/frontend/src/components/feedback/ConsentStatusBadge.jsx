// frontend/src/components/feedback/ConsentStatusBadge.jsx
import { cn } from '@/lib/utils';

const STATUS_STYLES = {
  PENDING_PATIENT_CONFIRMATION: 'badge-warning',
  ACTIVE: 'badge-success',
  EXPIRED: 'badge-ghost',
  REVOKED: 'badge-error',
  SUPERSEDED: 'badge-ghost',
};

const STATUS_LABELS = {
  PENDING_PATIENT_CONFIRMATION: 'Pending confirmation',
  ACTIVE: 'Active',
  EXPIRED: 'Expired',
  REVOKED: 'Revoked',
  SUPERSEDED: 'Superseded',
};

export default function ConsentStatusBadge({ status }) {
  return (
    <span
      className={cn(
        'badge badge-sm shrink-0 whitespace-nowrap px-3 font-medium',
        STATUS_STYLES[status] || 'badge-ghost',
      )}
    >
      {STATUS_LABELS[status] || status}
    </span>
  );
}
