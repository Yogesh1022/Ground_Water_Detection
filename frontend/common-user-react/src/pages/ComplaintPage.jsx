import { ArrowRight, Check, Circle, Info, MessageSquarePlus, Send } from "lucide-react";
import { useState } from "react";
import { createComplaint } from "../api/commonUserApi";

function ComplaintPage() {
  const [submittedId, setSubmittedId] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    type: "water_shortage",
    district: "Amravati",
    taluka: "",
    village: "",
    severity: "medium",
    description: ""
  });

  const submitComplaint = async () => {
    setError("");
    setSubmittedId("");

    if (form.description.trim().length < 20) {
      setError("Description should be at least 20 characters.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await createComplaint({
        type: form.type,
        district: form.district,
        taluka: form.taluka.trim(),
        village: form.village.trim(),
        severity: form.severity,
        description: form.description.trim()
      });
      setSubmittedId(response?.tracking_number || "Created");
    } catch (e) {
      setError(e.message || "Could not submit complaint.");
    } finally {
      setSubmitting(false);
    }
  };

  const clearForm = () => {
    setForm({
      type: "water_shortage",
      district: "Amravati",
      taluka: "",
      village: "",
      severity: "medium",
      description: ""
    });
    setError("");
    setSubmittedId("");
  };

  return (
    <div className="page-view active">
      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <MessageSquarePlus size={18} className="txt-cyan" /> Report a Water Problem
            </div>
          </div>
          <p className="muted long">Tell us about your water problem. We will send this to district officer and provide a tracking number.</p>

          <div className="form-group">
            <label className="form-label">What is the problem?</label>
            <select
              className="form-select"
              value={form.type}
              onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
            >
              <option value="water_shortage">Well / Borewell Dried Up</option>
              <option value="water_shortage">No Water Tanker Coming</option>
              <option value="infrastructure">Hand Pump Not Working</option>
              <option value="contamination">Water is Dirty / Bad Quality</option>
              <option value="infrastructure">Pipe Broken</option>
              <option value="other">Other Problem</option>
            </select>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">District</label>
              <select
                className="form-select"
                value={form.district}
                onChange={(e) => setForm((prev) => ({ ...prev, district: e.target.value }))}
              >
                <option>Amravati</option>
                <option>Yavatmal</option>
                <option>Akola</option>
                <option>Wardha</option>
                <option>Buldhana</option>
                <option>Washim</option>
                <option>Nagpur</option>
                <option>Chandrapur</option>
                <option>Gadchiroli</option>
                <option>Gondia</option>
                <option>Bhandara</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Taluka / Village</label>
              <input
                className="form-input"
                placeholder="e.g. Warud"
                value={form.taluka}
                onChange={(e) => setForm((prev) => ({ ...prev, taluka: e.target.value }))}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Village</label>
            <input
              className="form-input"
              placeholder="e.g. Morshi"
              value={form.village}
              onChange={(e) => setForm((prev) => ({ ...prev, village: e.target.value }))}
            />
          </div>

          <div className="form-group">
            <label className="form-label">How serious?</label>
            <select
              className="form-select"
              value={form.severity}
              onChange={(e) => setForm((prev) => ({ ...prev, severity: e.target.value }))}
            >
              <option value="low">Small problem - inconvenience</option>
              <option value="medium">Medium - affecting daily life</option>
              <option value="high">Serious - no water to drink</option>
              <option value="critical">Emergency - many families affected</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Tell us more</label>
            <textarea
              className="form-textarea"
              placeholder="How many families are affected? Since how many days? Any other details..."
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            />
          </div>

          <div className="btn-row">
            <button className="btn btn-primary btn-lg" onClick={submitComplaint} disabled={submitting}>
              <Send size={16} /> {submitting ? "Submitting..." : "Submit Complaint"}
            </button>
            <button className="btn btn-ghost" onClick={clearForm}>Clear</button>
          </div>

          {error ? <div className="submission-box" style={{ borderColor: "rgba(251,113,133,.35)", background: "rgba(251,113,133,.08)", color: "#fecdd3" }}>{error}</div> : null}

          {submittedId ? (
            <div className="submission-box">
              Complaint submitted successfully. Tracking Number: <strong>{submittedId}</strong>
            </div>
          ) : null}
        </div>

        <div>
          <div className="card space-btm">
            <div className="card-header">
              <div className="card-title">
                <Info size={18} className="txt-green" /> How It Works
              </div>
            </div>

            <div className="tracker">
              <div className="track-step done">
                <div className="track-dot"><Check size={16} /></div>
                <div><div className="track-title">1. You Submit</div><div className="track-desc">Fill this form and press Submit</div></div>
                <div className="track-line" />
              </div>
              <div className="track-step done">
                <div className="track-dot"><Check size={16} /></div>
                <div><div className="track-title">2. You Get Tracking Number</div><div className="track-desc">Use this number to check status anytime</div></div>
                <div className="track-line" />
              </div>
              <div className="track-step current">
                <div className="track-dot"><ArrowRight size={16} /></div>
                <div><div className="track-title">3. Officer Reviews</div><div className="track-desc">District officer checks within 24 hours</div></div>
                <div className="track-line" />
              </div>
              <div className="track-step pending">
                <div className="track-dot"><Circle size={14} /></div>
                <div><div className="track-title">4. Action Taken</div><div className="track-desc">Team is sent to help / tanker dispatched</div></div>
                <div className="track-line" />
              </div>
              <div className="track-step pending">
                <div className="track-dot"><Circle size={14} /></div>
                <div><div className="track-title">5. Problem Fixed</div><div className="track-desc">You will be notified when resolved</div></div>
              </div>
            </div>
          </div>

          <div className="card center-call">
            <div className="phone">&#128222;</div>
            <div className="help-title">Helpline Number</div>
            <div className="mono help-number">1800-XXX-XXXX</div>
            <div className="muted">Free call - Available 24/7</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ComplaintPage;
