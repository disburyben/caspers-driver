/* ═══════════════════════════════════════════════════════════
   CASPERS TRANSPORT — Schedule Tab
═══════════════════════════════════════════════════════════ */

const Schedule = {
  filter:       'today',
  statusFilter: 'all',
  searchTerm:   '',

  STATUS_ORDER: ['BOOKED', 'ALLOCATED', 'EN_ROUTE', 'LOADED', 'COMPLETED'],
  STATUS_NEXT: {
    BOOKED:    'ALLOCATED',
    ALLOCATED: 'EN_ROUTE',
    EN_ROUTE:  'LOADED',
    LOADED:    'COMPLETED'
  },
  STATUS_LABEL: {
    BOOKED:    'Booked',
    ALLOCATED: 'Allocated',
    EN_ROUTE:  'En Route',
    LOADED:    'Loaded',
    COMPLETED: 'Completed'
  },

  init() {
    this.bindFilters();
    this.bindSearch();
    this.render();
  },

  bindFilters() {
    // Date tabs
    document.querySelectorAll('.date-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.date-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.filter = btn.dataset.filter;
        this.render();
      });
    });

    // Status filters
    document.querySelectorAll('.status-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.status-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.statusFilter = btn.dataset.status;
        this.render();
      });
    });
  },

  bindSearch() {
    const input = document.getElementById('schedule-search');
    let timer;
    input.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        this.searchTerm = input.value.trim().toLowerCase();
        this.render();
      }, 250);
    });
  },

  getFilteredJobs() {
    let jobs = CT.getJobs();

    // Date filter
    if (this.filter === 'today') {
      jobs = jobs.filter(j => j.scheduledDate === App.todayStr());
    } else if (this.filter === 'tomorrow') {
      jobs = jobs.filter(j => j.scheduledDate === App.tomorrowStr());
    }

    // Status filter
    if (this.statusFilter !== 'all') {
      jobs = jobs.filter(j => j.status === this.statusFilter);
    }

    // Search
    if (this.searchTerm) {
      const t = this.searchTerm;
      jobs = jobs.filter(j =>
        j.client?.name?.toLowerCase().includes(t) ||
        j.client?.phone?.includes(t) ||
        j.vehicle?.rego?.toLowerCase().includes(t) ||
        j.vehicle?.make?.toLowerCase().includes(t) ||
        j.vehicle?.model?.toLowerCase().includes(t) ||
        j.pickup?.address?.toLowerCase().includes(t) ||
        j.dropoff?.address?.toLowerCase().includes(t)
      );
    }

    // Sort: active statuses first, then by date, then time
    jobs.sort((a, b) => {
      const ai = this.STATUS_ORDER.indexOf(a.status);
      const bi = this.STATUS_ORDER.indexOf(b.status);
      if (ai !== bi) return ai - bi;
      if (a.scheduledDate !== b.scheduledDate) return a.scheduledDate > b.scheduledDate ? 1 : -1;
      return (a.scheduledTime || '').localeCompare(b.scheduledTime || '');
    });

    return jobs;
  },

  render() {
    const jobs   = this.getFilteredJobs();
    const list   = document.getElementById('job-list');
    const empty  = document.getElementById('empty-state');
    const count  = document.getElementById('job-count-label');

    const total = CT.getJobs().length;
    count.textContent = `${jobs.length} of ${total} job${total !== 1 ? 's' : ''}`;

    if (jobs.length === 0) {
      list.innerHTML = '';
      list.appendChild(empty);
      empty.style.display = '';
      return;
    }

    empty.style.display = 'none';

    list.innerHTML = jobs.map((job, i) => this.renderCard(job, i)).join('');

    // Bind card events
    list.querySelectorAll('.job-card').forEach(card => {
      const id = card.dataset.id;
      card.addEventListener('click', e => {
        // Don't open form if clicking action buttons / links
        if (e.target.closest('.job-action-btn, .job-phone-btn, a')) return;
        JobForm.open(id);
      });
    });

    list.querySelectorAll('[data-advance]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        this.advanceStatus(btn.dataset.advance);
      });
    });

    list.querySelectorAll('[data-transport-doc]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        TransportDoc.open(btn.dataset.transportDoc);
      });
    });
  },

  renderCard(job, idx) {
    const next    = this.STATUS_NEXT[job.status];
    const client  = job.client?.name || 'Unknown Client';
    const phone   = job.client?.phone || '';
    const vParts  = [job.vehicle?.year, job.vehicle?.make, job.vehicle?.model].filter(Boolean);
    const vehicle = vParts.join(' ') || 'Vehicle TBC';
    const rego    = job.vehicle?.rego || '';
    const pickup  = job.pickup?.address  || 'Pickup TBC';
    const dropoff = job.dropoff?.address || 'Dropoff TBC';
    const km      = job.distance ? `${job.distance} km` : null;
    const price   = job.price ? App.fmt(job.price) : '—';
    const svcLabel  = { standard: 'Standard', show_bike: 'Show Bike', emergency: '🚨 Emergency' }[job.serviceType] || '';
    const timeLabel = { business: 'Bus Hrs', after_hours: 'After Hrs', overnight: 'Overnight' }[job.timeMultiplier] || '';
    const dateStr = App.fmtDate(job.scheduledDate);
    const timeStr = job.scheduledTime || '';
    const hasDoc  = job.transportDoc?.started;
    const docDone = job.transportDoc?.deliveryCompletedAt;
    const notes   = job.driverNotes;
    const mapsUrl = encodeURIComponent(pickup);
    const dropUrl = encodeURIComponent(dropoff);
    const delay   = `animation-delay:${idx * 45}ms`;

    const advanceBtn = next
      ? `<button class="job-action-btn job-action-btn--primary" data-advance="${job.id}">→ ${this.STATUS_LABEL[next]}</button>`
      : '';

    const docBtn = job.status !== 'BOOKED'
      ? `<button class="job-action-btn ${hasDoc ? 'job-action-btn--primary' : ''}" data-transport-doc="${job.id}">${docDone ? '✓ Doc Done' : hasDoc ? '▶ Continue Doc' : '📋 Start Doc'}</button>`
      : '';

    const phoneBtn = phone
      ? `<a href="tel:${phone}" class="job-phone-btn" onclick="event.stopPropagation()">
           <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3-8.59A2 2 0 0 1 3.62 1.37h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
           Call
         </a>`
      : '';

    return `
    <div class="job-card" data-id="${job.id}" data-status="${job.status}" style="${delay}">
      <div class="job-card-accent"></div>
      <div class="job-card-inner">
        <div class="job-top-row">
          <div class="job-name-col">
            <div class="job-name">${this.esc(client)}</div>
            <div class="job-vehicle-line">
              <span>${this.esc(vParts.length ? vParts.join(' ') : 'Vehicle TBC')}</span>
              ${rego ? `<span class="job-rego">${this.esc(rego)}</span>` : ''}
            </div>
          </div>
          <div class="job-badge-col">
            <span class="status-badge status-badge--${job.status}">${this.STATUS_LABEL[job.status]}</span>
            <div class="job-price">${price}</div>
          </div>
        </div>

        <div class="job-route">
          <div class="route-dots-col">
            <div class="route-dot-pickup"></div>
            <div class="route-connector"></div>
            <div class="route-dot-dropoff"></div>
          </div>
          <div class="route-addrs-col">
            <a class="route-addr" href="https://maps.google.com/?q=${mapsUrl}" target="_blank" onclick="event.stopPropagation()">${this.esc(pickup)}</a>
            <a class="route-addr" href="https://maps.google.com/?q=${dropUrl}" target="_blank" onclick="event.stopPropagation()">${this.esc(dropoff)}</a>
          </div>
          ${km ? `<div class="route-km-col"><span class="route-km">${km}</span></div>` : ''}
        </div>

        <div class="job-chips">
          ${dateStr ? `<span class="chip">${dateStr}${timeStr ? '&nbsp;' + timeStr : ''}</span>` : ''}
          ${svcLabel ? `<span class="chip">${svcLabel}</span>` : ''}
          ${timeLabel ? `<span class="chip">${timeLabel}</span>` : ''}
          <span class="chip chip--pay-${job.payment}">${job.payment.toUpperCase()}</span>
        </div>
      </div>

      ${notes ? `<div class="job-notes">📝 ${this.esc(notes)}</div>` : ''}

      <div class="job-card-footer">
        <div class="job-action-btns">
          ${advanceBtn}
          ${docBtn}
        </div>
        ${phoneBtn}
      </div>
    </div>`;
  },

  advanceStatus(id) {
    const job  = CT.getJob(id);
    if (!job) return;
    const next = this.STATUS_NEXT[job.status];
    if (!next) return;
    CT.updateJob(id, { status: next });
    this.render();
    App.toast(`Job marked as ${this.STATUS_LABEL[next]}`, 'success');
  },

  esc(str) {
    return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
};
