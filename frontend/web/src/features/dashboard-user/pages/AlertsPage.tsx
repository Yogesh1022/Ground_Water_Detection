import { AlertCircle, BellRing, CheckCircle, CloudRain, TrendingDown, Truck } from "lucide-react";
import { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import { getAlerts, getGroundwaterReadings } from "../api/commonUserApi";

const trendOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { labels: { color: "#64748b", font: { family: "JetBrains Mono" }, padding: 16 } } },
  scales: {
    x: { grid: { color: "rgba(255,255,255,.04)" }, ticks: { color: "#64748b" } },
    y: { grid: { color: "rgba(255,255,255,.04)" }, ticks: { color: "#64748b" } }
  }
};

function AlertsPage() {
  const [apiAlerts, setApiAlerts] = useState([]);
  const [trendData, setTrendData] = useState(null);

  useEffect(() => {
    let active = true;

    async function loadAlerts() {
      try {
        const [response, readingsResponse] = await Promise.all([
          getAlerts(),
          getGroundwaterReadings({ page: 1, limit: 12, sort_by: "reading_date", sort_order: "ASC" })
        ]);

        const rows = Array.isArray(response?.data) ? response.data : [];
        if (!active) return;

        setApiAlerts(
          rows.slice(0, 4).map((a) => ({
            id: a.id,
            title: a.title,
            message: a.message,
            time: new Date(a.created_at || Date.now()).toLocaleString(),
            tone: toTone(a.type)
          }))
        );

        const readingRows = Array.isArray(readingsResponse?.data) ? readingsResponse.data : [];
        if (readingRows.length > 0) {
          setTrendData({
            labels: readingRows.map((r) => new Date(r.reading_date).toLocaleDateString()),
            datasets: [
              {
                label: "Water Level (live)",
                data: readingRows.map((r) => -Math.abs(Number(r.depth_mbgl || 0))),
                borderColor: "#22d3ee",
                backgroundColor: "rgba(34,211,238,.06)",
                fill: true,
                tension: 0.35,
                pointRadius: 3,
                pointBackgroundColor: "#22d3ee",
                borderWidth: 2.5
              }
            ]
          });
        } else {
          setTrendData(null);
        }
      } catch {
        setApiAlerts([]);
        setTrendData(null);
      }
    }

    loadAlerts();
    return () => {
      active = false;
    };
  }, []);

  if (apiAlerts.length > 0) {
    return (
      <div className="page-view active">
        <div className="card space-btm">
          <div className="card-header">
            <div className="card-title"><BellRing size={18} className="txt-rose" /> Water Alerts for Your Area</div>
          </div>

          {apiAlerts.map((a) => (
            <div key={a.id} className={`alert-box alert-${a.tone}`}>
              <div className="alert-icon">{iconForTone(a.tone)}</div>
              <div>
                <div className={`alert-title ${titleClassForTone(a.tone)}`}>{a.title}</div>
                {a.message}
                <div className="alert-time mono">{a.time}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title"><TrendingDown size={18} className="txt-amber" /> Water Level Over Time</div>
          </div>
          <div className="chart-wrap high">
            {trendData ? <Line data={trendData} options={trendOptions} /> : <div className="muted">No live trend data available.</div>}
          </div>
          <div className="forecast-note">
            <strong className="txt-amber">What this means:</strong> The blue line shows water level going down. The red dotted line is forecast.
            When monsoon arrives (June-August), levels can gradually recover.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-view active">
      <div className="card space-btm">
        <div className="card-header">
          <div className="card-title"><BellRing size={18} className="txt-rose" /> Water Alerts for Your Area</div>
        </div>

        <div className="alert-box alert-info">
          <div className="alert-icon"><Truck size={24} color="var(--neon-cyan)" /></div>
          <div>
            <div className="alert-title txt-cyan">No active alerts from backend</div>
            The alert endpoint returned no active records at this time.
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title"><TrendingDown size={18} className="txt-amber" /> Water Level Over Time</div>
        </div>
        <div className="chart-wrap high">
          {trendData ? <Line data={trendData} options={trendOptions} /> : <div className="muted">No live trend data available.</div>}
        </div>
        <div className="forecast-note">
          <strong className="txt-amber">What this means:</strong> The blue line shows water level going down. The red dotted line is forecast.
          When monsoon arrives (June-August), levels can gradually recover.
        </div>
      </div>
    </div>
  );
}

export default AlertsPage;

function toTone(type) {
  const t = String(type || "").toLowerCase();
  if (t.includes("critical") || t.includes("danger")) return "critical";
  if (t.includes("success") || t.includes("resolved")) return "success";
  if (t.includes("warn")) return "warn";
  return "info";
}

function iconForTone(tone) {
  if (tone === "critical") return <AlertCircle size={24} color="var(--neon-rose)" />;
  if (tone === "warn") return <CloudRain size={24} color="var(--neon-amber)" />;
  if (tone === "success") return <CheckCircle size={24} color="var(--neon-green)" />;
  return <Truck size={24} color="var(--neon-cyan)" />;
}

function titleClassForTone(tone) {
  if (tone === "critical") return "txt-rose";
  if (tone === "warn") return "txt-amber";
  if (tone === "success") return "txt-green";
  return "txt-cyan";
}
