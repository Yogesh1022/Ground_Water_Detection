import { authLogin } from "./api.js";

const authBase = (window.AQUA_AUTH_BASE_URL || localStorage.getItem("aqua_auth_base_url") || "http://localhost:8080/api/v1/auth").replace(/\/$/, "");
const adminBase = (window.AQUA_ADMIN_BASE_URL || localStorage.getItem("aqua_admin_base_url") || "http://localhost:8080/api/v1/admin").replace(/\/$/, "");

const msgBox = document.getElementById("msgBox");
const loginBtn = document.getElementById("loginBtn");
const form = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

document.getElementById("authBase").textContent = authBase;
document.getElementById("adminBase").textContent = adminBase;

function setMessage(text, kind) {
  msgBox.className = `msg ${kind}`;
  msgBox.textContent = text;
}

function clearSession() {
  sessionStorage.removeItem("aqua_role");
  sessionStorage.removeItem("aqua_user");
  sessionStorage.removeItem("aqua_user_email");
  sessionStorage.removeItem("aqua_user_id");
  sessionStorage.removeItem("aqua_token");
}

const existingRole = (sessionStorage.getItem("aqua_role") || "").toLowerCase();
const existingToken = sessionStorage.getItem("aqua_token");
if (existingRole === "admin" && existingToken) {
  window.location.href = "./index.html";
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = emailInput.value.trim().toLowerCase();
  const password = passwordInput.value;
  if (!email || !password) return;

  loginBtn.disabled = true;
  setMessage("Signing in...", "ok");

  try {
    const payload = await authLogin({ email, password });
    const user = payload?.user || {};
    const token = typeof payload?.token === "string" ? payload.token : "";

    if (!token || (user.role || "").toLowerCase() !== "admin") {
      throw new Error("This account is not an admin account.");
    }

    clearSession();
    sessionStorage.setItem("aqua_role", user.role || "admin");
    sessionStorage.setItem("aqua_user", user.name || user.email || "Admin");
    sessionStorage.setItem("aqua_user_email", user.email || email);
    sessionStorage.setItem("aqua_user_id", String(user.id || ""));
    sessionStorage.setItem("aqua_token", token);

    setMessage("Login successful. Redirecting...", "ok");
    window.location.href = "./index.html";
  } catch (error) {
    setMessage(error instanceof Error ? error.message : "Login failed", "err");
    loginBtn.disabled = false;
  }
});

(function initParticles() {
  const canvas = document.getElementById("particles");
  const glow = document.getElementById("cursorGlow");
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const particles = [];
  let width = 0;
  let height = 0;
  let frameId = 0;

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }

  function randomParticle() {
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.24,
      vy: (Math.random() - 0.5) * 0.24,
      r: Math.random() * 1.2 + 0.4,
      a: Math.random() * 0.35 + 0.08
    };
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < particles.length; i += 1) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > width) p.vx *= -1;
      if (p.y < 0 || p.y > height) p.vy *= -1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(34,211,238,${p.a})`;
      ctx.fill();
    }

    frameId = requestAnimationFrame(draw);
  }

  resize();
  for (let i = 0; i < 48; i += 1) particles.push(randomParticle());
  draw();

  window.addEventListener("resize", resize);
  window.addEventListener("mousemove", (event) => {
    glow.style.left = `${event.clientX}px`;
    glow.style.top = `${event.clientY}px`;
  });

  window.addEventListener("beforeunload", () => cancelAnimationFrame(frameId));
})();
