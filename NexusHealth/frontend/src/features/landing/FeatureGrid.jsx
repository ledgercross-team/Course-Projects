// frontend/src/features/landing/FeatureGrid.jsx
import { useState } from 'react';
import {
  Fingerprint,
  ShieldAlert,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

const TERMINOLOGY_TAGS = ['RxNorm', 'MedDRA', 'ICD-10', 'LOINC'];

const CONSENT_DOMAINS = [
  { id: 'cardiology', label: 'Cardiology', defaultOn: true },
  { id: 'psychiatry', label: 'Psychiatry', defaultOn: false },
  { id: 'oncology', label: 'Oncology', defaultOn: true },
  { id: 'substance', label: 'Substance Use', defaultOn: false, excluded: true },
];

function ConsentMatrixDemo() {
  const [toggles, setToggles] = useState(() =>
    Object.fromEntries(CONSENT_DOMAINS.map((d) => [d.id, d.defaultOn])),
  );

  const flip = (id) => {
    setToggles((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="mt-4 space-y-2">
      {CONSENT_DOMAINS.map((domain) => {
        const on = toggles[domain.id];
        const isExcluded = domain.excluded;

        return (
          <button
            key={domain.id}
            type="button"
            onClick={() => flip(domain.id)}
            className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-all hover:scale-[1.02] ${
              isExcluded
                ? 'border-rose-500/40 bg-rose-500/10 text-rose-200'
                : on
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100'
                  : 'border-slate-700 bg-slate-950/50 text-slate-400'
            }`}
          >
            <span className="flex items-center gap-2">
              {isExcluded ? (
                <span className="text-[10px] font-semibold uppercase tracking-wide text-rose-400">
                  Excluded
                </span>
              ) : null}
              {domain.label}
            </span>
            {on && !isExcluded ? (
              <ToggleRight className="h-5 w-5 text-emerald-400" aria-hidden="true" />
            ) : (
              <ToggleLeft className="h-5 w-5 text-slate-500" aria-hidden="true" />
            )}
          </button>
        );
      })}
    </div>
  );
}

const FEATURES = [
  {
    id: 'break-glass',
    title: 'Emergency Break-Glass Override',
    description:
      'Tiered physician overrides with CMO compliance queues, HMAC-sealed audit logs, and mandatory justification capture.',
    icon: ShieldAlert,
    accent: 'from-rose-950/80 to-slate-900',
    border: 'border-rose-500/30 hover:border-rose-500/60',
    iconClass: 'text-rose-400 group-hover:animate-pulse',
    custom: null,
  },
  {
    id: 'terminology',
    title: 'Clinical Terminology Mapping',
    description:
      'Interop-ready normalization across RxNorm, MedDRA, ICD-10, and LOINC for prescriptions, ADR reporting, and clinical records.',
    icon: null,
    accent: 'from-slate-900 to-slate-950',
    border: 'border-cyan-500/20 hover:border-cyan-500/50',
    iconClass: '',
    custom: 'tags',
  },
  {
    id: 'integrity',
    title: 'Cryptographic Integrity Seals',
    description:
      'Immutable break-glass and audit events sealed with deterministic HMAC payloads—tamper detection built into compliance review.',
    icon: Fingerprint,
    accent: 'from-cyan-950/50 via-slate-900 to-emerald-950/30',
    border: 'border-cyan-500/25 hover:border-emerald-500/40',
    iconClass: 'text-cyan-400',
    custom: null,
  },
  {
    id: 'consent',
    title: 'Granular Patient Consent Gates',
    description:
      'Domain-level allowances and absolute exclusions with patient confirmation, expiry windows, and provider-scoped access checks.',
    icon: ShieldCheck,
    accent: 'from-emerald-950/40 to-slate-900',
    border: 'border-emerald-500/25 hover:border-emerald-500/50',
    iconClass: 'text-emerald-400',
    custom: 'consent',
  },
];

export default function FeatureGrid() {
  return (
    <section id="features" className="scroll-mt-24 px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div id="about" className="scroll-mt-24 mb-12 max-w-3xl">
          <p className="text-sm font-medium uppercase tracking-widest text-cyan-400">About the project</p>
          <h2 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
            Safety infrastructure for modern clinical access
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-400">
            NexusHealth Safeguard unifies consent governance, emergency override workflows, and
            pharmacovigilance checks into one accountable clinical portal—designed for HIPAA-ready
            deployments.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-6">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;

            return (
              <article
                key={feature.id}
                className={`group flex w-full flex-col rounded-2xl border bg-gradient-to-br p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl sm:w-[calc(50%-12px)] lg:w-[calc(50%-12px)] xl:max-w-md ${feature.accent} ${feature.border}`}
              >
                {Icon ? (
                  <div
                    className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-950/50 ring-1 ring-slate-700/80 ${feature.iconClass}`}
                  >
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </div>
                ) : null}

                <h3 className="text-lg font-semibold text-white">{feature.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-400">
                  {feature.description}
                </p>

                {feature.custom === 'tags' && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {TERMINOLOGY_TAGS.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 font-mono text-xs text-cyan-300 transition-colors group-hover:border-cyan-400/50"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {feature.custom === 'consent' && <ConsentMatrixDemo />}

                {feature.id === 'integrity' && (
                  <div
                    className="landing-shimmer-line mt-4 h-2 rounded-full bg-gradient-to-r from-cyan-500/20 via-emerald-500/30 to-cyan-500/20"
                    aria-hidden="true"
                  />
                )}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
