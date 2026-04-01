/* ═══════════════════════════════════════════════════════════
   CASPERS TRANSPORT — Quote Builder
═══════════════════════════════════════════════════════════ */

const Quote = {
  calc: null,

  init() {
    App.bindToggleGroup('q-service', () => this.update());
    App.bindToggleGroup('q-time', () => this.update());

    document.getElementById('q-dist-base').addEventListener('input', () => this.update());
    document.getElementById('q-dist-job').addEventListener('input', () => this.update());
    document.getElementById('q-return').addEventListener('change', () => this.update());

    // Counters — listen for change events bubbled from counter buttons
    ['q-extra-bikes','q-wait','q-nights','q-meals','q-driver-days'].forEach(id => {
      document.getElementById(id).addEventListener('change', () => this.update());
    });

    document.getElementById('q-email-btn').addEventListener('click', () => this.toggleEmailFields());
    document.getElementById('q-send-email-btn').addEventListener('click', () => this.sendEmail());
    document.getElementById('q-save-job-btn').addEventListener('click', () => this.saveAsJob());

    App.bindCounters();
    this.update();
  },

  getInputs() {
    const distBase = parseFloat(document.getElementById('q-dist-base').value) || 0;
    const distJob  = parseFloat(document.getElementById('q-dist-job').value)  || 0;
    const incReturn = document.getElementById('q-return').checked;
    const totalDist = distBase + distJob + (incReturn ? distBase + distJob : 0);

    return {
      distance:      totalDist,
      serviceType:   App.getToggleValue('q-service')  || 'standard',
      timeMultiplier: App.getToggleValue('q-time')    || 'business',
      extraBikes:    parseInt(document.getElementById('q-extra-bikes').value) || 0,
      waitSlots:     parseInt(document.getElementById('q-wait').value)        || 0,
      nights:        parseInt(document.getElementById('q-nights').value)      || 0,
      mealDays:      parseInt(document.getElementById('q-meals').value)       || 0,
      driverDays:    parseInt(document.getElementById('q-driver-days').value) || 0,
      distBase,
      distJob
    };
  },

  update() {
    const inp  = this.getInputs();
    const r    = CT.getRates();
    this.calc  = CT.calculatePrice(inp);

    // Toggle long haul section
    const isLongHaul = inp.distance >= r.longHaul.thresholdKm;
    document.getElementById('q-longhaul-section').style.display = isLongHaul ? '' : 'none';

    // Update breakdown
    document.getElementById('bd-km').textContent       = inp.distance.toFixed(0);
    document.getElementById('bd-callout').textContent  = App.fmt(this.calc.callout);
    document.getElementById('bd-distance').textContent = App.fmt(this.calc.distance);

    const svcLabels = { standard: 'Standard ×1.0', show_bike: `Show Bike ×${r.serviceMultipliers.show_bike}`, emergency: `Emergency ×${r.serviceMultipliers.emergency}` };
    const timLabels = { business: 'Business ×1.0', after_hours: `After Hours ×${r.timeMultipliers.after_hours}`, overnight: `Overnight ×${r.timeMultipliers.overnight}` };
    document.getElementById('bd-service-label').textContent = svcLabels[inp.serviceType] || inp.serviceType;
    document.getElementById('bd-time-label').textContent    = timLabels[inp.timeMultiplier] || inp.timeMultiplier;
    document.getElementById('bd-service').textContent = App.fmt(this.calc.callout + this.calc.distance);
    document.getElementById('bd-time').textContent    = App.fmt(this.calc.adjusted);

    const extrasRow = document.getElementById('bd-extras-row');
    if (this.calc.extras > 0) {
      extrasRow.style.display = '';
      document.getElementById('bd-extras').textContent = App.fmt(this.calc.extras);
    } else {
      extrasRow.style.display = 'none';
    }

    const longHaulRow = document.getElementById('bd-longhaul-row');
    if (this.calc.longHaul > 0) {
      longHaulRow.style.display = '';
      document.getElementById('bd-longhaul').textContent = App.fmt(this.calc.longHaul);
    } else {
      longHaulRow.style.display = 'none';
    }

    document.getElementById('q-total').textContent = App.fmt(this.calc.total);
  },

  toggleEmailFields() {
    const el = document.getElementById('q-email-fields');
    const visible = el.style.display !== 'none';
    el.style.display = visible ? 'none' : '';
    if (!visible) el.querySelector('input')?.focus();
  },

  sendEmail() {
    const inp   = this.getInputs();
    const r     = CT.getRates();
    const setup = CT.getSetup();
    const name  = document.getElementById('q-cust-name').value.trim() || 'Customer';
    const email = document.getElementById('q-cust-email').value.trim();
    const pickup  = document.getElementById('q-pickup-addr').value.trim() || 'TBC';
    const dropoff = document.getElementById('q-dropoff-addr').value.trim() || 'TBC';

    if (!email) { App.toast('Enter customer email', 'error'); return; }

    const svcMap  = { standard: 'Standard', show_bike: 'Show Bike Premium', emergency: 'Emergency' };
    const timeMap = { business: 'Business Hours', after_hours: 'After Hours', overnight: 'Overnight' };
    const isLH    = inp.distance >= r.longHaul.thresholdKm;

    const subject = encodeURIComponent(`Transport Quote – ${setup.businessName || 'Caspers Transport'}`);
    const body = encodeURIComponent(
`Hi ${name},

Thanks for choosing ${setup.businessName || 'Caspers Transport'}. Here is your transport quote:

─────────────────────────────
PICKUP:   ${pickup}
DROPOFF:  ${dropoff}
DISTANCE: ${inp.distance.toFixed(0)} km
─────────────────────────────
SERVICE:  ${svcMap[inp.serviceType] || inp.serviceType}
SCHEDULE: ${timeMap[inp.timeMultiplier] || inp.timeMultiplier}

PRICE BREAKDOWN
  Callout fee:       ${App.fmt(this.calc.callout)}
  Distance charges:  ${App.fmt(this.calc.distance)}
  Subtotal (adj):    ${App.fmt(this.calc.adjusted)}${this.calc.extras > 0 ? `\n  Extras:            ${App.fmt(this.calc.extras)}` : ''}${this.calc.longHaul > 0 ? `\n  Long haul:         ${App.fmt(this.calc.longHaul)}` : ''}

  ─────────────────
  TOTAL QUOTE:       ${App.fmt(this.calc.total)}
─────────────────────────────

This quote is valid for 14 days. Prices include GST.
Payment options: Cash on delivery, Card, or Invoice.

To book, reply to this email or call ${setup.phone || 'us'}.

No Bike Left Behind.
${setup.businessName || 'Caspers Transport'}
${setup.phone || ''}
`);

    window.location.href = `mailto:${encodeURIComponent(email)}?subject=${subject}&body=${body}`;
    App.toast('Email client opened', 'success');
  },

  saveAsJob() {
    if (!this.calc) { App.toast('Calculate a price first', 'error'); return; }
    const inp = this.getInputs();
    App.switchTab('schedule');
    JobForm.open();
    // Pre-fill relevant fields after open
    setTimeout(() => {
      App.setToggleValue('jf-service', inp.serviceType);
      App.setToggleValue('jf-time-of-day', inp.timeMultiplier);
      document.getElementById('jf-distance').value = inp.distance.toFixed(0);
      document.getElementById('jf-price').value    = this.calc.total.toFixed(2);
    }, 50);
  }
};
