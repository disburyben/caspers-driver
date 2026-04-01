/* ═══════════════════════════════════════════════════════════
   CASPERS TRANSPORT — Rates Reference Card
═══════════════════════════════════════════════════════════ */

const Rates = {
  render() {
    const r   = CT.getRates();
    const el  = document.getElementById('rates-content');
    if (!el) return;

    el.innerHTML = `
      ${this.section('BASE CHARGES', [
        ['Callout / Base fee',   this.c(`$${r.callout}`), true],
        ['Per kilometre',        this.c(`$${r.perKm}/km`), true]
      ])}

      ${this.section('SERVICE TYPE', [
        ['Standard',             this.m('1.0×')],
        ['Show Bike Premium',    this.m(`${r.serviceMultipliers.show_bike}×`)],
        ['Emergency',            this.m(`${r.serviceMultipliers.emergency}×`, true)]
      ])}

      ${this.section('TIME OF DAY', [
        ['Business Hours (Mon–Fri 7am–6pm)', this.m('1.0×')],
        ['After Hours',          this.m(`${r.timeMultipliers.after_hours}×`)],
        ['Overnight (10pm–6am)', this.m(`${r.timeMultipliers.overnight}×`, true)]
      ])}

      ${this.section('EXTRAS', [
        ['Additional bike',      this.c(`$${r.additionalBike}`)],
        ['Wait time (per 30min)',this.c(`$${r.waitTime}`)]
      ])}

      ${this.section(`LONG HAUL (${r.longHaul.thresholdKm}km+)`, [
        ['Accommodation per night', this.c(`$${r.longHaul.accommodation}`)],
        ['Meals per day',           this.c(`$${r.longHaul.meals}`)],
        ['Driver day rate',         this.c(`$${r.longHaul.driverDay}`, true)]
      ])}

      ${this.section('FORMULA', [
        ['Base = Callout + (km × rate)', ''],
        ['Adjusted = Base × Service × Time', ''],
        ['Total = Adjusted + Extras + Long Haul', '']
      ], true)}

      <div class="rates-section" style="text-align:center; padding: 14px; background: var(--brand-glow); border: 1px solid var(--brand-border); border-radius: var(--radius-lg); margin-top: 4px;">
        <div style="font-family: var(--font-display); font-size: 13px; letter-spacing: 0.12em; color: var(--brand);">NO BIKE LEFT BEHIND</div>
        <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px; letter-spacing: 0.06em;">CASPERS TRANSPORT · ROSEWORTHY SA</div>
      </div>
    `;
  },

  section(title, rows, formula = false) {
    const rowsHtml = rows.map(([label, value, highlight]) => `
      <div class="rates-row">
        <span class="rates-row-label ${formula ? 'sub' : ''}">${label}</span>
        ${value ? `<span class="rates-row-value ${highlight ? 'cyan' : formula ? '' : ''}">${value}</span>` : ''}
      </div>
    `).join('');
    return `
      <div class="rates-section">
        <div class="rates-section-title">${title}</div>
        ${rowsHtml}
      </div>`;
  },

  c(val, highlight = false) {
    return `<span class="rates-row-value ${highlight ? 'cyan' : ''}">${val}</span>`.replace('<span', '<span').replace('</span>', '</span>');
  },

  m(val, urgent = false) {
    return `<span class="rates-row-value ${urgent ? 'cyan' : 'small'}">${val}</span>`;
  }
};
