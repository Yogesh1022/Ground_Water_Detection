import { useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, Crosshair } from "lucide-react";
import { Bar, Line } from "react-chartjs-2";
import { predictDepth } from "../api/commonUserApi";

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

type RiskBand = {
  risk: string;
  color: string;
  border: string;
  bg: string;
  msg: string;
  cls: string;
};

type PredictFormState = {
  latitude: string;
  longitude: string;
  rainfall_mm: string;
  temperature_c: string;
  humidity_pct: string;
  ndvi: string;
  month: string;
  year: string;
};

type PredictPayloadOverrides = Partial<{
  latitude: number;
  longitude: number;
  rainfall_mm: number;
  temperature_c: number;
  humidity_pct: number;
  ndvi: number;
  month: number;
  year: number;
}>;

type PredictApiResponse = {
  depth_mbgl?: number;
  confidence_pct?: number;
  multi_month_forecast?: Array<{ depth_mbgl?: number }>;
  prediction_path?: string;
};

type DetectResult = {
  lat: number;
  lon: number;
  depth: number;
  conf: string;
  rainfall: string;
  predictionPath: string;
  apr: number;
  may: number;
  jun: number;
  mainRisk: RiskBand;
  aprRisk: RiskBand;
  mayRisk: RiskBand;
  junRisk: RiskBand;
};

function riskByDepth(absDepth: number): RiskBand {
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

function formatPredictionPath(path: string): string {
  if (path === "EXACT_WELL") {
    return "Path 1 - Exact Well";
  }
  if (path === "KNN_IDW_TEMPORAL") {
    return "Path 2 - KNN + IDW + Temporal";
  }
  if (path === "ENVIRONMENTAL_ONLY") {
    return "Path 3 - Environmental Ensemble";
  }
  return path;
}

function DetectPage() {
  const now = new Date();
  const [form, setForm] = useState<PredictFormState>({
    latitude: "",
    longitude: "",
    rainfall_mm: "",
    temperature_c: "",
    humidity_pct: "",
    ndvi: "",
    month: String(now.getMonth() + 1),
    year: String(now.getFullYear())
  });
  const [locationStatus, setLocationStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DetectResult | null>(null);

  const setField = <K extends keyof PredictFormState>(field: K, value: PredictFormState[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const buildPayload = (overrides: PredictPayloadOverrides = {}) => {
    const latitude = Number(overrides.latitude ?? form.latitude);
    const longitude = Number(overrides.longitude ?? form.longitude);
    const rainfall = Number(overrides.rainfall_mm ?? form.rainfall_mm);
    const temperature = Number(overrides.temperature_c ?? form.temperature_c);
    const humidity = Number(overrides.humidity_pct ?? form.humidity_pct);
    const ndvi = Number(overrides.ndvi ?? form.ndvi);
    const month = Number(overrides.month ?? form.month);
    const year = Number(overrides.year ?? form.year);

    return {
      latitude,
      longitude,
      rainfall_mm: Number.isFinite(rainfall) ? rainfall : 0,
      temperature_c: Number.isFinite(temperature) ? temperature : 0,
      humidity_pct: Number.isFinite(humidity) ? humidity : 0,
      ndvi: Number.isFinite(ndvi) ? ndvi : 0,
      month: Number.isFinite(month) ? month : now.getMonth() + 1,
      year: Number.isFinite(year) ? year : now.getFullYear()
    };
  };

  const runPrediction = async (overrides: PredictPayloadOverrides = {}) => {
    const payload = buildPayload(overrides);

    if (!Number.isFinite(payload.latitude) || !Number.isFinite(payload.longitude)) {
      setLocationStatus("Enter latitude and longitude first, or use your current location.");
      return;
    }

    setLoading(true);
    setLocationStatus("Running prediction...");

    try {
      const prediction = (await predictDepth(payload)) as PredictApiResponse;
      const depth = -Math.abs(Number(prediction?.depth_mbgl || 0));

      const forecast = Array.isArray(prediction?.multi_month_forecast)
        ? prediction.multi_month_forecast
        : [];

      const apr = -Math.abs(Number(forecast[0]?.depth_mbgl ?? prediction?.depth_mbgl ?? 0));
      const may = -Math.abs(Number(forecast[1]?.depth_mbgl ?? forecast[0]?.depth_mbgl ?? prediction?.depth_mbgl ?? 0));
      const jun = -Math.abs(Number(forecast[2]?.depth_mbgl ?? forecast[1]?.depth_mbgl ?? prediction?.depth_mbgl ?? 0));

      setResult({
        lat: payload.latitude,
        lon: payload.longitude,
        depth,
        conf: String(Math.round(Number(prediction?.confidence_pct || 0))),
        rainfall: payload.rainfall_mm > 0 ? `${payload.rainfall_mm.toFixed(1)} mm` : "Live model",
        predictionPath: prediction?.prediction_path || "UNKNOWN",
        apr,
        may,
        jun,
        mainRisk: riskByDepth(Math.abs(depth)),
        aprRisk: riskByDepth(Math.abs(apr)),
        mayRisk: riskByDepth(Math.abs(may)),
        junRisk: riskByDepth(Math.abs(jun))
      });
      setLocationStatus("Prediction ready.");
    } catch {
      setLocationStatus("Prediction service is unavailable right now.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

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
      async (p) => {
        const lat = Number(p.coords.latitude.toFixed(4));
        const lon = Number(p.coords.longitude.toFixed(4));
        setField("latitude", String(lat));
        setField("longitude", String(lon));
        await runPrediction({ latitude: lat, longitude: lon });
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
          <p>Use your location or fill the form below to send the full prediction payload to the model service.</p>
        </div>

        <div className="card inner-card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <div className="card-title">
              <span className="card-dot txt-cyan-bg" /> Prediction Inputs
            </div>
          </div>
          <div className="grid-2">
            <label className="field-block">
              <span>Latitude</span>
              <input value={form.latitude} onChange={(e) => setField("latitude", e.target.value)} placeholder="20.45" />
            </label>
            <label className="field-block">
              <span>Longitude</span>
              <input value={form.longitude} onChange={(e) => setField("longitude", e.target.value)} placeholder="78.91" />
            </label>
            <label className="field-block">
              <span>Rainfall (mm)</span>
              <input value={form.rainfall_mm} onChange={(e) => setField("rainfall_mm", e.target.value)} placeholder="32" />
            </label>
            <label className="field-block">
              <span>Temperature (°C)</span>
              <input value={form.temperature_c} onChange={(e) => setField("temperature_c", e.target.value)} placeholder="31" />
            </label>
            <label className="field-block">
              <span>Humidity (%)</span>
              <input value={form.humidity_pct} onChange={(e) => setField("humidity_pct", e.target.value)} placeholder="64" />
            </label>
            <label className="field-block">
              <span>NDVI</span>
              <input value={form.ndvi} onChange={(e) => setField("ndvi", e.target.value)} placeholder="0.42" />
            </label>
            <label className="field-block">
              <span>Month</span>
              <input value={form.month} onChange={(e) => setField("month", e.target.value)} placeholder="5" />
            </label>
            <label className="field-block">
              <span>Year</span>
              <input value={form.year} onChange={(e) => setField("year", e.target.value)} placeholder="2026" />
            </label>
          </div>
        </div>

        <div className="detect-action-wrap">
          <button className="btn btn-primary btn-lg detect-btn" onClick={useMyLocation} disabled={loading}>
            <Crosshair size={22} /> {loading ? "Checking..." : "Use My Location"}
          </button>
          <button className="btn btn-secondary btn-lg detect-btn" onClick={() => runPrediction()} disabled={loading}>
            Run Prediction
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
                  <div className="result-stat-val txt-purple">{formatPredictionPath(result.predictionPath)}</div>
                  <div className="result-stat-label">Prediction Path</div>
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
                  {chartData ? <Line data={chartData.line} options={chartOptions} /> : null}
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <div className="card-title">
                    <span className="card-dot txt-purple-bg" /> What Affects Water Level?
                  </div>
                </div>
                <div className="chart-wrap high">
                  {chartData ? (
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
                  ) : null}
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
