import { AlertCircle, BellRing, CheckCircle, CloudRain, TrendingDown, Truck } from "lucide-react";
import { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import { getAlerts } from "../api/commonUserApi";

const trendData = {
  labels: ["Oct 2025", "Nov", "Dec", "Jan 2026", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"],
  datasets: [
    {
      label: "Water Level (actual)",
      data: [-48, -52, -55, -58, -61, -63.4, null, null, null, null, null],
      borderColor: "#22d3ee",
      backgroundColor: "rgba(34,211,238,.06)",
      fill: true,
      tension: 0.4,
      pointRadius: 4,
      pointBackgroundColor: "#22d3ee",
      borderWidth: 2.5
    },
    {
      label: "Prediction",
      data: [null, null, null, null, null, -63.4, -66, -69, -71, -65, -55],
      borderColor: "#fb7185",
      borderDash: [6, 4],
      tension: 0.4,
      pointRadius: 4,
      pointBackgroundColor: "#fb7185",
      borderWidth: 2
    },
    {
      label: "Monsoon recovery",
      data: [null, null, null, null, null, null, null, null, null, -65, -55],
      borderColor: "#34d399",
      borderDash: [6, 4],
      tension: 0.4,
      pointRadius: 4,
      pointBackgroundColor: "#34d399",
      borderWidth: 2
    }
  ]
};

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

  useEffect(() => {
    let active = true;

    async function loadAlerts() {
      try {
        const response = await getAlerts();
        const rows = Array.isArray(response?.data) ? response.data : [];
        if (!active || rows.length === 0) return;

        setApiAlerts(
          rows.slice(0, 4).map((a) => ({
            id: a.id,
            title: a.title,
            message: a.message,
            time: new Date(a.created_at).toLocaleString(),
            tone: toTone(a.type)
          }))
        );
      } catch {
        // Leave static fallback cards when API fails.
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
            <Line data={trendData} options={trendOptions} />
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

        <div className="alert-box alert-critical">
          <div className="alert-icon"><AlertCircle size={24} color="var(--neon-rose)" /></div>
          <div>
            <div className="alert-title txt-rose">DANGER - Amravati Water Level Dropping Fast!</div>
            Our AI predicts water will reach -71m by May 15. Your village Warud is in HIGH risk zone. Fill all your water tanks now.
            <div className="alert-time mono">Mar 11, 2026 - AI Prediction - 94% sure</div>
          </div>
        </div>

        <div className="alert-box alert-warn">
          <div className="alert-icon"><CloudRain size={24} color="var(--neon-amber)" /></div>
          <div>
            <div className="alert-title txt-amber">Less Rain Expected This Year</div>
            Rainfall is 18% less than normal. Underground water may not refill properly after monsoon.
            <div className="alert-time mono">Mar 9, 2026 - Weather prediction</div>
          </div>
        </div>

        <div className="alert-box alert-info">
          <div className="alert-icon"><Truck size={24} color="var(--neon-cyan)" /></div>
          <div>
            <div className="alert-title txt-cyan">Tanker Schedule Updated for March</div>
            Warud village: Tanker every Monday and Thursday. Check your taluka office for exact timing.
            <div className="alert-time mono">Mar 7, 2026 - District Admin</div>
          </div>
        </div>

        <div className="alert-box alert-success">
          <div className="alert-icon"><CheckCircle size={24} color="var(--neon-green)" /></div>
          <div>
            <div className="alert-title txt-green">Your Complaint #R-1038 Resolved</div>
            Water tanker was dispatched to your village Warud on March 5th.
            <div className="alert-time mono">Mar 5, 2026 - Resolved by Officer Kulkarni</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title"><TrendingDown size={18} className="txt-amber" /> Water Level Over Time</div>
        </div>
        <div className="chart-wrap high">
          <Line data={trendData} options={trendOptions} />
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
