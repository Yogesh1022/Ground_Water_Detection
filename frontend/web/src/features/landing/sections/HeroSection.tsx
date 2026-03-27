import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Rocket, Shield } from 'lucide-react';

export function HeroSection() {
  const [typed, setTyped] = useState('');
  const words = ['It Strikes', 'Farms Fail', 'Wells Dry', 'Lives Suffer'];
  const [wordIndex, setWordIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentWord = words[wordIndex];
    const timer = setTimeout(() => {
      if (!isDeleting && charIndex < currentWord.length) {
        setTyped(currentWord.substring(0, charIndex + 1));
        setCharIndex(charIndex + 1);
      } else if (isDeleting && charIndex > 0) {
        setTyped(currentWord.substring(0, charIndex - 1));
        setCharIndex(charIndex - 1);
      } else if (!isDeleting && charIndex === currentWord.length) {
        setTimeout(() => setIsDeleting(true), 2000);
      } else if (isDeleting && charIndex === 0) {
        setIsDeleting(false);
        setWordIndex((wordIndex + 1) % words.length);
      }
    }, isDeleting ? 40 : 80);

    return () => clearTimeout(timer);
  }, [charIndex, isDeleting, wordIndex, words]);

  return (
    <section className="relative min-h-screen flex items-center pt-20 pb-12 px-4 overflow-hidden">
      <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-8 items-center">
        <div className="z-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-cyan-500 bg-opacity-10 border border-cyan-500 border-opacity-20 text-cyan-400 mb-6">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            AI-Powered Groundwater Sentinel
          </div>

          <h1 className="text-5xl lg:text-6xl font-black leading-tight mb-6 text-white">
            Predict Water
            <br />
            <span className="bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">Crisis Before</span>
            <br />
            <span className="inline-block min-w-96 border-r-4 border-cyan-400">
              {typed}
            </span>
          </h1>

          <p className="text-lg text-slate-400 leading-relaxed mb-8 max-w-xl">
            Harness 10 ML/DL models, 650+ monitoring wells, and 15 years of satellite data to forecast groundwater depletion 90 days in advance across 11 Vidarbha districts.
          </p>

          <div className="flex flex-wrap gap-4 mb-12">
            <Link
              to="/dashboard-user"
              className="px-8 py-3 rounded-full font-semibold text-sm bg-gradient-to-r from-cyan-400 to-blue-500 text-gray-900 shadow-xl shadow-cyan-500/30 hover:shadow-cyan-500/50 hover:scale-105 transition flex items-center gap-2"
            >
              <Rocket size={18} /> Launch Public Dashboard
            </Link>
            <a
              href="/login"
              className="px-8 py-3 rounded-full font-semibold text-sm bg-transparent text-purple-400 border border-purple-500 border-opacity-40 hover:bg-purple-500 hover:bg-opacity-10 transition flex items-center gap-2"
            >
              <Shield size={18} /> Officer / Admin Login
            </a>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { value: '10', label: 'ML/DL Models', color: 'cyan' },
              { value: '650+', label: 'Wells', color: 'purple' },
              { value: '15', label: 'Years Data', color: 'green' },
              { value: '11', label: 'Districts', color: 'amber' },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className={`text-2xl font-black ${
                  stat.color === 'cyan' ? 'text-cyan-400' :
                  stat.color === 'purple' ? 'text-purple-500' :
                  stat.color === 'green' ? 'text-green-400' :
                  'text-amber-400'
                }`}>
                  {stat.value}
                </div>
                <div className="text-xs text-slate-400 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="hidden lg:flex justify-center relative z-10">
          <div className="w-96 h-96 rounded-3xl bg-gradient-to-br from-cyan-500 to-purple-600 opacity-20 blur-3xl" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-6xl font-black text-cyan-400 opacity-40">🌍</div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-2 z-20">
        <div className="w-6 h-10 border-2 border-slate-400 rounded-full flex justify-center">
          <div className="w-1 h-2 bg-cyan-400 rounded-full animate-bounce mt-2" />
        </div>
        <span className="text-xs text-slate-500">Scroll to explore</span>
      </div>
    </section>
  );
}
