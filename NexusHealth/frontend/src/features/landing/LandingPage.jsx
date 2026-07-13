// frontend/src/features/landing/LandingPage.jsx
import { useEffect } from 'react';
import './landing.css';
import Navbar from './Navbar';
import Hero from './Hero';
import FeatureGrid from './FeatureGrid';
import SecuritySection from './SecuritySection';
import Footer from './Footer';

export default function LandingPage() {
  useEffect(() => {
    document.documentElement.classList.add('dark');
    return () => {
      // Restore user theme preference when leaving marketing pages
      const stored = localStorage.getItem('theme');
      document.documentElement.classList.toggle('dark', stored === 'dark');
    };
  }, []);

  return (
    <div className="min-h-svh bg-zinc-950 text-slate-100">
      <Navbar />
      <main>
        <Hero />
        <FeatureGrid />
        <SecuritySection />
      </main>
      <Footer />
    </div>
  );
}
