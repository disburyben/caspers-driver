/* ═══════════════════════════════════════════════════════════
   CASPERS TRANSPORT — Setup Tab
═══════════════════════════════════════════════════════════ */

const Setup = {
  init() {
    this.loadValues();

    document.getElementById('s-save-btn').addEventListener('click', () => this.save());
    document.getElementById('s-reset-btn').addEventListener('click', () => {
      if (confirm('Reset all settings to defaults?')) {
        localStorage.removeItem(CT.RATES_KEY);
        localStorage.removeItem(CT.SETUP_KEY);
        this.loadValues();
        App.toast('Settings reset to defaults', 'info');
        Rates.render();
      }
    });
  },

  loadValues() {
    const r = CT.getRates();
    const s = CT.getSetup();

    // Business
    this.set('s-business-name', s.businessName);
    this.set('s-phone',         s.phone);
    this.set('s-email',         s.email);

    // Pricing
    this.set('s-callout',        r.callout);
    this.set('s-per-km',         r.perKm);
    this.set('s-mult-after',     r.timeMultipliers.after_hours);
    this.set('s-mult-overnight', r.timeMultipliers.overnight);
    this.set('s-mult-showbike',  r.serviceMultipliers.show_bike);
    this.set('s-mult-emergency', r.serviceMultipliers.emergency);
    this.set('s-wait',           r.waitTime);
    this.set('s-extra-bike',     r.additionalBike);

    // Long haul
    this.set('s-accommodation', r.longHaul.accommodation);
    this.set('s-meals',         r.longHaul.meals);
    this.set('s-driver-day',    r.longHaul.driverDay);
    this.set('s-longhaul-km',   r.longHaul.thresholdKm);
  },

  set(id, val) {
    const el = document.getElementById(id);
    if (el && val !== undefined && val !== null) el.value = val;
  },

  get(id, fallback = 0) {
    const el = document.getElementById(id);
    if (!el) return fallback;
    const n = parseFloat(el.value);
    return isNaN(n) ? fallback : n;
  },

  getText(id) {
    return document.getElementById(id)?.value?.trim() || '';
  },

  save() {
    const rates = {
      callout: this.get('s-callout', 95),
      perKm:   this.get('s-per-km', 3.5),
      serviceMultipliers: {
        standard:   1.0,
        show_bike:  this.get('s-mult-showbike', 1.3),
        emergency:  this.get('s-mult-emergency', 1.75)
      },
      timeMultipliers: {
        business:    1.0,
        after_hours: this.get('s-mult-after', 1.5),
        overnight:   this.get('s-mult-overnight', 2.0)
      },
      longHaul: {
        thresholdKm:   this.get('s-longhaul-km', 250),
        accommodation: this.get('s-accommodation', 150),
        meals:         this.get('s-meals', 60),
        driverDay:     this.get('s-driver-day', 350)
      },
      waitTime:       this.get('s-wait', 45),
      additionalBike: this.get('s-extra-bike', 150)
    };

    const setup = {
      businessName: this.getText('s-business-name') || 'Caspers Transport',
      baseLocation: 'Roseworthy SA',
      phone:  this.getText('s-phone'),
      email:  this.getText('s-email')
    };

    CT.saveRates(rates);
    CT.saveSetup(setup);
    App.toast('Settings saved', 'success');
    Rates.render();
    Quote.update();
  }
};
