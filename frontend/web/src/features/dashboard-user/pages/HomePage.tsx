import { useEffect, useMemo, useState } from "react";
import { AlertCircle, AlertTriangle, BellRing, Droplets, Map, MapPin, MessageSquarePlus, Search, Waves } from "lucide-react";
import { getAlerts, getDistrictSummary } from "../api/commonUserApi";
import { districtRows as districtRowsMock, latestAlerts as latestAlertsMock } from "../api/dashboardData";

function statusBadge(status) {
  const map = {
    danger: "s-danger",
    warning: "s-warn",
    ok: "s-info",
    safe: "s-safe"
  };
  return map[status] || "s-info";
}

function trendLabel(trend) {
  if (trend === "down") return { text: "Down", arrow: "v", cls: "trend-down" };
  if (trend === "up") return { text: "Up", arrow: "^", cls: "trend-up" };
  if (trend === "stable") return { text: "Stable", arrow: "-", cls: "trend-stable" };
  return { text: "Same", arrow: "-", cls: "trend-flat" };
}

const alertIcons = {
  critical: AlertCircle,
  warn: AlertTriangle,
  info: Droplets
};

const alertToneIconClass = {
  critical: "var(--neon-rose)",
  warn: "var(--neon-amber)",
  info: "var(--neon-cyan)"
};

function HomePage({ onNavigate }) {
  const [districtRows, setDistrictRows] = useState(districtRowsMock);
  const [latestAlerts, setLatestAlerts] = useState(latestAlertsMock);

  useEffect(() => {
    let active = true;

    async function loadHomeData() {
      try {
        const [alertsResp, districtResp] = await Promise.all([
          getAlerts(),
          getDistrictSummary()
        ]);

        if (!active) return;

        const apiAlerts = Array.isArray(alertsResp?.data)
          ? alertsResp.data.slice(0, 3).map((a) => ({
              tone: toAlertTone(a.type),
              title: a.title,
              text: a.message,
              time: new Date(a.created_at).toLocaleString()
            }))
          : [];

        if (apiAlerts.length > 0) {
          setLatestAlerts(apiAlerts);
        }

        const apiDistricts = Array.isArray(districtResp?.data)
          ? districtResp.data.slice(0, 8).map((d) => ({
              district: d.district,
              depth: -Math.abs(Number(d.avg_depth_mbgl || 0)),
              trend: trendFromQoQ(Number(d.depth_change_qoq || 0)),
              status: statusFromRisk(d.risk_status)
            }))
          : [];

        if (apiDistricts.length > 0) {
          setDistrictRows(apiDistricts);
        }
      } catch {
        // Keep mock data as fallback if backend is unavailable.
      }
    }

    loadHomeData();
    return () => {
      active = false;
    };
  }, []);

  const alertCount = useMemo(() => latestAlerts.length, [latestAlerts]);

  return (
    <div className="page-view active">
      <div className="grid-4">
        <div className="stat-card" onClick={() => onNavigate("detect")}>
          <div className="stat-icon stat-icon-cyan">
            <Waves size={24} />
          </div>
          <div className="stat-val txt-cyan">-63m</div>
          <div className="stat-label">Water Level Now</div>
        </div>
        <div className="stat-card" onClick={() => onNavigate("alerts")}>
          <div className="stat-icon stat-icon-rose">
            <AlertTriangle size={24} />
          </div>
          <div className="stat-val txt-rose">{alertCount}</div>
          <div className="stat-label">Active Alerts</div>
        </div>
        <div className="stat-card" onClick={() => onNavigate("complaint")}>
          <div className="stat-icon stat-icon-purple">
            <MessageSquarePlus size={24} />
          </div>
          <div className="stat-val txt-purple">Report</div>
          <div className="stat-label">File Complaint</div>
        </div>
        <div className="stat-card" onClick={() => onNavigate("track")}>
          <div className="stat-icon stat-icon-green">
            <Search size={24} />
          </div>
          <div className="stat-val txt-green">Track</div>
          <div className="stat-label">My Complaints</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="water-meter">
            <div className="meter-ring meter-ring-warn">
              <div className="meter-depth txt-amber">-63.4</div>
              <div className="meter-unit">meters deep</div>
            </div>
            <div className="meter-label">Your Area: Amravati</div>
            <div className="meter-sublabel txt-amber">WARNING ZONE</div>
            <div className="meter-caption">Water is going down. Store water for 30+ days. Government tanker comes weekly.</div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <BellRing size={18} className="txt-rose" /> Latest Alerts
            </div>
          </div>

          {latestAlerts.map((alert) => {
            const Icon = alertIcons[alert.tone];
            return (
              <div key={alert.title} className={`alert-box alert-${alert.tone}`}>
                <div className="alert-icon">
                  <Icon size={22} color={alertToneIconClass[alert.tone]} />
                </div>
                <div>
                  <div className="alert-title" style={{ color: alertToneIconClass[alert.tone] }}>
                    {alert.title}
                  </div>
                  {alert.text}
                  <div className="alert-time mono">{alert.time}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <MapPin size={18} className="txt-cyan" /> Water Level in All Districts
          </div>
          <button className="btn btn-ghost small" onClick={() => onNavigate("map")}>
            <Map size={14} /> See Map
          </button>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>District</th>
              <th>Water Level</th>
              <th>Going Up/Down?</th>
              <th>How Bad?</th>
            </tr>
          </thead>
          <tbody>
            {districtRows.map((row) => {
              const trend = trendLabel(row.trend);
              return (
                <tr key={row.district}>
                  <td>
                    <strong>{row.district}</strong>
                  </td>
                  <td className="mono">{row.depth.toFixed(1)}m</td>
                  <td className={trend.cls}>{trend.arrow} {trend.text}</td>
                  <td>
                    <span className={`status-badge ${statusBadge(row.status)}`}>{row.status.toUpperCase()}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default HomePage;

function toAlertTone(type) {
  const t = String(type || "").toLowerCase();
  if (t.includes("danger") || t.includes("critical")) return "critical";
  if (t.includes("warn")) return "warn";
  return "info";
}

function trendFromQoQ(depthChangeQoq) {
  if (depthChangeQoq > 0) return "down";
  if (depthChangeQoq < 0) return "up";
  return "stable";
}

function statusFromRisk(risk) {
  const s = String(risk || "").toLowerCase();
  if (s.includes("critical") || s.includes("danger")) return "danger";
  if (s.includes("warn")) return "warning";
  if (s.includes("safe")) return "safe";
  return "ok";
}
