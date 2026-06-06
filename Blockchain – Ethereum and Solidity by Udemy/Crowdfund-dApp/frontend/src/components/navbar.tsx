import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export function Navbar() {
  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-xl font-bold tracking-tight">Crowdfund DApp</span>
          </Link>
          <div className="hidden md:flex gap-4">
            <Link href="/" className="text-sm font-medium transition-colors hover:text-primary">
              All Campaigns
            </Link>
            <Link href="/campaigns/new" className="text-sm font-medium transition-colors hover:text-primary">
              Create Campaign
            </Link>
            <Link href="/dashboard" className="text-sm font-medium transition-colors hover:text-primary">
              Dashboard
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <ConnectButton />
        </div>
      </div>
    </nav>
  );
}
