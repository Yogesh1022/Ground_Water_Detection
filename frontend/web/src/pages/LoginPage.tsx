import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, Droplets, Globe2, Landmark, Lock, LogIn, Shield, User } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { resolveDashboardPathForRole } from "../features/auth/utils/roleRedirect";
import "../styles/login.css";

type Role = "gov" | "admin";

export default function LoginPage() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const glowRef = useRef<HTMLDivElement | null>(null);

  const [role, setRole] = useState<Role>("gov");
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("Invalid credentials. Please try again.");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!glowRef.current) return;
      glowRef.current.style.left = `${event.clientX}px`;
      glowRef.current.style.top = `${event.clientY}px`;
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const context = ctx;

    let width = 0;
    let height = 0;
    let frameId = 0;

    class Particle {
      x = 0;
      y = 0;
      vx = 0;
      vy = 0;
      r = 0;
      a = 0;

      constructor() {
        this.reset();
      }

      reset() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 0.3;
        this.vy = (Math.random() - 0.5) * 0.3;
        this.r = Math.random() * 1.5 + 0.5;
        this.a = Math.random() * 0.3 + 0.1;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;
      }

      draw() {
        context.beginPath();
        context.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        context.fillStyle = `rgba(34,211,238,${this.a})`;
        context.fill();
      }
    }

    const resize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    resize();
    window.addEventListener("resize", resize);

    const particles = Array.from({ length: 50 }, () => new Particle());

    const animate = () => {
      context.clearRect(0, 0, width, height);

      for (const p of particles) {
        p.update();
        p.draw();
      }

      for (let i = 0; i < particles.length; i += 1) {
        for (let j = i + 1; j < particles.length; j += 1) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 120) {
            context.beginPath();
            context.moveTo(particles[i].x, particles[i].y);
            context.lineTo(particles[j].x, particles[j].y);
            context.strokeStyle = `rgba(34,211,238,${0.04 * (1 - d / 120)})`;
            context.stroke();
          }
        }
      }

      frameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setShowError(false);
    setErrorMessage("Invalid credentials. Please try again.");

    const authBaseUrl = (import.meta.env.VITE_AUTH_BASE_URL || "/api/v1/auth").replace(/\/$/, "");

    const rawId = loginId.trim();
    const derivedEmail =
      rawId.includes("@")
        ? rawId.toLowerCase()
        : role === "admin" && rawId.toLowerCase() === "admin"
          ? "admin@aquavidarbha.in"
          : rawId;

    if (!derivedEmail.includes("@")) {
      setErrorMessage("Please enter a registered email ID.");
      window.requestAnimationFrame(() => setShowError(true));
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${authBaseUrl}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: derivedEmail,
          password
        })
      });

      const payload = await response.json().catch(() => ({} as Record<string, unknown>));

      if (!response.ok) {
        const message = typeof payload.error === "string" ? payload.error : "Login failed";
        throw new Error(message);
      }

      const user = (payload.user ?? {}) as {
        id?: number;
        email?: string;
        name?: string;
        role?: string;
      };
      const token = typeof payload.token === "string" ? payload.token : "";

      if (!user.role || user.role !== role) {
        throw new Error(`This account is ${user.role || "unknown"}. Select the correct role tab.`);
      }

      sessionStorage.setItem("aqua_role", user.role);
      sessionStorage.setItem("aqua_user", user.name || user.email || "User");
      sessionStorage.setItem("aqua_user_email", user.email || derivedEmail);
      sessionStorage.setItem("aqua_user_id", String(user.id || ""));
      sessionStorage.setItem("aqua_token", token);

      navigate(resolveDashboardPathForRole(user.role));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Login failed");
      setShowError(false);
      window.requestAnimationFrame(() => setShowError(true));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div id="cursorGlow" ref={glowRef} />
      <canvas id="particles" ref={canvasRef} />

      <Link to="/" className="back-link-login">
        <ArrowLeft size={18} /> Back to Home
      </Link>

      <div className="login-container">
        <div className="login-header">
          <Link to="/" className="login-logo">
            <span className="login-logo-icon">
              <Droplets size={22} color="#06080d" />
            </span>
            Aqua<span className="neon-text">Vidarbha</span>
          </Link>
          <div className="login-subtitle">Authorized Personnel Access</div>
        </div>

        <div className="login-card">
          <div className="role-tabs">
            <button
              type="button"
              className={`role-tab ${role === "gov" ? "active-gov" : ""}`}
              onClick={() => {
                setRole("gov");
                setShowError(false);
              }}
            >
              <Landmark size={16} /> Government Officer
            </button>
            <button
              type="button"
              className={`role-tab ${role === "admin" ? "active-admin" : ""}`}
              onClick={() => {
                setRole("admin");
                setShowError(false);
              }}
            >
              <Shield size={16} /> Administrator
            </button>
          </div>

          <div className={`login-error ${showError ? "show" : ""}`}>{errorMessage}</div>

          <form onSubmit={onSubmit}>
            <div className="form-group">
              <label className="form-label">Email ID</label>
              <div className="form-input-wrap">
                <User size={18} />
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter your registered email"
                  required
                  autoComplete="username"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="form-input-wrap">
                <Lock size={18} />
                <input
                  type="password"
                  className="form-input"
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button type="submit" className={`login-btn ${role === "admin" ? "admin-theme" : ""}`} disabled={isSubmitting}>
              <LogIn size={18} />
              <span>{isSubmitting ? "Signing In..." : role === "gov" ? "Sign In as Officer" : "Sign In as Admin"}</span>
            </button>
          </form>

          <div className="demo-creds">
            <strong>Backend Credentials</strong>
            <div className="demo-grid">
              <div>
                <div className="demo-title demo-gov">GOV OFFICER</div>
                <div>
                  ID: <span className="mono">Use gov user email</span>
                </div>
                <div>
                  Pass: <span className="mono">Created by Admin</span>
                </div>
              </div>
              <div>
                <div className="demo-title demo-admin">ADMIN</div>
                <div>
                  ID: <span className="mono">admin@aquavidarbha.in</span>
                </div>
                <div>
                  Pass: <span className="mono">Admin@12345</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="login-footer">
          <Link to="/dashboard-user">
            <Globe2 size={16} /> Public Dashboard (No Login Required)
          </Link>
        </div>
      </div>
    </div>
  );
}
