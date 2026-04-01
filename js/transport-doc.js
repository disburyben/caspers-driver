/* ═══════════════════════════════════════════════════════════
   CASPERS TRANSPORT — Transport Document Wizard
   8 steps: Invoice → Pickup Sig → Pickup Photos → Client Confirm
           → Delivery Time → Recipient → Delivery Sig → Delivery Photos → Complete
═══════════════════════════════════════════════════════════ */

const TransportDoc = {
  jobId:   null,
  step:    1,
  TOTAL_STEPS: 8,
  sigPad:  null,

  STEPS: [
    { num: 1, title: 'INVOICE',          sub: 'Review charges with client' },
    { num: 2, title: 'CLIENT SIGNATURE', sub: 'Pickup authorisation' },
    { num: 3, title: 'PICKUP PHOTOS',    sub: 'Document bike condition' },
    { num: 4, title: 'CLIENT PRESENT',   sub: 'Confirm handover' },
    { num: 5, title: 'DELIVERY TIME',    sub: 'Record arrival time' },
    { num: 6, title: 'RECIPIENT',        sub: 'Who is collecting?' },
    { num: 7, title: 'DELIVERY SIGNATURE', sub: 'Delivery confirmation' },
    { num: 8, title: 'DELIVERY PHOTOS',  sub: 'Document delivery condition' }
  ],

  init() {
    document.getElementById('td-next-btn').addEventListener('click', () => this.next());
    document.getElementById('td-back-btn').addEventListener('click', () => this.back());
    document.getElementById('td-close-btn').addEventListener('click', () => {
      if (confirm('Save progress and exit?')) {
        this.saveProgress();
        App.closeModal('modal-transport-doc');
        Schedule.render();
      }
    });
  },

  open(jobId) {
    this.jobId = jobId;
    const job  = CT.getJob(jobId);
    if (!job) { App.toast('Job not found', 'error'); return; }

    // Mark doc as started
    if (!job.transportDoc.started) {
      CT.updateJob(jobId, {
        transportDoc: { ...job.transportDoc, started: true }
      });
    }

    // Determine starting step
    const doc = CT.getJob(jobId).transportDoc;
    if (doc.deliveryCompletedAt) {
      this.step = 8; // show last step if complete
    } else if (doc.pickupCompletedAt) {
      this.step = 5; // delivery phase
    } else {
      this.step = 1;
    }

    document.getElementById('td-title').textContent   = 'TRANSPORT DOCUMENT';
    document.getElementById('td-subtitle').textContent = job.client?.name || '';

    App.openModal('modal-transport-doc');
    this.renderStep();
  },

  renderStep() {
    const job    = CT.getJob(this.jobId);
    if (!job) return;
    const doc    = job.transportDoc;
    const info   = this.STEPS[this.step - 1];
    const isLast = this.step === this.TOTAL_STEPS;
    const isFirst = this.step === 1;

    // Update step indicators
    document.querySelectorAll('.td-step').forEach(el => {
      const n = parseInt(el.dataset.step);
      el.classList.toggle('active', n === this.step);
      el.classList.toggle('done', n < this.step);
    });
    document.querySelectorAll('.td-step-line').forEach((el, i) => {
      el.classList.toggle('done', i + 1 < this.step);
    });

    // Step subtitle in modal header
    document.getElementById('td-subtitle').textContent =
      `${info.title} — ${info.sub}`;

    // Buttons
    document.getElementById('td-back-btn').style.display = isFirst ? 'none' : '';
    document.getElementById('td-next-btn').textContent   = isLast ? 'Complete & Send' : 'Next →';
    document.getElementById('td-next-btn').className     = `btn ${isLast ? 'btn-sos' : 'btn-primary'}`;

    // Render body
    const body = document.getElementById('td-body');
    body.scrollTop = 0;

    switch (this.step) {
      case 1: body.innerHTML = this.renderStep1(job); break;
      case 2: body.innerHTML = this.renderStep2(doc); this.initSigPad('sig-pickup'); break;
      case 3: body.innerHTML = this.renderStep3(doc); this.bindPhotoUpload('photo-pickup', 'pickup'); break;
      case 4: body.innerHTML = this.renderStep4(doc); this.bindChecklist(); break;
      case 5: body.innerHTML = this.renderStep5(doc); break;
      case 6: body.innerHTML = this.renderStep6(doc); break;
      case 7: body.innerHTML = this.renderStep7(doc); this.initSigPad('sig-delivery'); break;
      case 8: body.innerHTML = this.renderStep8(doc); this.bindPhotoUpload('photo-delivery', 'delivery'); break;
    }
  },

  // ── Step 1: Invoice ────────────────────────────────────────
  renderStep1(job) {
    const payment = { unpaid: 'Unpaid', cash: 'Cash', paid: 'Card/Paid', invoice: 'Invoice' }[job.payment] || 'Unpaid';
    const svcLabel = { standard: 'Standard', show_bike: 'Show Bike Premium', emergency: 'Emergency' }[job.serviceType] || '';
    const timeLabel = { business: 'Business Hours', after_hours: 'After Hours', overnight: 'Overnight' }[job.timeMultiplier] || '';
    return `
      <div class="td-step-content">
        <h3 class="td-step-title">INVOICE REVIEW</h3>
        <p class="td-step-subtitle">Show this to the client before they sign.</p>
        <div class="td-invoice-card">
          <div style="font-size:12px;font-weight:600;letter-spacing:0.1em;color:var(--text-muted);text-transform:uppercase">Total Charges</div>
          <div class="td-invoice-total">${App.fmt(job.price || 0)}</div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:4px">Payment: <strong style="color:var(--text)">${payment}</strong></div>
        </div>
        <div class="info-row"><span>Client</span><span>${this.esc(job.client?.name || '—')}</span></div>
        <div class="info-row"><span>Vehicle</span><span>${this.esc([job.vehicle?.year, job.vehicle?.make, job.vehicle?.model].filter(Boolean).join(' ') || '—')}</span></div>
        <div class="info-row"><span>Rego</span><span>${this.esc(job.vehicle?.rego || '—')}</span></div>
        <div class="info-row"><span>Pickup</span><span>${this.esc(job.pickup?.address || '—')}</span></div>
        <div class="info-row"><span>Dropoff</span><span>${this.esc(job.dropoff?.address || '—')}</span></div>
        <div class="info-row"><span>Distance</span><span>${job.distance || 0} km</span></div>
        <div class="info-row"><span>Service</span><span>${svcLabel}</span></div>
        <div class="info-row"><span>Time</span><span>${timeLabel}</span></div>
      </div>`;
  },

  // ── Step 2: Pickup signature ───────────────────────────────
  renderStep2(doc) {
    return `
      <div class="td-step-content">
        <h3 class="td-step-title">CLIENT SIGNATURE</h3>
        <p class="td-step-subtitle">Client signs to authorise pickup.</p>
        <div class="sig-wrap" style="margin-bottom:12px">
          ${doc.pickupSignature
            ? `<img src="${doc.pickupSignature}" style="width:100%;border-radius:var(--radius)">`
            : `<canvas id="sig-pickup" class="sig-canvas" height="180"></canvas>
               <div class="sig-placeholder" id="sig-pickup-placeholder">Sign here with finger or stylus</div>
               <button class="sig-clear-btn" onclick="TransportDoc.clearSig('sig-pickup')">Clear</button>`
          }
        </div>
        ${doc.pickupSignature
          ? `<button class="btn btn-outline full-width" onclick="TransportDoc.clearSavedSig('pickup')">Re-sign</button>`
          : ''}
      </div>`;
  },

  // ── Step 3: Pickup photos ──────────────────────────────────
  renderStep3(doc) {
    const photos = doc.pickupPhotos || [];
    return `
      <div class="td-step-content">
        <h3 class="td-step-title">PICKUP PHOTOS</h3>
        <p class="td-step-subtitle">Photograph any existing damage or bike condition.</p>
        <div class="photo-grid" id="photo-pickup-grid">
          ${photos.map((p, i) => `
            <div class="photo-thumb">
              <img src="${p}" alt="Photo ${i+1}">
              <button class="photo-remove" onclick="TransportDoc.removePhoto('pickup', ${i})">×</button>
            </div>`).join('')}
          <label class="photo-add-btn" id="photo-pickup-label">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            ADD PHOTO
            <input type="file" id="photo-pickup" accept="image/*" capture="environment" style="display:none" multiple>
          </label>
        </div>
        <p style="font-size:12px;color:var(--text-muted);text-align:center">Tap camera icon to take photos. Recommended: front, rear, both sides.</p>
      </div>`;
  },

  // ── Step 4: Client present checklist ──────────────────────
  renderStep4(doc) {
    const checks = [
      { id: 'check-invoice', label: 'Invoice reviewed with client', key: 'pickupInvoiceShown' },
      { id: 'check-present', label: 'Client present at pickup',     key: 'pickupClientPresent' },
      { id: 'check-handover', label: 'Bike handed over for transport', key: '_handover' }
    ];
    return `
      <div class="td-step-content">
        <h3 class="td-step-title">PICKUP CONFIRM</h3>
        <p class="td-step-subtitle">Confirm all pickup items before departing.</p>
        ${checks.map(c => `
          <div class="checklist-item ${doc[c.key] ? 'checked' : ''}" data-check="${c.key}">
            <div class="checklist-tick"></div>
            <span class="checklist-text">${c.label}</span>
          </div>`).join('')}
      </div>`;
  },

  // ── Step 5: Delivery time ──────────────────────────────────
  renderStep5(doc) {
    return `
      <div class="td-step-content">
        <h3 class="td-step-title">DELIVERY TIME</h3>
        <p class="td-step-subtitle">Enter arrival time at dropoff.</p>
        <div class="form-section">
          <label class="form-label">ARRIVAL TIME</label>
          <input type="time" id="td-delivery-time" class="form-input" value="${doc.deliveryTime || new Date().toTimeString().slice(0,5)}">
        </div>
        <div class="form-section">
          <label class="form-label">DELIVERY DATE</label>
          <input type="date" id="td-delivery-date" class="form-input" value="${new Date().toISOString().slice(0,10)}">
        </div>
      </div>`;
  },

  // ── Step 6: Recipient ──────────────────────────────────────
  renderStep6(doc) {
    return `
      <div class="td-step-content">
        <h3 class="td-step-title">RECIPIENT</h3>
        <p class="td-step-subtitle">Who is collecting the bike?</p>
        <div class="form-section">
          <label class="form-label">RECIPIENT NAME</label>
          <input type="text" id="td-recipient" class="form-input" placeholder="Full name" value="${this.esc(doc.deliveryRecipient || '')}" autocomplete="off">
        </div>
        <label class="checkbox-label">
          <input type="checkbox" id="td-same-client" class="checkbox-input" ${!doc.deliveryRecipient ? 'checked' : ''}>
          <span class="checkbox-custom"></span>
          Same as client
        </label>
      </div>`;
  },

  // ── Step 7: Delivery signature ─────────────────────────────
  renderStep7(doc) {
    return `
      <div class="td-step-content">
        <h3 class="td-step-title">DELIVERY SIGNATURE</h3>
        <p class="td-step-subtitle">Recipient signs to confirm delivery.</p>
        <div class="sig-wrap" style="margin-bottom:12px">
          ${doc.deliverySignature
            ? `<img src="${doc.deliverySignature}" style="width:100%;border-radius:var(--radius)">`
            : `<canvas id="sig-delivery" class="sig-canvas" height="180"></canvas>
               <div class="sig-placeholder" id="sig-delivery-placeholder">Sign here with finger or stylus</div>
               <button class="sig-clear-btn" onclick="TransportDoc.clearSig('sig-delivery')">Clear</button>`
          }
        </div>
        ${doc.deliverySignature
          ? `<button class="btn btn-outline full-width" onclick="TransportDoc.clearSavedSig('delivery')">Re-sign</button>`
          : ''}
      </div>`;
  },

  // ── Step 8: Delivery photos ────────────────────────────────
  renderStep8(doc) {
    const photos = doc.deliveryPhotos || [];
    const isDone = !!doc.deliveryCompletedAt;
    return `
      <div class="td-step-content">
        <h3 class="td-step-title">${isDone ? 'JOB COMPLETE' : 'DELIVERY PHOTOS'}</h3>
        <p class="td-step-subtitle">${isDone ? 'Transport document completed.' : 'Photograph bike at delivery location.'}</p>
        ${isDone ? `
          <div class="td-complete-card">
            <div class="td-complete-icon">✅</div>
            <div style="font-family:var(--font-display);font-size:20px;letter-spacing:0.05em;color:var(--success);margin-bottom:8px">DELIVERED</div>
            <div style="font-size:13px;color:var(--text-muted)">Completed ${new Date(doc.deliveryCompletedAt).toLocaleString('en-AU')}</div>
          </div>
        ` : ''}
        <div class="photo-grid" id="photo-delivery-grid">
          ${photos.map((p, i) => `
            <div class="photo-thumb">
              <img src="${p}" alt="Delivery photo ${i+1}">
              <button class="photo-remove" onclick="TransportDoc.removePhoto('delivery', ${i})">×</button>
            </div>`).join('')}
          ${!isDone ? `
          <label class="photo-add-btn" id="photo-delivery-label">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            ADD PHOTO
            <input type="file" id="photo-delivery" accept="image/*" capture="environment" style="display:none" multiple>
          </label>` : ''}
        </div>
        ${isDone ? `
          <button class="btn btn-secondary full-width mt-md" onclick="TransportDoc.emailDocument()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,12 2,6"/></svg>
            Email Document to Client
          </button>` : ''}
      </div>`;
  },

  // ── Navigation ─────────────────────────────────────────────
  next() {
    if (!this.validateStep()) return;
    this.saveCurrentStep();

    if (this.step === this.TOTAL_STEPS) {
      this.complete();
      return;
    }

    this.step++;
    this.renderStep();
  },

  back() {
    if (this.step <= 1) return;
    this.step--;
    this.renderStep();
  },

  validateStep() {
    const job = CT.getJob(this.jobId);
    const doc = job?.transportDoc || {};

    if (this.step === 2) {
      // Signature required
      if (!doc.pickupSignature) {
        const canvas = document.getElementById('sig-pickup');
        if (!canvas || this.isSigEmpty(canvas)) {
          App.toast('Client signature required', 'error');
          return false;
        }
      }
    }

    if (this.step === 6) {
      const same = document.getElementById('td-same-client')?.checked;
      if (!same) {
        const name = document.getElementById('td-recipient')?.value?.trim();
        if (!name) { App.toast('Recipient name required', 'error'); return false; }
      }
    }

    if (this.step === 7) {
      if (!doc.deliverySignature) {
        const canvas = document.getElementById('sig-delivery');
        if (!canvas || this.isSigEmpty(canvas)) {
          App.toast('Delivery signature required', 'error');
          return false;
        }
      }
    }

    return true;
  },

  saveCurrentStep() {
    const job  = CT.getJob(this.jobId);
    if (!job) return;
    const doc  = { ...job.transportDoc };

    if (this.step === 2) {
      const canvas = document.getElementById('sig-pickup');
      if (canvas && !this.isSigEmpty(canvas)) {
        doc.pickupSignature = canvas.toDataURL('image/png');
      }
    }

    if (this.step === 4) {
      doc.pickupClientPresent  = !!document.querySelector('[data-check="pickupClientPresent"]')?.classList.contains('checked');
      doc.pickupInvoiceShown   = !!document.querySelector('[data-check="pickupInvoiceShown"]')?.classList.contains('checked');
      doc.pickupCompletedAt    = new Date().toISOString();
    }

    if (this.step === 5) {
      const t = document.getElementById('td-delivery-time')?.value;
      const d = document.getElementById('td-delivery-date')?.value;
      doc.deliveryTime = d && t ? `${d}T${t}` : t || '';
    }

    if (this.step === 6) {
      const same = document.getElementById('td-same-client')?.checked;
      if (same) {
        doc.deliveryRecipient = job.client?.name || '';
      } else {
        doc.deliveryRecipient = document.getElementById('td-recipient')?.value?.trim() || '';
      }
    }

    if (this.step === 7) {
      const canvas = document.getElementById('sig-delivery');
      if (canvas && !this.isSigEmpty(canvas)) {
        doc.deliverySignature = canvas.toDataURL('image/png');
      }
    }

    CT.updateJob(this.jobId, { transportDoc: doc });
  },

  saveProgress() {
    this.saveCurrentStep();
  },

  complete() {
    this.saveCurrentStep();
    const job = CT.getJob(this.jobId);
    const doc = { ...job.transportDoc, deliveryCompletedAt: new Date().toISOString() };
    CT.updateJob(this.jobId, {
      status:       'COMPLETED',
      transportDoc: doc
    });
    this.renderStep(); // Re-render step 8 as done
    document.getElementById('td-next-btn').style.display = 'none';
    App.toast('🎉 Job completed!', 'success', 4000);
  },

  // ── Signature pad ──────────────────────────────────────────
  initSigPad(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    // Scale for retina
    const rect  = canvas.getBoundingClientRect();
    const dpr   = window.devicePixelRatio || 1;
    canvas.width  = (rect.width  || 320) * dpr;
    canvas.height = 180 * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth   = 2.5;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';

    let drawing = false;
    let lastX = 0, lastY = 0;
    const placeholder = document.getElementById(`${canvasId}-placeholder`);

    const getPos = (e) => {
      const r = canvas.getBoundingClientRect();
      if (e.touches) {
        return {
          x: (e.touches[0].clientX - r.left),
          y: (e.touches[0].clientY - r.top)
        };
      }
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };

    const start = (e) => {
      e.preventDefault();
      drawing = true;
      const p = getPos(e);
      lastX = p.x; lastY = p.y;
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      if (placeholder) placeholder.style.opacity = '0';
    };

    const move = (e) => {
      e.preventDefault();
      if (!drawing) return;
      const p = getPos(e);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      lastX = p.x; lastY = p.y;
    };

    const end = () => { drawing = false; };

    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mousemove', move);
    canvas.addEventListener('mouseup', end);
    canvas.addEventListener('touchstart', start, { passive: false });
    canvas.addEventListener('touchmove', move,  { passive: false });
    canvas.addEventListener('touchend', end);
  },

  clearSig(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const ph = document.getElementById(`${canvasId}-placeholder`);
    if (ph) ph.style.opacity = '1';
  },

  clearSavedSig(phase) {
    const job = CT.getJob(this.jobId);
    if (!job) return;
    const doc = { ...job.transportDoc };
    if (phase === 'pickup') doc.pickupSignature = null;
    if (phase === 'delivery') doc.deliverySignature = null;
    CT.updateJob(this.jobId, { transportDoc: doc });
    this.renderStep();
  },

  isSigEmpty(canvas) {
    const ctx  = canvas.getContext('2d');
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > 10) return false;
    }
    return true;
  },

  // ── Photo upload ───────────────────────────────────────────
  bindPhotoUpload(inputId, phase) {
    const input = document.getElementById(inputId);
    if (!input) return;
    input.addEventListener('change', async () => {
      const files = Array.from(input.files);
      if (!files.length) return;

      for (const file of files) {
        const dataUrl = await this.fileToDataUrl(file, 800);
        const job     = CT.getJob(this.jobId);
        if (!job) continue;
        const doc     = { ...job.transportDoc };
        const key     = phase === 'pickup' ? 'pickupPhotos' : 'deliveryPhotos';
        doc[key]      = [...(doc[key] || []), dataUrl];
        CT.updateJob(this.jobId, { transportDoc: doc });
      }

      // Re-render photo grid only
      this.renderStep();
      App.toast(`${files.length} photo${files.length > 1 ? 's' : ''} added`, 'success');
    });
  },

  removePhoto(phase, index) {
    const job = CT.getJob(this.jobId);
    if (!job) return;
    const doc = { ...job.transportDoc };
    const key = phase === 'pickup' ? 'pickupPhotos' : 'deliveryPhotos';
    doc[key]  = (doc[key] || []).filter((_, i) => i !== index);
    CT.updateJob(this.jobId, { transportDoc: doc });
    this.renderStep();
  },

  fileToDataUrl(file, maxSize = 800) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let w = img.width, h = img.height;
          if (w > h && w > maxSize) { h = h * maxSize / w; w = maxSize; }
          if (h > w && h > maxSize) { w = w * maxSize / h; h = maxSize; }
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.75));
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  },

  // ── Checklist binding ──────────────────────────────────────
  bindChecklist() {
    document.querySelectorAll('.checklist-item').forEach(item => {
      item.addEventListener('click', () => item.classList.toggle('checked'));
    });
  },

  // ── Email complete document ────────────────────────────────
  emailDocument() {
    const job  = CT.getJob(this.jobId);
    if (!job) return;
    const doc  = job.transportDoc;
    const email = job.client?.email;
    const setup = CT.getSetup();

    const subject = encodeURIComponent(`Transport Document & Invoice – ${setup.businessName || 'Caspers Transport'}`);
    const body = encodeURIComponent(
`Hi ${job.client?.name || 'Customer'},

Your transport has been completed. Here is your transport document summary:

─────────────────────────────
CASPERS TRANSPORT
No Bike Left Behind
Roseworthy SA
${setup.phone || ''}
─────────────────────────────

JOB SUMMARY
  Vehicle:   ${[job.vehicle?.year, job.vehicle?.make, job.vehicle?.model].filter(Boolean).join(' ') || '—'}
  Rego:      ${job.vehicle?.rego || '—'}
  Pickup:    ${job.pickup?.address || '—'}
  Dropoff:   ${job.dropoff?.address || '—'}

CHARGES
  Total:     ${App.fmt(job.price || 0)}
  Payment:   ${job.payment || 'Unpaid'}

DELIVERY
  Recipient: ${doc.deliveryRecipient || '—'}
  Time:      ${doc.deliveryTime ? new Date(doc.deliveryTime).toLocaleString('en-AU') : '—'}
  Completed: ${doc.deliveryCompletedAt ? new Date(doc.deliveryCompletedAt).toLocaleString('en-AU') : '—'}

Thank you for choosing ${setup.businessName || 'Caspers Transport'}.

─────────────────────────────
Note: Signatures and photos are stored on file.
`);

    const to = email || '';
    window.location.href = `mailto:${encodeURIComponent(to)}?subject=${subject}&body=${body}`;
    App.toast('Email client opened', 'success');
  },

  esc(str) {
    return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }
};
