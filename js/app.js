/* ═══════════════════════════════════════════════════════════
   CASPERS TRANSPORT — App Orchestration
═══════════════════════════════════════════════════════════ */

const App = {
  currentTab: 'schedule',
  _refreshTimer: null,

  // ── Boot ──────────────────────────────────────────────────
  async init() {
    const session = CT.getSession();
    if (session) {
      this.startApp(session);
    } else {
      this.showLogin();
    }
  },

  // ── Login screen ──────────────────────────────────────────
  showLogin() {
    document.getElementById('login-screen').style.display = 'flex';
    let pin = '';
    const dots = document.querySelectorAll('.pin-dot');
    const errorEl = document.getElementById('pin-error');

    const updateDots = () => {
      dots.forEach((d, i) => {
        d.style.background = i < pin.length ? '#00d4ff' : 'transparent';
        d.style.borderColor = i < pin.length ? '#00d4ff' : '#333';
      });
    };

    const submitPin = async () => {
      if (pin.length < 4) return;
      errorEl.textContent = 'Checking…';
      try {
        const driver = await CT.api.login(pin);
        CT.saveSession(driver);
        document.getElementById('login-screen').style.display = 'none';
        this.startApp(driver);
      } catch (err) {
        errorEl.textContent = 'INVALID PIN — TRY AGAIN';
        pin = '';
        updateDots();
        setTimeout(() => { errorEl.textContent = ''; }, 2000);
      }
    };

    document.getElementById('pin-pad').addEventListener('click', async (e) => {
      const key = e.target.closest('.pin-key');
      if (!key) return;
      const val = key.dataset.val;
      if (val === 'clear') { pin = ''; }
      else if (val === 'del') { pin = pin.slice(0, -1); }
      else if (pin.length < 6) { pin += val; }
      updateDots();
      if (pin.length === 6) await submitPin();
    });
  },

  // ── Start main app ────────────────────────────────────────
  async startApp(driver) {
    // Show driver name in header
    const brand = document.querySelector('.brand-tagline');
    if (brand) brand.textContent = driver.name || 'Driver';

    // Add logout button to header
    const headerActions = document.querySelector('.header-actions');
    if (headerActions && !document.getElementById('btn-logout')) {
      const btn = document.createElement('button');
      btn.id = 'btn-logout';
      btn.className = 'icon-btn';
      btn.title = 'Log out';
      btn.setAttribute('aria-label', 'Log out');
      btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
        <polyline points="16 17 21 12 16 7"/>
        <line x1="21" y1="12" x2="9" y2="12"/>
      </svg>`;
      btn.addEventListener('click', () => this.logout());
      headerActions.prepend(btn);
    }

    this.registerSW();
    this.initTabs();
    this.bindHeader();

    // Init all modules
    Schedule.init();
    Quote.init();
    Rates.render();
    Setup.init();
    SOS.init();
    TransportDoc.init();
    JobForm.init();

    // Load jobs from DB then render
    await CT.syncJobs();
    Schedule.render();

    // Auto-refresh every 30 seconds
    this._refreshTimer = setInterval(() => CT.refreshSchedule(), 30000);
  },

  // ── Logout ─────────────────────────────────────────────────
  logout() {
    clearInterval(this._refreshTimer);
    CT.clearSession();
    location.reload();
  },

  // ── Service Worker ────────────────────────────────────────
  registerSW() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  },

  // ── Tab switching ─────────────────────────────────────────
  initTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
    });
  },

  switchTab(tab) {
    if (this.currentTab === tab) return;
    this.currentTab = tab;
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
      btn.setAttribute('aria-selected', btn.dataset.tab === tab);
    });
    document.querySelectorAll('.panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === `panel-${tab}`);
    });
    const addBtn = document.getElementById('btn-add-job');
    addBtn.style.display = tab === 'schedule' ? '' : 'none';
    if (tab === 'rates')    Rates.render();
    if (tab === 'schedule') Schedule.render();
  },

  // ── Header ────────────────────────────────────────────────
  bindHeader() {
    document.getElementById('btn-add-job').addEventListener('click', () => {
      JobForm.open();
    });
  },

  // ── Toast notifications ───────────────────────────────────
  toast(message, type = 'info', duration = 2800) {
    const container = document.getElementById('toast-container');
    const el = document.createElement('div');
    el.className = `toast toast--${type}`;
    el.innerHTML = `<div class="toast-dot"></div>${message}`;
    container.appendChild(el);
    setTimeout(() => {
      el.style.transition = 'opacity 0.3s, transform 0.3s';
      el.style.opacity = '0';
      el.style.transform = 'translateY(-6px)';
      setTimeout(() => el.remove(), 300);
    }, duration);
  },

  // ── Modal helpers ──────────────────────────────────────────
  openModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.add('open');
    modal.querySelector('.modal-backdrop')?.addEventListener('click', () => {
      this.closeModal(id);
    }, { once: true });
    document.body.style.overflow = 'hidden';
  },

  closeModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.remove('open');
    document.body.style.overflow = '';
  },

  // ── Toggle group helper ───────────────────────────────────
  bindToggleGroup(containerId, onChange) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.querySelectorAll('.toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        onChange?.(btn.dataset.val);
      });
    });
  },

  getToggleValue(containerId) {
    const active = document.querySelector(`#${containerId} .toggle-btn.active`);
    return active?.dataset.val || null;
  },

  setToggleValue(containerId, val) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.querySelectorAll('.toggle-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.val === val);
    });
  },

  // ── Counter buttons ───────────────────────────────────────
  bindCounters() {
    document.querySelectorAll('.counter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const input = document.getElementById(btn.dataset.target);
        if (!input) return;
        const val = parseInt(input.value || 0);
        const min = parseInt(input.min || 0);
        const max = parseInt(input.max || 999);
        if (btn.dataset.op === 'inc' && val < max) input.value = val + 1;
        if (btn.dataset.op === 'dec' && val > min) input.value = val - 1;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
    });
  },

  fmt(n) {
    return '$' + (Math.round(n * 100) / 100).toFixed(2).replace(/\.00$/, '');
  },

  fmtDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr + 'T00:00:00');
    const today = new Date(); today.setHours(0,0,0,0);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    if (d.getTime() === today.getTime())    return 'Today';
    if (d.getTime() === tomorrow.getTime()) return 'Tomorrow';
    return d.toLocaleDateString('en-AU', { weekday:'short', day:'numeric', month:'short' });
  },

  todayStr() {
    return new Date().toISOString().slice(0, 10);
  },

  tomorrowStr() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }
};

// ── Boot ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => App.init());
