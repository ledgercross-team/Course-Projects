// frontend/src/components/feedback/ScopeBadge.jsx
import { cn } from '@/lib/utils';

const SCOPE_STYLES = {
  SELF: 'badge-info',
  CONSENT: 'badge-success',
  BREAK_GLASS_TIER1: 'badge-warning',
  BREAK_GLASS_TIER2: 'badge-error',
};

export default function ScopeBadge({ scope }) {
  if (!scope) return null;

  return (
    <span className={cn('badge badge-sm font-mono text-xs', SCOPE_STYLES[scope] || 'badge-ghost')}>
      {scope}
    </span>
  );
}
