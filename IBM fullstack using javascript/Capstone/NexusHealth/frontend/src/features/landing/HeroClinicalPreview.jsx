// frontend/src/features/landing/HeroClinicalPreview.jsx
import { Activity, AlertTriangle, HeartPulse } from 'lucide-react';

const VITALS = [
  { label: 'HR', value: '78', unit: 'bpm', tone: 'text-cyan-400' },
  { label: 'BP', value: '118/76', unit: 'mmHg', tone: 'text-emerald-400' },
  { label: 'SpO₂', value: '98', unit: '%', tone: 'text-cyan-300' },
];

export default function HeroClinicalPreview() {
  return (
    <div
      className="landing-hero-float relative w-full max-w-lg rounded-2xl border border-slate-700/80 bg-slate-900/90 p-5 shadow-2xl shadow-cyan-500/5 ring-1 ring-slate-700/50 backdrop-blur-sm"
      aria-label="Clinical record preview"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Clinical Record</p>
          <p className="font-mono text-sm text-slate-200">REC-7F2A · CARDIOLOGY</p>
        </div>
        <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-400 ring-1 ring-cyan-500/30">
          Live sync
        </span>
      </div>

      <div className="landing-drug-flag-pulse mb-4 flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold text-amber-200">Drug Interaction Flag</p>
          <p className="mt-1 text-xs text-amber-100/80">
            Lisinopril + potassium supplement — elevated hyperkalemia risk detected by safety gate.
          </p>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-3">
        {VITALS.map((vital) => (
          <div
            key={vital.label}
            className="rounded-lg border border-slate-700/60 bg-slate-950/60 px-3 py-2 text-center"
          >
            <p className="text-[10px] uppercase tracking-wide text-slate-500">{vital.label}</p>
            <p className={`font-mono text-lg font-semibold ${vital.tone}`}>{vital.value}</p>
            <p className="text-[10px] text-slate-500">{vital.unit}</p>
          </div>
        ))}
      </div>

      <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-950/50 p-3">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <HeartPulse className="h-4 w-4 text-emerald-400" aria-hidden="true" />
          Assessment
        </div>
        <p className="text-sm leading-relaxed text-slate-300">
          Stable angina under evaluation. Pharmacovigilance checks passed with one active interaction
          warning routed to physician review queue.
        </p>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5 text-cyan-500" aria-hidden="true" />
          Safety gate: monitoring
        </span>
        <span className="font-mono">Updated 12s ago</span>
      </div>
    </div>
  );
}
