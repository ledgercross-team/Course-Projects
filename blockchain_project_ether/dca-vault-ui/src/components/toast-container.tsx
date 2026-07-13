import { type ToastType } from '@/lib/use-toast'
import { cn } from '@/lib/utils'

const colors: Record<ToastType, string> = {
  info: 'bg-secondary text-secondary-foreground',
  success: 'bg-primary text-primary-foreground',
  error: 'bg-destructive text-destructive-foreground',
}

interface ToastContainerProps {
  toasts: { id: number; message: string; type: ToastType }[]
  onDismiss: (id: number) => void
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2" aria-live="polite" role="status">
      {toasts.map(t => (
        <div
          key={t.id}
          className={cn(
            'px-4 py-3 rounded-lg shadow-lg text-sm transition-opacity duration-300 cursor-pointer',
            colors[t.type]
          )}
          role="button"
          tabIndex={0}
          onClick={() => onDismiss(t.id)}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onDismiss(t.id) }}
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}
