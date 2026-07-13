// frontend/src/features/auth/AuthPageLayout.jsx
import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';

export default function AuthPageLayout({ title, description, children, wide = false }) {
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-zinc-950 px-4 py-12">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'linear-gradient(rgba(148,163,184,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.05) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-64 w-96 -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl"
        aria-hidden="true"
      />

      <Link
        to="/"
        className="relative z-10 mb-8 flex items-center gap-3 transition-transform hover:scale-[1.02]"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30 shadow-[0_0_24px_rgba(16,185,129,0.2)]">
          <Shield className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="flex flex-col leading-tight text-left">
          <span className="text-sm font-semibold text-white">NexusHealth Safeguard</span>
          <span className="text-xs text-slate-500">Clinical Portal</span>
        </span>
      </Link>

      <div
        className={`relative z-10 w-full rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-2xl shadow-black/40 ring-1 ring-slate-800/80 backdrop-blur-sm sm:p-8 ${wide ? 'max-w-lg' : 'max-w-md'}`}
      >
        <header className="mb-6 space-y-2 text-center">
          <h1 className="text-2xl font-bold text-white">{title}</h1>
          {description ? <p className="text-sm text-slate-400">{description}</p> : null}
        </header>
        {children}
      </div>
    </div>
  );
}
