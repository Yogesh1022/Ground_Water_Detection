import { ClipboardList, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { trackComplaint } from "../api/commonUserApi";

function TrackPage() {
  const [trackingInput, setTrackingInput] = useState("");
  const [trackingError, setTrackingError] = useState("");
  const [loading, setLoading] = useState(false);
  const [tracked, setTracked] = useState(null);

  const rows = useMemo(() => {
    if (!tracked) return [];

    const status = normalizeStatusClass(tracked.status);
    const trackedRow = {
      id: tracked.tracking_number,
      problem: tracked.type,
      location: [tracked.village, tracked.taluka, tracked.district].filter(Boolean).join(", "),
      date: new Date(tracked.created_at).toLocaleDateString(),
      status: String(tracked.status || "").toUpperCase(),
      note: "Fetched live from backend",
      cls: status
    };

    return [trackedRow];
  }, [tracked]);

  const onSearch = async () => {
    const cleaned = trackingInput.replace(/^#/, "").trim().toUpperCase();
    setTrackingError("");
    if (!cleaned) {
      setTrackingError("Please enter a tracking number.");
      return;
    }

    setLoading(true);
    try {
      const response = await trackComplaint(cleaned);
      setTracked(response);
    } catch (e) {
      setTrackingError(e.message || "Tracking lookup failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-view active">
      <div className="card space-btm">
        <div className="card-header">
          <div className="card-title">
            <Search size={18} className="txt-cyan" /> Find Your Complaint
          </div>
        </div>
        <p className="muted">Enter your complaint number (example: R-1042) to check status</p>
        <div className="search-row">
          <input
            className="form-input search-input"
            placeholder="Enter Complaint Number... (e.g. R-1042)"
            value={trackingInput}
            onChange={(e) => setTrackingInput(e.target.value)}
          />
          <button className="btn btn-primary btn-lg" onClick={onSearch} disabled={loading}>
            <Search size={18} /> {loading ? "Searching..." : "Search"}
          </button>
        </div>
        {trackingError ? <div className="submission-box" style={{ marginTop: "1rem", borderColor: "rgba(251,113,133,.35)", background: "rgba(251,113,133,.08)", color: "#fecdd3" }}>{trackingError}</div> : null}
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">
            <ClipboardList size={18} className="txt-purple" /> Your Complaints
          </div>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Number</th>
              <th>Problem</th>
              <th>Location</th>
              <th>Date</th>
              <th>Status</th>
              <th>What's Happening</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="mono txt-cyan">#{row.id}</td>
                <td>{row.problem}</td>
                <td>{row.location}</td>
                <td className="mono">{row.date}</td>
                <td><span className={`status-badge s-${row.cls}`}>{row.status}</span></td>
                <td>{row.note}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="muted">Search with a tracking number to fetch live complaint status.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default TrackPage;

function normalizeStatusClass(status) {
  const s = String(status || "").toLowerCase();
  if (s.includes("resolved") || s.includes("fixed")) return "resolved";
  if (s.includes("open") || s.includes("review")) return "progress";
  if (s.includes("urgent") || s.includes("critical")) return "danger";
  return "info";
}
