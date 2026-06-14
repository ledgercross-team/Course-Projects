// frontend/src/features/landing/Footer.jsx
import { Link } from 'react-router-dom';
import { Globe, Mail, Share2 } from 'lucide-react';

const COMPLIANCE_LINKS = [
  { href: '#privacy', label: 'Privacy Policy' },
  { href: '#terms', label: 'Terms of Service' },
  { href: '#hipaa', label: 'HIPAA Readiness' },
  { href: '#gdpr', label: 'GDPR' },
  { href: '#soc2', label: 'SOC 2 Controls' },
];

const SOCIAL_LINKS = [
  { href: '#github', label: 'GitHub', icon: Share2 },
  { href: '#linkedin', label: 'LinkedIn', icon: Globe },
  { href: '#contact', label: 'Contact', icon: Mail },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-800 bg-zinc-950 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-8 md:flex-row md:items-start">
        <div className="flex flex-col items-center gap-2 text-center md:items-start md:text-left">
          <p className="text-sm font-semibold text-white">NexusHealth Safeguard</p>
          <p className="text-xs text-slate-500">Clinical Portal · Access &amp; Safety Management</p>
          <p className="mt-2 text-xs text-slate-600">
            © {year} NexusHealth Safeguard. All rights reserved.
          </p>
        </div>

        <nav aria-label="Compliance" className="flex flex-wrap justify-center gap-x-5 gap-y-2">
          {COMPLIANCE_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-xs text-slate-500 transition-colors hover:scale-105 hover:text-emerald-400"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {SOCIAL_LINKS.map((social) => {
            const Icon = social.icon;
            return (
              <a
                key={social.href}
                href={social.href}
                aria-label={social.label}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 text-slate-500 transition-all hover:scale-110 hover:border-cyan-500/40 hover:text-cyan-400"
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
              </a>
            );
          })}
        </div>
      </div>

      <p className="mx-auto mt-8 max-w-3xl text-center text-[11px] leading-relaxed text-slate-600">
        This platform supports HIPAA-aligned workflows. Compliance artifacts (HIPAA / GDPR / SOC 2)
        are organizational responsibilities—see policy links above. Not a substitute for legal counsel
        or formal certification.
      </p>

      <p className="mt-4 text-center text-xs text-slate-600">
        <Link to="/login" className="text-emerald-500/80 hover:text-emerald-400">
          Clinical staff sign in →
        </Link>
      </p>
    </footer>
  );
}
