export function WorkflowSection() {
  const steps = [
    { num: '1', title: 'Input Data', desc: 'Enter district & date range' },
    { num: '2', title: 'Process', desc: 'Run 10-model ensemble' },
    { num: '3', title: 'Predict', desc: 'Get 90-day forecast' },
    { num: '4', title: 'Visualize', desc: 'View crisis maps & alerts' },
  ];

  return (
    <section id="workflow" className="py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-4">
            <span>🔄 How It Works</span>
          </div>
          <h2 className="text-5xl font-black mb-4 text-white">
            The <span className="bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">Prediction Journey</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
          {steps.map((step, i) => (
            <div key={i} className="relative text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center mx-auto mb-4 text-2xl font-black text-gray-900 shadow-lg shadow-cyan-500/30">
                {step.num}
              </div>
              <h4 className="text-lg font-bold text-white mb-2">{step.title}</h4>
              <p className="text-sm text-slate-400">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ImpactSection() {
  const impacts = [
    { value: '650+', label: 'Wells Monitored', bar: '#22d3ee' },
    { value: '90', label: 'Days Prediction', bar: '#a855f7' },
    { value: '0.92', label: 'R² Model Accuracy', bar: '#34d399' },
  ];

  return (
    <section id="impact" className="py-20 px-4 bg-gradient-to-b from-slate-950 to-slate-900">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-4">
            <span>📊 Key Metrics</span>
          </div>
          <h2 className="text-5xl font-black mb-4 text-white">
            <span className="bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">Scale & Accuracy</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {impacts.map((impact, i) => (
            <div key={i} className="rounded-2xl p-8 bg-slate-900 bg-opacity-50 border border-slate-800 text-center relative overflow-hidden group hover:border-slate-700 transition">
              <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition" style={{ background: `radial-gradient(circle, ${impact.bar})` }} />
              <div className="relative z-10">
                <div className="text-5xl font-black font-mono mb-2" style={{ color: impact.bar }}>
                  {impact.value}
                </div>
                <div className="text-sm text-slate-400">{impact.label}</div>
                <div className="w-16 h-1 rounded-full mx-auto mt-4" style={{ background: impact.bar }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
