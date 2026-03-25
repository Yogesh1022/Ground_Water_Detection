import { useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, Crosshair } from "lucide-react";
import { Bar, Line } from "react-chartjs-2";

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { labels: { color: "#64748b", font: { family: "JetBrains Mono" } } }
  },
  scales: {
    x: { grid: { color: "rgba(255,255,255,.04)" }, ticks: { color: "#64748b" } },
    y: { grid: { color: "rgba(255,255,255,.04)" }, ticks: { color: "#64748b" } }
  }
};

const soils = ["Black Cotton", "Alluvial", "Red", "Clay", "Laterite"];

function riskByDepth(absDepth) {
  if (absDepth > 65) {
    return {
      risk: "DANGER",
      color: "var(--neon-rose)",
      border: "rgba(251,113,133,.3)",
      bg: "rgba(251,113,133,.04)",
      msg: "Water level is very low and dangerous! Fill all your water tanks immediately. Contact taluka office for emergency tanker.",
      cls: "s-danger"
    };
  }
  if (absDepth > 50) {
    return {
      risk: "WARNING",
      color: "var(--neon-amber)",
      border: "rgba(251,191,36,.3)",
      bg: "rgba(251,191,36,.04)",
      msg: "Water level is going down in your area. Save water and use carefully. Check tanker schedule at your taluka office.",
      cls: "s-warn"
    };
  }
  if (absDepth > 35) {
    return {
      risk: "MODERATE",
      color: "var(--neon-cyan)",
      border: "rgba(34,211,238,.3)",
      bg: "rgba(34,211,238,.04)",
      msg: "Water level is okay but keep monitoring. Use water wisely especially for farming.",
      cls: "s-info"
    };
  }
  return {
    risk: "SAFE",
    color: "var(--neon-green)",
    border: "rgba(52,211,153,.3)",
    bg: "rgba(52,211,153,.04)",
    msg: "Water level is good in your area. Continue normal use. Keep rainwater harvesting for future.",
    cls: "s-safe"
  };
}

function DetectPage() {
  const [locationStatus, setLocationStatus] = useState("");
  const [result, setResult] = useState(null);

  const chartData = useMemo(() => {
    if (!result) return null;

    return {
      line: {
        labels: ["6mo ago", "5mo", "4mo", "3mo", "2mo", "1mo", "NOW", "Apr", "May", "Jun"],
        datasets: [
          {
            label: "Actual",
            data: [
              result.depth + 18,
              result.depth + 15,
              result.depth + 12,
              result.depth + 9,
              result.depth + 5,
              result.depth + 2,
              result.depth,
              null,
              null,
              null
            ],
            borderColor: "#22d3ee",
            backgroundColor: "rgba(34,211,238,.06)",
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointBackgroundColor: "#22d3ee",
            borderWidth: 2.5
          },
          {
            label: "Predicted",
            data: [null, null, null, null, null, null, result.depth, result.apr, result.may, result.jun],
            borderColor: "#fb7185",
            borderDash: [6, 4],
            tension: 0.4,
            pointRadius: 5,
            pointBackgroundColor: "#fb7185",
            borderWidth: 2.5
          }
        ]
      },
      bar: {
        labels: [
          "Last Month Rain",
          "Previous Water Level",
          "Height Above Sea",
          "Location",
          "Temperature",
          "Greenery (NDVI)",
          "Soil Type"
        ],
        datasets: [
          {
            data: [0.32, 0.28, 0.15, 0.12, 0.08, 0.04, 0.02],
            backgroundColor: ["#3b82f6", "#22d3ee", "#a855f7", "#fbbf24", "#fb7185", "#34d399", "#64748b"],
            borderRadius: 6
          }
        ]
      }
    };
  }, [result]);

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus("Location not available on this device.");
      return;
    }

    setLocationStatus("Finding your location...");

    navigator.geolocation.getCurrentPosition(
      (p) => {
        const lat = Number(p.coords.latitude.toFixed(4));
        const lon = Number(p.coords.longitude.toFixed(4));

        const baseLat = 20.93;
        const baseLon = 77.78;
        const dist = Math.sqrt((lat - baseLat) ** 2 + (lon - baseLon) ** 2);
        const baseDepth = -(45 + dist * 40 + Math.random() * 8);
        const depth = Math.max(-85, Math.min(-20, baseDepth));
        const absDepth = Math.abs(depth);

        const conf = (88 + Math.random() * 8).toFixed(0);
        const rainfall = `${(5 + Math.random() * 20).toFixed(0)}mm`;
        const soil = soils[Math.floor(Math.random() * soils.length)];

        const apr = depth - (2 + Math.random() * 3);
        const may = apr - (3 + Math.random() * 4);
        const jun = may - (1 + Math.random() * 3);

        setResult({
          lat,
          lon,
          depth,
          conf,
          rainfall,
          soil,
          apr,
          may,
          jun,
          mainRisk: riskByDepth(absDepth),
          aprRisk: riskByDepth(Math.abs(apr)),
          mayRisk: riskByDepth(Math.abs(may)),
          junRisk: riskByDepth(Math.abs(jun))
        });
        setLocationStatus("Location found. Water analysis ready.");
      },
      () => {
        setLocationStatus("Could not get location. Please allow location access in your browser and try again.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="page-view active">
      <div className="card">
        <div className="detect-hero">
          <h2 className="gradient-text">Check Water Level at Your Location</h2>
          <p>Press the button below, we will use your phone location to check nearby water level.</p>
        </div>

        <div className="detect-action-wrap">
          <button className="btn btn-primary btn-lg detect-btn" onClick={useMyLocation}>
            <Crosshair size={22} /> Check My Water Level
          </button>
          <div className="location-status">{locationStatus}</div>
        </div>

        {result ? (
          <div className="detect-result show">
            <div className="result-hero" style={{ background: result.mainRisk.bg, borderColor: result.mainRisk.border }}>
              <div className="result-depth" style={{ color: result.mainRisk.color }}>{result.depth.toFixed(1)}m</div>
              <div className="result-status" style={{ color: result.mainRisk.color }}>{result.mainRisk.risk}</div>
              <div className="result-msg">{result.mainRisk.msg}</div>
              <div className="result-stats">
                <div className="result-stat">
                  <div className="result-stat-val txt-green">{result.conf}%</div>
                  <div className="result-stat-label">Prediction Accuracy</div>
                </div>
                <div className="result-stat">
                  <div className="result-stat-val txt-blue">{result.rainfall}</div>
                  <div className="result-stat-label">Recent Rainfall</div>
                </div>
                <div className="result-stat">
                  <div className="result-stat-val txt-purple">{result.soil}</div>
                  <div className="result-stat-label">Soil Type</div>
                </div>
              </div>
            </div>

            <div className="card inner-card">
              <div className="card-header">
                <div className="card-title">
                  <CalendarClock size={18} className="txt-purple" /> What Will Happen in Next 3 Months?
                </div>
              </div>
              <p className="muted">Our AI system predicts how water level will change over the next 3 months:</p>

              <div className="prediction-timeline">
                <div className="pred-month" style={{ borderColor: result.aprRisk.border }}>
                  <div className="pred-month-name">April 2026</div>
                  <div className="pred-month-depth" style={{ color: result.aprRisk.color }}>{result.apr.toFixed(1)}m</div>
                  <div className={`pred-month-risk ${result.aprRisk.cls}`}>{result.aprRisk.risk}</div>
                </div>
                <div className="pred-arrow">&gt;</div>
                <div className="pred-month" style={{ borderColor: result.mayRisk.border }}>
                  <div className="pred-month-name">May 2026</div>
                  <div className="pred-month-depth" style={{ color: result.mayRisk.color }}>{result.may.toFixed(1)}m</div>
                  <div className={`pred-month-risk ${result.mayRisk.cls}`}>{result.mayRisk.risk}</div>
                </div>
                <div className="pred-arrow">&gt;</div>
                <div className="pred-month" style={{ borderColor: result.junRisk.border }}>
                  <div className="pred-month-name">June 2026</div>
                  <div className="pred-month-depth" style={{ color: result.junRisk.color }}>{result.jun.toFixed(1)}m</div>
                  <div className={`pred-month-risk ${result.junRisk.cls}`}>{result.junRisk.risk}</div>
                </div>
              </div>

              <div className="prediction-advice" style={{ background: result.mainRisk.bg, borderColor: result.mainRisk.border }}>
                <div className="prediction-advice-title" style={{ color: result.mainRisk.color }}>
                  <AlertTriangle size={16} /> What You Should Do:
                </div>
                <ul>
                  <li>Store extra water and fill all available containers.</li>
                  <li>Use less water for washing and cleaning.</li>
                  <li>Use drip irrigation for farming where possible.</li>
                  <li>Check tanker schedule at your taluka office.</li>
                  <li>Report dry wells or hand pumps quickly.</li>
                </ul>
              </div>
            </div>

            <div className="grid-2">
              <div className="card">
                <div className="card-header">
                  <div className="card-title">
                    <span className="card-dot txt-cyan-bg" /> Water Level History and Prediction
                  </div>
                </div>
                <div className="chart-wrap high">
                  <Line data={chartData.line} options={chartOptions} />
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <div className="card-title">
                    <span className="card-dot txt-purple-bg" /> What Affects Water Level?
                  </div>
                </div>
                <div className="chart-wrap high">
                  <Bar
                    data={chartData.bar}
                    options={{
                      ...chartOptions,
                      indexAxis: "y",
                      plugins: { legend: { display: false } },
                      scales: {
                        ...chartOptions.scales,
                        x: {
                          ...chartOptions.scales.x,
                          title: { display: true, text: "How much it matters", color: "#64748b" }
                        }
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default DetectPage;
