/* ═══════════════════════════════════════════════════════════
   CASPERS TRANSPORT — SOS Emergency Callout
═══════════════════════════════════════════════════════════ */

const SOS = {
  init() {
    document.getElementById('sos-create-btn').addEventListener('click', () => this.dispatch());
  },

  dispatch() {
    const name     = document.getElementById('sos-client-name').value.trim();
    const phone    = document.getElementById('sos-client-phone').value.trim();
    const make     = document.getElementById('sos-make').value.trim();
    const model    = document.getElementById('sos-model').value.trim();
    const year     = document.getElementById('sos-year').value.trim();
    const rego     = document.getElementById('sos-rego').value.trim();
    const pickup   = document.getElementById('sos-pickup').value.trim();
    const dropoff  = document.getElementById('sos-dropoff').value.trim();
    const distance = parseFloat(document.getElementById('sos-distance').value) || 0;
    const notes    = document.getElementById('sos-notes').value.trim();

    if (!name)   { App.toast('Client name required', 'error'); return; }
    if (!pickup) { App.toast('Pickup location required', 'error'); return; }

    // Calculate emergency price
    const calc = CT.calculatePrice({
      distance,
      serviceType:    'emergency',
      timeMultiplier: this.getTimeOfDay()
    });

    const job = CT.addJob({
      status:        'ALLOCATED', // auto-allocate SOS jobs
      scheduledDate: App.todayStr(),
      scheduledTime: new Date().toTimeString().slice(0, 5),
      client: { name, phone, email: '' },
      vehicle: { make, model, year, rego, color: '' },
      pickup:  { address: pickup },
      dropoff: { address: dropoff },
      distance,
      serviceType:   'emergency',
      timeMultiplier: this.getTimeOfDay(),
      price:    calc.total,
      payment:  'unpaid',
      driverNotes: notes
    });

    // Reset form
    document.getElementById('sos-form').reset();

    // Switch to schedule and show the job
    App.switchTab('schedule');
    App.toast(`🚨 Emergency job created — ${App.fmt(calc.total)}`, 'success', 4000);

    // Scroll to top after render
    setTimeout(() => {
      document.getElementById('job-list').scrollTop = 0;
    }, 100);
  },

  getTimeOfDay() {
    const h = new Date().getHours();
    if (h >= 7 && h < 18) return 'business';
    if (h >= 22 || h < 6) return 'overnight';
    return 'after_hours';
  }
};
