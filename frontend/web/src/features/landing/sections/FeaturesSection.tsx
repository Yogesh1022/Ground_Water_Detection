import { Brain, Bell, Map, BarChart3, Sparkles } from 'lucide-react';

export function FeaturesSection() {
  const features = [
    {
      title: 'GPS-to-Prediction ML Pipeline',
      description: 'Input GPS coordinates and date range. Get R² = 0.92 predictions automatically. Zero manual preprocessing.',
      icon: Map,
      span: 2,
      color: 'cyan',
    },
    {
      title: '10-Model Ensemble',
      description: 'XGBoost + LSTM + CNN-LSTM + GRU + 1D-CNN — weighted ensemble achieves R² = 0.92.',
      icon: Brain,
      span: 1,
      color: 'purple',
    },
    {
      title: '60–90 Day Early Warning',
      description: 'Predict groundwater depletion 3 months ahead using Vidarbha\'s hidden monsoon-to-recharge lag.',
      icon: Bell,
      span: 1,
      color: 'green',
    },
    {
      title: 'Interactive Crisis Maps',
      description: '650+ wells color-coded by risk level on live maps — Safe 🟢, Warning 🟠, Critical 🔴.',
      icon: Map,
      span: 1,
      color: 'amber',
    },
    {
      title: 'Lag Feature Engineering — The Core Innovation',
      description: 'Vidarbha\'s basalt geology creates a hidden 2-3 month delay. Our models capture this.',
      icon: Sparkles,
      span: 2,
      color: 'rose',
    },
    {
      title: 'SHAP Explainability',
      description: 'Understand exactly why each prediction was made. Full feature importance with SHAP values.',
      icon: BarChart3,
      span: 1,
      color: 'blue',
    },
  ];

  const colorMap = {
    cyan: { bg: 'rgba(34,211,238,0.15)', icon: 'text-cyan-400' },
    purple: { bg: 'rgba(168,85,247,0.15)', icon: 'text-purple-500' },
    green: { bg: 'rgba(52,211,153,0.15)', icon: 'text-green-400' },
    amber: { bg: 'rgba(251,191,36,0.15)', icon: 'text-amber-400' },
    rose: { bg: 'rgba(251,113,133,0.15)', icon: 'text-rose-400' },
    blue: { bg: 'rgba(59,130,246,0.15)', icon: 'text-blue-400' },
  };

  return (
    <section id="features" className="py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-4">
            <span>⚡ Core Capabilities</span>
          </div>
          <h2 className="text-5xl font-black mb-4 text-white">
            Built for <span className="bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">Water Security</span>
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            From GPS coordinates to actionable insights — a fully autonomous prediction pipeline powered by spatial AI.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            const colors = colorMap[feature.color as keyof typeof colorMap];
            return (
              <div
                key={i}
                className={`rounded-3xl p-8 bg-slate-900 bg-opacity-50 border border-slate-800 hover:border-slate-700 transition-all hover:scale-105 md:col-span-${feature.span} overflow-hidden relative group`}
              >
                <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-10 -mr-24 -mt-24 group-hover:opacity-20 transition" style={{ background: `radial-gradient(circle, ${colors.bg})` }} />
                
                <div className="relative z-10">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${colors.icon}`}
                    style={{ background: colors.bg }}
                  >
                    <Icon size={24} />
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-white">{feature.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{feature.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
