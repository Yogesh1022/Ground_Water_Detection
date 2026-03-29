import { Link } from 'react-router-dom';
import { Rocket, Shield, Droplets } from 'lucide-react';

export function CTASection() {
  return (
    <section className="py-20 px-4 relative">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-96 h-96 rounded-full opacity-5 blur-3xl bg-gradient-to-br from-cyan-400 to-purple-500" />
      </div>

      <div className="max-w-4xl mx-auto text-center relative z-10">
        <h2 className="text-5xl font-black mb-4 text-white">
          Ready to <span className="bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">Save Water?</span>
        </h2>
        <p className="text-lg text-slate-400 mb-8 max-w-2xl mx-auto">
          Explore the full AI-powered dashboard with interactive crisis maps, real-time predictions, and model analytics.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/dashboard-user"
            className="px-8 py-4 rounded-full font-semibold bg-gradient-to-r from-cyan-400 to-blue-500 text-gray-900 shadow-xl shadow-cyan-500/30 hover:shadow-cyan-500/50 hover:scale-105 transition flex items-center justify-center gap-2 text-lg"
          >
            <Rocket size={20} /> Launch Public Dashboard
          </Link>
          <a
            href="/login"
            className="px-8 py-4 rounded-full font-semibold bg-transparent text-purple-400 border border-purple-500 border-opacity-40 hover:bg-purple-500 hover:bg-opacity-10 transition flex items-center justify-center gap-2 text-lg"
          >
            <Shield size={20} /> Officer / Admin Login
          </a>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-slate-800 py-8 px-4 bg-slate-950 bg-opacity-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-white">
          <Droplets size={18} className="text-cyan-400" />
          AquaVidarbha
        </div>
        <div className="text-sm text-slate-500">AI-Based Groundwater Crisis Predictor — Vidarbha, Maharashtra</div>
        <div className="text-sm text-slate-500">&copy; 2026 AquaVidarbha</div>
      </div>
    </footer>
  );
}
