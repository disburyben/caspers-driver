/* ═══════════════════════════════════════════════════════════
   CASPERS TRANSPORT — Job Create / Edit Modal
═══════════════════════════════════════════════════════════ */

const JobForm = {
  editingId: null,

  init() {
    this.bindForm();

    // Close button
    document.querySelector('#modal-job-form .modal-close').addEventListener('click', () => {
      App.closeModal('modal-job-form');
    });

    // Delete button
    document.getElementById('jf-delete-btn').addEventListener('click', () => {
      if (!this.editingId) return;
      if (confirm('Delete this job?')) {
        CT.deleteJob(this.editingId);
        App.closeModal('modal-job-form');
        Schedule.render();
        App.toast('Job deleted', 'error');
      }
    });

    // Calculate price button
    document.getElementById('jf-calc-price').addEventListener('click', () => {
      this.autoCalcPrice();
    });

    // Toggle groups
    App.bindToggleGroup('jf-service', () => this.autoCalcPrice());
    App.bindToggleGroup('jf-time-of-day', () => this.autoCalcPrice());
    App.bindToggleGroup('jf-status', null);

    // Recalc price on distance change
    document.getElementById('jf-distance').addEventListener('input', () => {
      this.autoCalcPrice();
    });
  },

  open(id = null) {
    this.editingId = id;
    const isNew = !id;

    document.getElementById('job-form-title').textContent = isNew ? 'NEW JOB' : 'EDIT JOB';
    document.getElementById('jf-delete-btn').style.display = isNew ? 'none' : '';
    document.getElementById('jf-save-btn').textContent = isNew ? 'Create Job' : 'Save Changes';

    if (isNew) {
      this.resetForm();
    } else {
      const job = CT.getJob(id);
      if (!job) { App.toast('Job not found', 'error'); return; }
      this.populateForm(job);
    }

    App.openModal('modal-job-form');
  },

  resetForm() {
    document.getElementById('jf-id').value = '';
    document.getElementById('jf-date').value = App.todayStr();
    document.getElementById('jf-time').value = '';
    document.getElementById('jf-client-name').value = '';
    document.getElementById('jf-client-phone').value = '';
    document.getElementById('jf-client-email').value = '';
    document.getElementById('jf-make').value = '';
    document.getElementById('jf-model').value = '';
    document.getElementById('jf-year').value = '';
    document.getElementById('jf-color').value = '';
    document.getElementById('jf-rego').value = '';
    document.getElementById('jf-pickup').value = '';
    document.getElementById('jf-dropoff').value = '';
    document.getElementById('jf-distance').value = '';
    document.getElementById('jf-price').value = '';
    document.getElementById('jf-payment').value = 'unpaid';
    document.getElementById('jf-notes').value = '';
    App.setToggleValue('jf-service', 'standard');
    App.setToggleValue('jf-time-of-day', 'business');
    App.setToggleValue('jf-status', 'BOOKED');
  },

  populateForm(job) {
    document.getElementById('jf-id').value = job.id;
    document.getElementById('jf-date').value = job.scheduledDate || App.todayStr();
    document.getElementById('jf-time').value = job.scheduledTime || '';
    document.getElementById('jf-client-name').value  = job.client?.name  || '';
    document.getElementById('jf-client-phone').value = job.client?.phone || '';
    document.getElementById('jf-client-email').value = job.client?.email || '';
    document.getElementById('jf-make').value   = job.vehicle?.make   || '';
    document.getElementById('jf-model').value  = job.vehicle?.model  || '';
    document.getElementById('jf-year').value   = job.vehicle?.year   || '';
    document.getElementById('jf-color').value  = job.vehicle?.color  || '';
    document.getElementById('jf-rego').value   = job.vehicle?.rego   || '';
    document.getElementById('jf-pickup').value  = job.pickup?.address  || '';
    document.getElementById('jf-dropoff').value = job.dropoff?.address || '';
    document.getElementById('jf-distance').value = job.distance || '';
    document.getElementById('jf-price').value   = job.price    || '';
    document.getElementById('jf-payment').value = job.payment  || 'unpaid';
    document.getElementById('jf-notes').value   = job.driverNotes || '';
    App.setToggleValue('jf-service',     job.serviceType     || 'standard');
    App.setToggleValue('jf-time-of-day', job.timeMultiplier  || 'business');
    App.setToggleValue('jf-status',      job.status          || 'BOOKED');
  },

  collectForm() {
    return {
      scheduledDate: document.getElementById('jf-date').value || App.todayStr(),
      scheduledTime: document.getElementById('jf-time').value,
      status:        App.getToggleValue('jf-status') || 'BOOKED',
      client: {
        name:  document.getElementById('jf-client-name').value.trim(),
        phone: document.getElementById('jf-client-phone').value.trim(),
        email: document.getElementById('jf-client-email').value.trim()
      },
      vehicle: {
        make:  document.getElementById('jf-make').value.trim(),
        model: document.getElementById('jf-model').value.trim(),
        year:  document.getElementById('jf-year').value.trim(),
        color: document.getElementById('jf-color').value.trim(),
        rego:  document.getElementById('jf-rego').value.trim()
      },
      pickup:  { address: document.getElementById('jf-pickup').value.trim() },
      dropoff: { address: document.getElementById('jf-dropoff').value.trim() },
      distance:      parseFloat(document.getElementById('jf-distance').value) || 0,
      serviceType:   App.getToggleValue('jf-service')      || 'standard',
      timeMultiplier: App.getToggleValue('jf-time-of-day') || 'business',
      price:   parseFloat(document.getElementById('jf-price').value) || 0,
      payment: document.getElementById('jf-payment').value,
      driverNotes: document.getElementById('jf-notes').value.trim()
    };
  },

  validate(data) {
    if (!data.client.name) { App.toast('Client name required', 'error'); return false; }
    if (!data.pickup.address)  { App.toast('Pickup address required', 'error'); return false; }
    if (!data.dropoff.address) { App.toast('Dropoff address required', 'error'); return false; }
    return true;
  },

  autoCalcPrice() {
    const distance = parseFloat(document.getElementById('jf-distance').value) || 0;
    const service  = App.getToggleValue('jf-service') || 'standard';
    const time     = App.getToggleValue('jf-time-of-day') || 'business';
    const calc     = CT.calculatePrice({ distance, serviceType: service, timeMultiplier: time });
    document.getElementById('jf-price').value = calc.total.toFixed(2);
  },

  bindForm() {
    document.getElementById('job-form').addEventListener('submit', e => {
      e.preventDefault();
      const data = this.collectForm();
      if (!this.validate(data)) return;

      if (this.editingId) {
        CT.updateJob(this.editingId, data);
        App.toast('Job updated', 'success');
      } else {
        CT.addJob(data);
        App.toast('Job created', 'success');
      }

      App.closeModal('modal-job-form');
      Schedule.render();
    });
  }
};
