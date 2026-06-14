// frontend/src/features/landing/Hero.jsx
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import HeroClinicalPreview from './HeroClinicalPreview';

export default function Hero() {
  return (
    <section className="relative overflow-hidden px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
      <div className="landing-grid-bg pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
      <div
        className="pointer-events-none absolute -left-32 top-20 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative mx-auto flex max-w-7xl flex-col items-center gap-12 lg:flex-row lg:items-center lg:justify-between lg:gap-16">
        <div className="flex max-w-2xl flex-col items-start gap-6 text-left lg:flex-1">
          <p className="landing-animate-fade-up rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-medium uppercase tracking-widest text-emerald-400">
            Clinical Portal · Access Management
          </p>
          <h1 className="landing-animate-fade-up-delay-1 text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Instant Access,{' '}
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              Absolute Accountability.
            </span>
          </h1>
          <p className="landing-animate-fade-up-delay-2 max-w-xl text-base leading-relaxed text-slate-400 sm:text-lg">
            Real-time pharmacovigilance safety gates, granular patient consent controls, and
            compliant break-glass override protocols—sealed, auditable, and built for high-stakes
            clinical workflows.
          </p>
          <div className="landing-animate-fade-up-delay-3 flex w-full flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              to="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-zinc-950 transition-all hover:scale-105 hover:bg-emerald-400"
            >
              Get started
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <a
              href="#features"
              className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-900/50 px-6 py-3 text-sm font-medium text-slate-200 transition-all hover:scale-105 hover:border-cyan-500/50 hover:text-white"
            >
              Explore capabilities
            </a>
          </div>
        </div>

        <div className="flex w-full flex-1 justify-center lg:justify-end">
          <HeroClinicalPreview />
        </div>
      </div>
    </section>
  );
}
