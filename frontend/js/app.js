/* ================================================================
   AquaVidarbha — Dashboard JavaScript
   Charts (Chart.js), Navigation, Theme Toggle, Interactions
   ================================================================ */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide icons
  lucide.createIcons();

  // ============================================================
  // THEME MANAGEMENT
  // ============================================================
  const html = document.documentElement;
  const storedTheme = localStorage.getItem('aq-theme');
  if (storedTheme === 'dark') html.classList.add('dark');

  function toggleTheme() {
    html.classList.toggle('dark');
    localStorage.setItem('aq-theme', html.classList.contains('dark') ? 'dark' : 'light');
    // Re-render charts with updated colors
    renderAllCharts();
  }

  document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);
  document.getElementById('settingsThemeToggle')?.addEventListener('click', toggleTheme);

  // ============================================================
  // SIDEBAR TOGGLE
  // ============================================================
  const sidebar = document.getElementById('sidebar');
  document.getElementById('sidebarToggle')?.addEventListener('click', () => {
    if (window.innerWidth < 768) {
      sidebar.classList.toggle('mobile-open');
    } else {
      sidebar.classList.toggle('sidebar-collapsed');
    }
  });

  // ============================================================
  // PAGE NAVIGATION
  // ============================================================
  const navLinks = document.querySelectorAll('.nav-link');
  const pages = document.querySelectorAll('.page-content');
  const pageTitle = document.getElementById('pageTitle');

  const pageTitles = {
    overview:  'Overview',
    upload:    'Data Upload',
    pipeline:  'Processing Pipeline',
    features:  'Feature Extraction',
    ai:        'AI Module',
    results:   'Results & Insights',
    viz:       'Visualizations',
    logs:      'Logs / Activity',
    settings:  'Settings',
  };

  navLinks.forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const targetPage = link.dataset.page;
      if (!targetPage) return;

      // Update active link
      navLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');

      // Show target page, hide others
      pages.forEach(p => {
        p.classList.add('hidden');
        p.classList.remove('page-content');
      });
      const target = document.getElementById(`page-${targetPage}`);
      if (target) {
        target.classList.remove('hidden');
        // Re-trigger animation
        void target.offsetWidth;
        target.classList.add('page-content');
      }

      // Update title
      if (pageTitle) pageTitle.textContent = pageTitles[targetPage] || 'Dashboard';

      // Close mobile sidebar
      sidebar.classList.remove('mobile-open');

      // Render charts if switching to a page with charts
      setTimeout(renderAllCharts, 50);
    });
  });

  // ============================================================
  // DROP ZONE INTERACTIONS
  // ============================================================
  const dropZone = document.getElementById('dropZone');
  if (dropZone) {
    ['dragenter', 'dragover'].forEach(evt => {
      dropZone.addEventListener(evt, e => { e.preventDefault(); dropZone.classList.add('dragover'); });
    });
    ['dragleave', 'drop'].forEach(evt => {
      dropZone.addEventListener(evt, e => { e.preventDefault(); dropZone.classList.remove('dragover'); });
    });
  }

  // ============================================================
  // CHART HELPERS
  // ============================================================
  const isDark = () => html.classList.contains('dark');
  const gridColor = () => isDark() ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const textColor = () => isDark() ? '#9ca3af' : '#6b7280';

  const chartInstances = {};
  function getOrCreate(id, config) {
    const el = document.getElementById(id);
    if (!el) return null;
    if (chartInstances[id]) { chartInstances[id].destroy(); }
    chartInstances[id] = new Chart(el.getContext('2d'), config);
    return chartInstances[id];
  }

  // ============================================================
  // RENDER ALL CHARTS
  // ============================================================
  function renderAllCharts() {
    renderDepthTrendChart();
    renderRiskDoughnut();
    renderFeatureImportanceChart();
    renderCorrelationChart();
    renderR2ComparisonChart();
    renderTrainingLossChart();
    renderRainfallDepthChart();
    renderActualVsPredChart();
    renderSeasonalChart();
    renderDistrictBarChart();
    renderEnsembleWeightChart();
    renderResidualChart();
  }

  // ---- 1. Depth Trend (Line) ---- 
  function renderDepthTrendChart() {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar'];
    getOrCreate('depthTrendChart', {
      type: 'line',
      data: {
        labels: months,
        datasets: [
          {
            label: 'Actual Depth (m)',
            data: [7.1,7.8,8.4,9.0,9.5,8.2,6.1,4.8,4.2,4.5,5.2,6.1, 7.0,7.6,8.2,8.8,9.3,8.0,5.9,4.5,3.9,4.2,5.0,5.8, 6.8,7.4,8.0],
            borderColor: '#188a57',
            backgroundColor: 'rgba(24,138,87,0.1)',
            fill: true,
            tension: 0.4,
            pointRadius: 2,
            borderWidth: 2,
          },
          {
            label: 'Predicted (Ensemble)',
            data: [7.0,7.7,8.3,8.9,9.4,8.1,6.0,4.7,4.1,4.4,5.1,6.0, 6.9,7.5,8.1,8.7,9.2,7.9,5.8,4.4,3.8,4.1,4.9,5.7, 6.7,7.3,7.9],
            borderColor: '#0ea5e9',
            borderDash: [6, 3],
            tension: 0.4,
            pointRadius: 2,
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: textColor(), font: { size: 11 } } } },
        scales: {
          x: { grid: { color: gridColor() }, ticks: { color: textColor(), font: { size: 10 } } },
          y: { grid: { color: gridColor() }, ticks: { color: textColor(), font: { size: 10 } }, title: { display: true, text: 'Depth (m)', color: textColor(), font: { size: 11 } }, reverse: true },
        },
      },
    });
  }

  // ---- 2. Risk Doughnut ----
  function renderRiskDoughnut() {
    getOrCreate('riskDoughnut', {
      type: 'doughnut',
      data: {
        labels: ['Safe', 'Warning', 'Critical', 'Extreme'],
        datasets: [{
          data: [312, 198, 87, 55],
          backgroundColor: ['#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
          borderWidth: 0,
          hoverOffset: 8,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: { display: false },
        },
      },
    });
  }

  // ---- 3. Feature Importance (Horizontal bar) ----
  function renderFeatureImportanceChart() {
    const features = [
      'depth_lag_1q', 'rainfall_lag_3m', 'depth_lag_2q', 'rolling_6m', 'rolling_3m',
      'temperature', 'rainfall_deficit', 'soil_moisture', 'cumulative_deficit', 'humidity',
      'rainfall', 'elevation', 'month', 'NDVI', 'evapotranspiration',
    ];
    const importance = [0.28, 0.18, 0.12, 0.08, 0.06, 0.05, 0.04, 0.035, 0.03, 0.025, 0.02, 0.018, 0.015, 0.012, 0.01];

    getOrCreate('featureImportanceChart', {
      type: 'bar',
      data: {
        labels: features,
        datasets: [{
          label: 'SHAP Importance',
          data: importance,
          backgroundColor: importance.map((v, i) => {
            const colors = ['#146e47','#188a57','#26a96c','#48c38c','#7cdaae','#b0eacc','#d6f5e3','#eefbf4','#f0fdf4','#f0fdf4','#f5f5f5','#f5f5f5','#f5f5f5','#f5f5f5','#f5f5f5'];
            return colors[i] || '#f5f5f5';
          }),
          borderRadius: 4,
        }],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: gridColor() }, ticks: { color: textColor(), font: { size: 10 } } },
          y: { grid: { display: false }, ticks: { color: textColor(), font: { size: 10 } } },
        },
      },
    });
  }

  // ---- 4. Correlation Chart (grouped bar as proxy) ----
  function renderCorrelationChart() {
    const labels = ['depth_lag_1q', 'rainfall_lag_3m', 'temperature', 'soil_moisture', 'rainfall', 'humidity', 'NDVI'];
    getOrCreate('correlationChart', {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'w/ Depth', data: [0.92, -0.68, 0.42, -0.55, -0.61, -0.35, -0.28], backgroundColor: '#188a57', borderRadius: 4 },
          { label: 'w/ Rainfall', data: [-0.61, 0.94, -0.30, 0.72, 1.0, 0.60, 0.45], backgroundColor: '#0ea5e9', borderRadius: 4 },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: textColor(), font: { size: 11 } } } },
        scales: {
          x: { grid: { color: gridColor() }, ticks: { color: textColor(), font: { size: 10 } } },
          y: { grid: { color: gridColor() }, ticks: { color: textColor(), font: { size: 10 } }, min: -1, max: 1, title: { display: true, text: 'Correlation', color: textColor() } },
        },
      },
    });
  }

  // ---- 5. R² Comparison (Bar) ----
  function renderR2ComparisonChart() {
    getOrCreate('r2ComparisonChart', {
      type: 'bar',
      data: {
        labels: ['Ensemble', 'XGBoost', 'CNN-LSTM', 'LSTM', 'GRU', 'Random Forest', '1D-CNN', 'VAR'],
        datasets: [{
          label: 'R² Score',
          data: [0.92, 0.90, 0.89, 0.88, 0.86, 0.85, 0.84, 0.70],
          backgroundColor: ['#146e47', '#188a57', '#8b5cf6', '#a855f7', '#c084fc', '#26a96c', '#d8b4fe', '#d1d5db'],
          borderRadius: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: textColor(), font: { size: 10 } } },
          y: { grid: { color: gridColor() }, ticks: { color: textColor(), font: { size: 10 } }, min: 0.5, max: 1.0, title: { display: true, text: 'R² Score', color: textColor() } },
        },
      },
    });
  }

  // ---- 6. Training Loss (Line) ----
  function renderTrainingLossChart() {
    const epochs = Array.from({ length: 200 }, (_, i) => i + 1);
    const trainLoss = epochs.map(e => 0.8 * Math.exp(-0.025 * e) + 0.02 + Math.random() * 0.01);
    const valLoss = epochs.map(e => 0.85 * Math.exp(-0.022 * e) + 0.03 + Math.random() * 0.015);

    getOrCreate('trainingLossChart', {
      type: 'line',
      data: {
        labels: epochs.filter((_, i) => i % 10 === 0).map(e => `E${e}`),
        datasets: [
          { label: 'Train Loss', data: trainLoss.filter((_, i) => i % 10 === 0), borderColor: '#188a57', borderWidth: 2, pointRadius: 0, tension: 0.3 },
          { label: 'Val Loss', data: valLoss.filter((_, i) => i % 10 === 0), borderColor: '#ef4444', borderWidth: 2, pointRadius: 0, tension: 0.3, borderDash: [4, 2] },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: textColor(), font: { size: 11 } } } },
        scales: {
          x: { grid: { color: gridColor() }, ticks: { color: textColor(), font: { size: 9 }, maxRotation: 0 } },
          y: { grid: { color: gridColor() }, ticks: { color: textColor(), font: { size: 10 } }, title: { display: true, text: 'Loss (MSE)', color: textColor() } },
        },
      },
    });
  }

  // ---- 7. Rainfall vs Depth (dual axis) ----
  function renderRainfallDepthChart() {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    getOrCreate('rainfallDepthChart', {
      type: 'bar',
      data: {
        labels: months,
        datasets: [
          {
            type: 'bar', label: 'Rainfall (mm)', data: [12, 8, 15, 25, 45, 180, 320, 280, 160, 65, 20, 10],
            backgroundColor: 'rgba(14,165,233,0.5)', borderRadius: 4, yAxisID: 'y1', order: 2,
          },
          {
            type: 'line', label: 'Depth (m)', data: [7.1, 7.8, 8.4, 9.0, 9.5, 8.2, 6.1, 4.8, 4.2, 4.5, 5.2, 6.1],
            borderColor: '#ef4444', borderWidth: 2.5, pointRadius: 4, pointBackgroundColor: '#ef4444',
            tension: 0.4, yAxisID: 'y', order: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: textColor(), font: { size: 11 } } } },
        scales: {
          x: { grid: { color: gridColor() }, ticks: { color: textColor() } },
          y:  { position: 'left', grid: { color: gridColor() }, ticks: { color: '#ef4444', font: { size: 10 } }, title: { display: true, text: 'Depth (m)', color: '#ef4444' }, reverse: true },
          y1: { position: 'right', grid: { display: false }, ticks: { color: '#0ea5e9', font: { size: 10 } }, title: { display: true, text: 'Rainfall (mm)', color: '#0ea5e9' } },
        },
      },
    });
  }

  // ---- 8. Actual vs Predicted (scatter) ----
  function renderActualVsPredChart() {
    const points = Array.from({ length: 100 }, () => {
      const actual = 2 + Math.random() * 12;
      const predicted = actual + (Math.random() - 0.5) * 1.5;
      return { x: actual, y: predicted };
    });
    getOrCreate('actualVsPredChart', {
      type: 'scatter',
      data: {
        datasets: [
          { label: 'Predictions', data: points, backgroundColor: 'rgba(24,138,87,0.5)', pointRadius: 4 },
          { label: 'Perfect Line', data: [{ x: 2, y: 2 }, { x: 14, y: 14 }], type: 'line', borderColor: '#ef4444', borderDash: [6, 3], borderWidth: 2, pointRadius: 0 },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: textColor(), font: { size: 11 } } } },
        scales: {
          x: { grid: { color: gridColor() }, ticks: { color: textColor() }, title: { display: true, text: 'Actual (m)', color: textColor() } },
          y: { grid: { color: gridColor() }, ticks: { color: textColor() }, title: { display: true, text: 'Predicted (m)', color: textColor() } },
        },
      },
    });
  }

  // ---- 9. Seasonal Pattern (Radar) ----
  function renderSeasonalChart() {
    getOrCreate('seasonalChart', {
      type: 'radar',
      data: {
        labels: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
        datasets: [{
          label: 'Avg Depth (m)',
          data: [7.1, 7.8, 8.4, 9.0, 9.5, 8.2, 6.1, 4.8, 4.2, 4.5, 5.2, 6.1],
          borderColor: '#188a57',
          backgroundColor: 'rgba(24,138,87,0.15)',
          pointBackgroundColor: '#188a57',
          borderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: textColor(), font: { size: 11 } } } },
        scales: {
          r: {
            grid: { color: gridColor() },
            ticks: { color: textColor(), font: { size: 9 }, backdropColor: 'transparent' },
            pointLabels: { color: textColor(), font: { size: 10 } },
          },
        },
      },
    });
  }

  // ---- 10. District Bar Chart ----
  function renderDistrictBarChart() {
    const districts = ['Amr','Nag','Yav','Ako','Was','Bul','War','Cha','Gad','Bha','Gon'];
    const depths = [6.8, 5.4, 9.1, 7.6, 8.3, 6.2, 5.9, 7.0, 4.8, 5.1, 5.5];
    getOrCreate('districtBarChart', {
      type: 'bar',
      data: {
        labels: districts,
        datasets: [{
          label: 'Avg Depth (m)',
          data: depths,
          backgroundColor: depths.map(d => d > 8 ? '#ef4444' : d > 6.5 ? '#f59e0b' : '#10b981'),
          borderRadius: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: textColor(), font: { size: 10 } } },
          y: { grid: { color: gridColor() }, ticks: { color: textColor() }, title: { display: true, text: 'Depth (m)', color: textColor() } },
        },
      },
    });
  }

  // ---- 11. Ensemble Weight Pie ----
  function renderEnsembleWeightChart() {
    getOrCreate('ensembleWeightChart', {
      type: 'pie',
      data: {
        labels: ['XGBoost (0.30)', 'LSTM (0.25)', 'CNN-LSTM (0.20)', 'GRU (0.15)', '1D-CNN (0.10)'],
        datasets: [{
          data: [30, 25, 20, 15, 10],
          backgroundColor: ['#188a57', '#0ea5e9', '#8b5cf6', '#f59e0b', '#ef4444'],
          borderWidth: 0,
          hoverOffset: 8,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { color: textColor(), font: { size: 10 }, padding: 12 } } },
      },
    });
  }

  // ---- 12. Residual Distribution (Bar Histogram) ----
  function renderResidualChart() {
    const bins = ['-1.0', '-0.8', '-0.6', '-0.4', '-0.2', '0.0', '0.2', '0.4', '0.6', '0.8', '1.0'];
    const counts = [3, 8, 18, 35, 62, 85, 58, 30, 15, 6, 2];
    getOrCreate('residualChart', {
      type: 'bar',
      data: {
        labels: bins,
        datasets: [{
          label: 'Frequency',
          data: counts,
          backgroundColor: counts.map((_, i) => {
            const mid = Math.floor(bins.length / 2);
            const dist = Math.abs(i - mid);
            return `rgba(24,138,87,${1 - dist * 0.12})`;
          }),
          borderRadius: 4,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: textColor() }, title: { display: true, text: 'Residual (Actual − Predicted, m)', color: textColor() } },
          y: { grid: { color: gridColor() }, ticks: { color: textColor() }, title: { display: true, text: 'Frequency', color: textColor() } },
        },
      },
    });
  }

  // ============================================================
  // INITIAL RENDER
  // ============================================================
  renderAllCharts();
});
