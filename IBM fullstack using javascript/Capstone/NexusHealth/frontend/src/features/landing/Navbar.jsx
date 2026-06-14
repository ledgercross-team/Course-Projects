// frontend/src/features/landing/Navbar.jsx
import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';

const NAV_LINKS = [
  { href: '#features', label: 'Features' },
  { href: '#security', label: 'Security' },
  { href: '#about', label: 'About' },
];

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-zinc-950/80 backdrop-blur-xl">
      <nav
        className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8"
        aria-label="Primary"
      >
        <Link
          to="/"
          className="flex items-center gap-3 transition-transform hover:scale-[1.02]"
        >
          <span className="landing-logo-glow flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30">
            <Shield className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-sm font-semibold tracking-wide text-white">NexusHealth Safeguard</span>
            <span className="text-xs text-slate-400">Clinical Portal</span>
          </span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-6">
          <div className="hidden items-center gap-6 md:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-slate-300 transition-all hover:scale-105 hover:text-emerald-400"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/login"
              className="rounded-lg px-3 py-2 text-sm text-slate-300 transition-all hover:scale-105 hover:text-white"
            >
              Log In
            </Link>
            <Link
              to="/signup"
              className="landing-signup-glow rounded-lg p-[1px] transition-transform hover:scale-105"
            >
              <span className="flex rounded-[7px] bg-zinc-950 px-4 py-2 text-sm font-medium text-white">
                Sign Up
              </span>
            </Link>
          </div>
        </div>
      </nav>
    </header>
  );
}
