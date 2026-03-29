import { Database, Brain, Zap } from 'lucide-react';

export function ArchitectureSection() {
  return (
    <section id="architecture" className="py-20 px-4 bg-gradient-to-b from-slate-950 to-slate-900">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-4">
            <span>🖥️ System Architecture</span>
          </div>
          <h2 className="text-5xl font-black mb-4 text-white">
            3-Tier <span className="bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">Intelligence Pipeline</span>
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Spatial → Prediction → Integration
          </p>
        </div>

        <div className="flex flex-col lg:flex-row items-stretch gap-4 lg:gap-0">
          {[
            {
              title: 'Data Ingestion',
              icon: Database,
              items: ['650+ well coords', 'Rainfall data', '15y history', 'Satellite NDVI'],
              color: 'cyan',
            },
            {
              title: 'Prediction Engine',
              icon: Brain,
              items: ['Feature eng', '10 models', 'Ensembling', 'R² validation'],
              color: 'purple',
            },
            {
              title: 'Decision Layer',
              icon: Zap,
              items: ['Risk scoring', 'Crisis alerts', 'Impact maps', 'Export API'],
              color: 'green',
            },
          ].map((tier, i) => {
            const Icon = tier.icon;
            const colorClass = tier.color === 'cyan' ? 'border-cyan-500 border-opacity-20' : tier.color === 'purple' ? 'border-purple-500 border-opacity-20' : 'border-green-500 border-opacity-20';
            const textColor = tier.color === 'cyan' ? 'text-cyan-400' : tier.color === 'purple' ? 'text-purple-400' : 'text-green-400';

            return (
              <div key={i} className={`flex-1 p-6 rounded-2xl bg-slate-900 bg-opacity-50 border ${colorClass} relative lg:first:rounded-r-none lg:last:rounded-l-none`}>
                <div className={`flex items-center gap-3 mb-4 ${textColor}`}>
                  <Icon size={24} />
                  <h3 className="text-lg font-bold text-white">{tier.title}</h3>
                </div>
                <ul className="space-y-2">
                  {tier.items.map((item, j) => (
                    <li key={j} className="text-sm text-slate-400 flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${tier.color === 'cyan' ? 'bg-cyan-400' : tier.color === 'purple' ? 'bg-purple-400' : 'bg-green-400'}`} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
