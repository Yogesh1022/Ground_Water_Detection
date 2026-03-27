import { useState } from 'react';
import { Droplets, Shield } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  window.addEventListener('scroll', () => {
    setScrolled(window.scrollY > 50);
  });

  const navLinks = [
    { href: '#features', label: 'Features' },
    { href: '#architecture', label: 'Architecture' },
    { href: '#tech', label: 'Tech Stack' },
    { href: '#workflow', label: 'Workflow' },
    { href: '#impact', label: 'Impact' },
  ];

  return (
    <nav className={`fixed top-0 w-full z-100 px-8 transition-all ${scrolled ? 'bg-opacity-90 backdrop-blur-xl border-b border-cyan-500 border-opacity-10' : ''}`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between py-4">
        <a href="/" className="flex items-center gap-2.5 font-black text-xl text-white hover:text-cyan-400 transition">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/40">
            <Droplets size={20} className="text-gray-900" />
          </div>
          <span>Aqua<span className="bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">Vidarbha</span></span>
        </a>

        <div className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-slate-400 hover:text-cyan-400 text-sm font-medium transition relative group"
            >
              {link.label}
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-cyan-400 group-hover:w-full transition-all" />
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/login"
            className="px-6 py-2.5 rounded-full font-semibold text-sm bg-transparent text-purple-400 border border-purple-500 border-opacity-40 hover:bg-purple-500 hover:bg-opacity-10 transition flex items-center gap-2"
          >
            <Shield size={14} /> Officer Portal
          </a>
          <Link
            to="/dashboard-user"
            className="px-6 py-2.5 rounded-full font-semibold text-sm bg-gradient-to-r from-cyan-400 to-blue-500 text-gray-900 shadow-xl shadow-cyan-500/30 hover:shadow-cyan-500/50 hover:scale-105 transition"
          >
            Open Dashboard
          </Link>
        </div>
      </div>
    </nav>
  );
}
