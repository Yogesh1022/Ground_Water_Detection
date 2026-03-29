import { useEffect, useMemo, useState } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer, ZoomControl } from "react-leaflet";
import { MapPin } from "lucide-react";
import { getWells } from "../api/commonUserApi";
import { wells } from "../api/dashboardData";

function depthStyle(depth) {
  if (depth > 60) return { color: "#fb7185", risk: "DANGER", radius: 10 + (depth - 60) / 3 };
  if (depth > 45) return { color: "#fbbf24", risk: "WARNING", radius: 8 + (depth - 45) / 5 };
  if (depth > 30) return { color: "#22d3ee", risk: "OK", radius: 7 };
  return { color: "#34d399", risk: "SAFE", radius: 6 };
}

function MapPage() {
  const [wellsState, setWellsState] = useState(wells);

  useEffect(() => {
    let active = true;

    async function loadWells() {
      try {
        const response = await getWells({ page: 1, limit: 100 });
        const rows = Array.isArray(response?.data) ? response.data : [];
        if (!active || rows.length === 0) return;

        const mapped = rows.map((w) => ({
          n: w.name,
          lt: Number(w.latitude),
          ln: Number(w.longitude),
          d: Number(w.depth_total_m || 0),
          p: "Apr: N/A\nMay: N/A",
          fam: Number(w.affected_families || 0),
          t: `${w.district}${w.taluka ? `, ${w.taluka}` : ""}`
        }));

        setWellsState(mapped);
      } catch {
        // Keep local map fallback if backend is unavailable.
      }
    }

    loadWells();
    return () => {
      active = false;
    };
  }, []);

  const prepared = useMemo(() => wellsState.map((well) => ({ ...well, s: depthStyle(well.d) })), [wellsState]);

  return (
    <div className="page-view active">
      <div className="card map-card">
        <div className="card-header">
          <div className="card-title">
            <MapPin size={18} className="txt-cyan" /> Live Water Level Map - Vidarbha Region
          </div>
        </div>
        <p className="muted">Click on any circle to see water level details. Bigger circles mean deeper water (more problem).</p>

        <MapContainer center={[20.5, 78.2]} zoom={7.5} zoomControl={false} className="water-map">
          <TileLayer
            attribution="CartoDB"
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />
          <ZoomControl position="topright" />

          {prepared.map((well) => (
            <CircleMarker
              key={well.n}
              center={[well.lt, well.ln]}
              radius={well.s.radius}
              fillColor={well.s.color}
              fillOpacity={0.85}
              color={well.s.color}
              weight={2.5}
              opacity={0.6}
            >
              <Popup>
                <div className="map-popup">
                  <div className="map-popup-title">{well.n}</div>
                  <div className="map-popup-head">
                    <span className="mono map-popup-depth" style={{ color: well.s.color }}>
                      -{well.d}m
                    </span>
                    <span style={{ color: well.s.color }}>{well.s.risk}</span>
                  </div>
                  <div className="map-popup-block">
                    <div className="map-popup-label">NEXT 3 MONTH PREDICTION:</div>
                    <div className="mono">{well.p}</div>
                  </div>
                  <div className="map-popup-block small">
                    <div>
                      <strong>{well.fam.toLocaleString()}</strong> families affected
                    </div>
                    <div>{well.t}</div>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>

        <div className="map-legend">
          <div className="legend-item"><div className="legend-dot lg-safe" /> Safe (less than 30m)</div>
          <div className="legend-item"><div className="legend-dot lg-ok" /> OK (30-45m)</div>
          <div className="legend-item"><div className="legend-dot lg-warn" /> Warning (45-60m)</div>
          <div className="legend-item"><div className="legend-dot lg-danger" /> Danger (more than 60m)</div>
        </div>
      </div>
    </div>
  );
}

export default MapPage;
