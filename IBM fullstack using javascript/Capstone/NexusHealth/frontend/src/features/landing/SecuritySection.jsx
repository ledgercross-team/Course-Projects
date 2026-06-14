// frontend/src/features/landing/SecuritySection.jsx
import { LockKeyhole, Server, Shield } from 'lucide-react';

const PILLARS = [
  {
    icon: Shield,
    title: 'Consent-first access',
    body: 'Every clinical read passes through active consent, break-glass session, or CMO-approved override—never silent access.',
  },
  {
    icon: LockKeyhole,
    title: 'Sealed audit trails',
    body: 'Append-only logs with cryptographic integrity verification and compliance escalation on every emergency event.',
  },
  {
    icon: Server,
    title: 'Transaction-safe writes',
    body: 'Break-glass initiation atomically persists audit records—partial failures roll back without orphan events.',
  },
];

export default function SecuritySection() {
  return (
    <section
      id="security"
      className="scroll-mt-24 border-y border-slate-800/80 bg-slate-900/40 px-4 py-20 sm:px-6 lg:px-8"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-12 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-md">
          <p className="text-sm font-medium uppercase tracking-widest text-emerald-400">Security</p>
          <h2 className="mt-2 text-3xl font-bold text-white">Built for accountable care</h2>
          <p className="mt-4 text-slate-400">
            Defense-in-depth for regulated environments—role-gated APIs, patient notifications, and
            retrospective compliance review for high-sensitivity domains.
          </p>
        </div>

        <ul className="flex flex-1 flex-col gap-4 sm:max-w-2xl">
          {PILLARS.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <li
                key={pillar.title}
                className="flex gap-4 rounded-xl border border-slate-800 bg-zinc-950/60 p-5 transition-all hover:border-emerald-500/30"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">{pillar.title}</h3>
                  <p className="mt-1 text-sm text-slate-400">{pillar.body}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
