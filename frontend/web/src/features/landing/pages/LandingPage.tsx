import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import * as THREE from 'three';
import { Droplets, Shield, Rocket, Brain, Bell, Map, BarChart3, Sparkles, Database, Zap } from 'lucide-react';
import '../../../styles/landing.css';

export default function LandingPage() {
  const globeContainerRef = useRef<HTMLDivElement | null>(null);
  const [typed, setTyped] = useState('');
  const [wordIndex, setWordIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const words = ['It Strikes', 'Farms Fail', 'Wells Dry', 'Lives Suffer'];

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const currentWord = words[wordIndex];
    const timer = setTimeout(() => {
      if (!isDeleting && charIndex < currentWord.length) {
        setTyped(currentWord.substring(0, charIndex + 1));
        setCharIndex(charIndex + 1);
      } else if (isDeleting && charIndex > 0) {
        setTyped(currentWord.substring(0, charIndex - 1));
        setCharIndex(charIndex - 1);
      } else if (!isDeleting && charIndex === currentWord.length) {
        setTimeout(() => setIsDeleting(true), 2000);
      } else if (isDeleting && charIndex === 0) {
        setIsDeleting(false);
        setWordIndex((wordIndex + 1) % words.length);
      }
    }, isDeleting ? 40 : 80);

    return () => clearTimeout(timer);
  }, [charIndex, isDeleting, wordIndex]);

  useEffect(() => {
    const glow = document.getElementById('cursorGlow');
    if (!glow) {
      return;
    }

    const handlePointerMove = (event: MouseEvent) => {
      glow.style.left = `${event.clientX}px`;
      glow.style.top = `${event.clientY}px`;
    };

    window.addEventListener('mousemove', handlePointerMove);
    return () => window.removeEventListener('mousemove', handlePointerMove);
  }, []);

  useEffect(() => {
    const container = globeContainerRef.current;
    if (!container) {
      return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.z = 2.8;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    const setRendererSize = () => {
      const width = container.clientWidth || 550;
      const height = container.clientHeight || 550;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    setRendererSize();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.className = 'globe-canvas';
    container.prepend(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.95);
    directionalLight.position.set(5, 3, 5);
    scene.add(directionalLight);

    const textureLoader = new THREE.TextureLoader();
    const earthTexture = textureLoader.load('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg');

    const globeGeo = new THREE.SphereGeometry(1, 64, 64);
    const globeMat = new THREE.MeshStandardMaterial({
      map: earthTexture,
      roughness: 0.85,
      metalness: 0,
      emissive: new THREE.Color(0x10243a),
      emissiveIntensity: 0.2,
    });

    const globe = new THREE.Mesh(globeGeo, globeMat);
    globe.rotation.y = -Math.PI / 2;
    scene.add(globe);

    const pointGeo = new THREE.BufferGeometry();
    const pointsArray: number[] = [];
    const coordinates = [
      [20.93, 77.78], [21.15, 79.09], [20.39, 78.13], [20.72, 77.07],
      [20.11, 77.65], [20.73, 76.99], [20.75, 78.6], [19.97, 79.3],
      [20.18, 80.13], [21.17, 79.95], [21.67, 80.2], [20.45, 78.8],
      [20.9, 78.4], [21.3, 77.5], [20.6, 79.5],
    ];

    coordinates.forEach(([lat, lon]) => {
      const phi = (90 - lat) * (Math.PI / 180);
      const theta = (lon + 180) * (Math.PI / 180);
      const radius = 1.02;

      pointsArray.push(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta),
      );
    });

    pointGeo.setAttribute('position', new THREE.Float32BufferAttribute(pointsArray, 3));
    const dataPoints = new THREE.Points(
      pointGeo,
      new THREE.PointsMaterial({
        color: 0xfbbf24,
        size: 0.05,
        sizeAttenuation: true,
      }),
    );
    dataPoints.rotation.y = -Math.PI / 2;
    scene.add(dataPoints);

    let pointerX = 0;
    let pointerY = 0;
    let pointerTargetX = 0;
    let pointerTargetY = 0;
    let autoRotationY = globe.rotation.y;

    const handleGlobalPointerMove = (event: MouseEvent) => {
      const vw = Math.max(window.innerWidth, 1);
      const vh = Math.max(window.innerHeight, 1);
      pointerTargetX = ((event.clientX / vw) - 0.5) * 2;
      pointerTargetY = ((event.clientY / vh) - 0.5) * 2;
    };

    const handleGlobalPointerLeave = () => {
      pointerTargetX = 0;
      pointerTargetY = 0;
    };

    window.addEventListener('mousemove', handleGlobalPointerMove);
    document.addEventListener('mouseleave', handleGlobalPointerLeave);
    window.addEventListener('resize', setRendererSize);

    let animationId = 0;
    const animate = () => {
      autoRotationY += 0.0022;

      pointerX += (pointerTargetX - pointerX) * 0.06;
      pointerY += (pointerTargetY - pointerY) * 0.06;

      const targetRotY = autoRotationY + pointerX * 0.42;
      const targetRotX = -pointerY * 0.26;

      globe.rotation.y += (targetRotY - globe.rotation.y) * 0.07;
      dataPoints.rotation.y += (targetRotY - dataPoints.rotation.y) * 0.07;
      globe.rotation.x += (targetRotX - globe.rotation.x) * 0.07;
      dataPoints.rotation.x += (targetRotX - dataPoints.rotation.x) * 0.07;

      camera.position.x += (pointerX * 0.11 - camera.position.x) * 0.05;
      camera.position.y += (-pointerY * 0.11 - camera.position.y) * 0.05;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('mousemove', handleGlobalPointerMove);
      document.removeEventListener('mouseleave', handleGlobalPointerLeave);
      window.removeEventListener('resize', setRendererSize);

      renderer.dispose();
      globeGeo.dispose();
      globeMat.dispose();
      pointGeo.dispose();

      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className="landing-page">
      <div id="cursorGlow" />

      {/* NAVBAR */}
      <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
        <div className="nav-inner">
          <a href="/" className="logo">
            <span className="logo-icon">
              <Droplets size={20} style={{ color: '#06080d' }} />
            </span>
            Aqua<span className="neon-text">Vidarbha</span>
          </a>
          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#architecture">Architecture</a>
            <a href="#tech">Tech Stack</a>
            <a href="#workflow">Workflow</a>
            <a href="#impact">Impact</a>
            <Link to="/login" className="btn-portal">
              <Shield size={14} /> Officer Portal
            </Link>
            <Link to="/dashboard-user" className="btn-neon">
              Open Dashboard
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero" id="hero">
        <div className="hero-inner">
          <div className="hero-left">
            <div className="hero-badge">
              <span className="pulse" /> AI-Powered Groundwater Sentinel
            </div>
            <h1>
              Predict Water<br />
              <span className="neon-text">Crisis Before</span>
              <br />
              <span className="typewriter">{typed}</span>
            </h1>
            <p>
              Harness 10 ML/DL models, 650+ monitoring wells, and 15 years of satellite data to forecast groundwater
              depletion 90 days in advance across 11 Vidarbha districts.
            </p>
            <div className="hero-buttons">
              <Link to="/dashboard-user" className="btn-neon" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '1rem', padding: '14px 36px' }}>
                <Rocket size={20} /> Launch Public Dashboard
              </Link>
              <Link to="/login" className="btn-portal" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '1rem', padding: '14px 36px' }}>
                <Shield size={20} /> Officer / Admin Login
              </Link>
            </div>
            <div className="hero-stats">
              {[
                { value: '10', label: 'ML/DL Models', color: 'cyan' },
                { value: '650+', label: 'Wells', color: 'purple' },
                { value: '15', label: 'Years Data', color: 'green' },
                { value: '11', label: 'Districts', color: 'amber' },
              ].map((stat, i) => (
                <div key={i} className="stat-item">
                  <div className={`stat-value ${stat.color}`}>{stat.value}</div>
                  <div className="stat-label">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="hero-right">
            <div id="globe-container" ref={globeContainerRef} />
          </div>
        </div>
        <div className="scroll-indicator">
          <div className="scroll-mouse" />
          <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Scroll to explore</span>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features">
        <div className="section-pad">
          <div className="section-center">
            <div className="section-label">⚡ Core Capabilities</div>
            <h2 className="section-title">
              Built for <span className="neon-text">Water Security</span>
            </h2>
            <p className="section-desc">
              From GPS coordinates to actionable insights — a fully autonomous prediction pipeline powered by spatial AI.
            </p>
          </div>
          <div className="bento-grid">
            <div className="bento-card glass cyan span-2">
              <div className="card-icon cyan">
                <Map size={24} />
              </div>
              <h3>GPS-to-Prediction ML Pipeline</h3>
              <p>Input GPS coordinates and date range. Get R² = 0.92 predictions automatically. Zero manual preprocessing.</p>
            </div>
            <div className="bento-card glass purple">
              <div className="card-icon purple">
                <Brain size={24} />
              </div>
              <h3>10-Model Ensemble</h3>
              <p>XGBoost + LSTM + CNN-LSTM + GRU + 1D-CNN — weighted ensemble achieves R² = 0.92.</p>
            </div>
            <div className="bento-card glass green">
              <div className="card-icon green">
                <Bell size={24} />
              </div>
              <h3>60–90 Day Early Warning</h3>
              <p>Predict groundwater depletion 3 months ahead using Vidarbha's hidden monsoon-to-recharge lag pattern.</p>
            </div>
            <div className="bento-card glass amber">
              <div className="card-icon amber">
                <Map size={24} />
              </div>
              <h3>Interactive Crisis Maps</h3>
              <p>650+ wells color-coded by risk level on live maps — Safe 🟢, Warning 🟠, Critical 🔴.</p>
            </div>
            <div className="bento-card glass rose span-2">
              <div className="card-icon rose">
                <Sparkles size={24} />
              </div>
              <h3>Lag Feature Engineering — The Core Innovation</h3>
              <p>Vidarbha's basalt geology creates a hidden 2-3 month delay. Our models capture this.</p>
            </div>
            <div className="bento-card glass blue">
              <div className="card-icon blue">
                <BarChart3 size={24} />
              </div>
              <h3>SHAP Explainability</h3>
              <p>Understand exactly why each prediction was made. Full feature importance with SHAP values.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ARCHITECTURE */}
      <section id="architecture" style={{ background: 'linear-gradient(180deg, var(--bg) 0%, rgba(13,17,23,1) 100%)' }}>
        <div className="section-pad">
          <div className="section-center">
            <div className="section-label">🖥️ System Architecture</div>
            <h2 className="section-title">
              3-Tier <span className="neon-text">Intelligence Pipeline</span>
            </h2>
            <p className="section-desc">Spatial → Prediction → Integration</p>
          </div>
          <div className="arch-flow">
            <div className="arch-tier glass" style={{ borderColor: 'rgba(34,211,238,0.2)' }}>
              <div style={{ color: 'var(--neon-cyan)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Database size={24} />
                <h3 style={{ fontSize: '1.2rem', fontWeight: '700' }}>Data Ingestion</h3>
              </div>
              <ul style={{ listStyle: 'none' }}>
                {['650+ well coords', 'Rainfall data', '15y history', 'Satellite NDVI'].map((item, i) => (
                  <li key={i} style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--neon-cyan)' }} />{item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="arch-connector">
              <svg viewBox="0 0 40 40" fill="none">
                <path d="M10 20H30M25 14L31 20L25 26" stroke="var(--neon-cyan)" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <div className="arch-tier glass" style={{ borderColor: 'rgba(168,85,247,0.2)' }}>
              <div style={{ color: 'var(--neon-purple)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Brain size={24} />
                <h3 style={{ fontSize: '1.2rem', fontWeight: '700' }}>Prediction Engine</h3>
              </div>
              <ul style={{ listStyle: 'none' }}>
                {['Feature eng', '10 models', 'Ensembling', 'R² validation'].map((item, i) => (
                  <li key={i} style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--neon-purple)' }} />{item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="arch-connector">
              <svg viewBox="0 0 40 40" fill="none">
                <path d="M10 20H30M25 14L31 20L25 26" stroke="var(--neon-purple)" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <div className="arch-tier glass" style={{ borderColor: 'rgba(52,211,153,0.2)' }}>
              <div style={{ color: 'var(--neon-green)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Zap size={24} />
                <h3 style={{ fontSize: '1.2rem', fontWeight: '700' }}>Decision Layer</h3>
              </div>
              <ul style={{ listStyle: 'none' }}>
                {['Risk scoring', 'Crisis alerts', 'Impact maps', 'Export API'].map((item, i) => (
                  <li key={i} style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--neon-green)' }} />{item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* WORKFLOW */}
      <section id="workflow" style={{ background: 'linear-gradient(180deg, var(--bg) 0%, rgba(13,17,23,1) 100%)' }}>
        <div className="section-pad">
          <div className="section-center">
            <div className="section-label">🔄 How It Works</div>
            <h2 className="section-title">
              The <span className="neon-text">Prediction Journey</span>
            </h2>
          </div>
          <div className="workflow-steps">
            {[
              { num: '1', title: 'Input Data', desc: 'Enter district & date range' },
              { num: '2', title: 'Process', desc: 'Run 10-model ensemble' },
              { num: '3', title: 'Predict', desc: 'Get 90-day forecast' },
              { num: '4', title: 'Visualize', desc: 'View crisis maps & alerts' },
            ].map((step, i) => (
              <div key={i} className="wf-step">
                <div className="wf-number" style={{ background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-blue))', color: '#06080d' }}>
                  {step.num}
                </div>
                <h4>{step.title}</h4>
                <p>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* IMPACT */}
      <section id="impact">
        <div className="section-pad">
          <div className="section-center">
            <div className="section-label">📊 Key Metrics</div>
            <h2 className="section-title">
              <span className="neon-text">Scale & Accuracy</span>
            </h2>
          </div>
          <div className="impact-grid">
            {[
              { value: '650+', label: 'Wells Monitored', color: '#22d3ee' },
              { value: '90', label: 'Days Prediction', color: '#a855f7' },
              { value: '0.92', label: 'R² Model Accuracy', color: '#34d399' },
            ].map((impact, i) => (
              <div key={i} className="impact-card glass">
                <div className="impact-value" style={{ color: impact.color }}>
                  {impact.value}
                </div>
                <div className="impact-label">{impact.label}</div>
                <div className="impact-bar" style={{ background: impact.color }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <h2>
          Ready to <span className="neon-text">Save Water?</span>
        </h2>
        <p style={{ color: 'var(--text-dim)', maxWidth: '500px', margin: '0 auto 2rem', fontSize: '1.05rem' }}>
          Explore the full AI-powered dashboard with interactive crisis maps, real-time predictions, and model analytics.
        </p>
        <div className="cta-buttons">
          <Link
            to="/dashboard-user"
            className="btn-neon"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '1rem', padding: '14px 36px' }}
          >
            <Rocket size={20} /> Launch Public Dashboard
          </Link>
          <Link
            to="/login"
            className="btn-portal"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '1rem', padding: '14px 36px' }}
          >
            <Shield size={20} /> Officer / Admin Login
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="footer-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700' }}>
            <Droplets size={18} style={{ color: 'var(--neon-cyan)' }} /> AquaVidarbha
          </div>
          <div>AI-Based Groundwater Crisis Predictor — Vidarbha, Maharashtra</div>
          <div>&copy; 2026 AquaVidarbha</div>
        </div>
      </footer>
    </div>
  );
}
