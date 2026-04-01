/* ═══════════════════════════════════════════════════════════
   CASPERS TRANSPORT — Storage Layer
   Jobs: Postgres via API  |  Rates/Setup: localStorage
═══════════════════════════════════════════════════════════ */

const CT = {
  RATES_KEY:   'ct_rates',
  SETUP_KEY:   'ct_setup',
  SESSION_KEY: 'ct_driver',
  JOBS_CACHE:  'ct_jobs_cache',

  // ── Default rates ────────────────────────────────────────
  DEFAULT_RATES: {
    callout:   95,
    perKm:     3.50,
    serviceMultipliers: {
      standard:   1.0,
      show_bike:  1.3,
      emergency:  1.75
    },
    timeMultipliers: {
      business:    1.0,
      after_hours: 1.5,
      overnight:   2.0
    },
    longHaul: {
      thresholdKm:   250,
      accommodation: 150,
      meals:          60,
      driverDay:     350
    },
    waitTime:       45,
    additionalBike: 150
  },

  DEFAULT_SETUP: {
    businessName: 'Caspers Transport',
    baseLocation: 'Roseworthy SA',
    phone: '',
    email: ''
  },

  // ── ID generation ─────────────────────────────────────────
  uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  },

  // ══════════════════════════════════════════════════════════
  //  DRIVER SESSION
  // ══════════════════════════════════════════════════════════
  getSession() {
    try {
      return JSON.parse(localStorage.getItem(this.SESSION_KEY) || 'null');
    } catch { return null; }
  },

  saveSession(driver) {
    localStorage.setItem(this.SESSION_KEY, JSON.stringify(driver));
  },

  clearSession() {
    localStorage.removeItem(this.SESSION_KEY);
    localStorage.removeItem(this.JOBS_CACHE);
  },

  // ══════════════════════════════════════════════════════════
  //  API LAYER  (async, calls Vercel serverless functions)
  // ══════════════════════════════════════════════════════════
  api: {
    // Authenticate driver by PIN → returns { driver: { id, name, phone } }
    async login(pin) {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid PIN');
      return data.driver;
    },

    // Fetch jobs assigned to this driver from DB
    async fetchJobs(driverId) {
      const res = await fetch(`/api/jobs?driver_id=${driverId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load jobs');
      return data.jobs || [];
    },

    // Update job status in DB
    async updateJobStatus(jobId, status) {
      const res = await fetch(`/api/jobs?id=${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update job');
      return data.job;
    }
  },

  // ══════════════════════════════════════════════════════════
  //  JOBS  (local cache of DB jobs, keyed by driver session)
  // ══════════════════════════════════════════════════════════

  // Returns cached jobs synchronously (used by schedule.js render)
  getJobs() {
    try {
      return JSON.parse(localStorage.getItem(this.JOBS_CACHE) || '[]');
    } catch { return []; }
  },

  // Fetch from DB → update cache → return jobs array
  // Preserves local transportDoc progress (photos/signatures) on each sync
  async syncJobs() {
    const session = this.getSession();
    if (!session) return [];
    try {
      const dbJobs = await this.api.fetchJobs(session.id);

      // Build a lookup of existing local jobs so we can preserve transportDoc data
      const existing = this.getJobs();
      const localById = {};
      existing.forEach(j => { localById[String(j.id)] = j; });

      const jobs = dbJobs.map(row => {
        const mapped = this._dbRowToJob(row);
        const local  = localById[String(mapped.id)];
        // Preserve any in-progress transport doc (photos, signatures, checklist)
        if (local && local.transportDoc && local.transportDoc.started) {
          mapped.transportDoc = local.transportDoc;
        }
        return mapped;
      });

      localStorage.setItem(this.JOBS_CACHE, JSON.stringify(jobs));
      return jobs;
    } catch (err) {
      console.warn('syncJobs failed, using cache:', err.message);
      return this.getJobs();
    }
  },

  // Sync & re-render the schedule
  async refreshSchedule() {
    await this.syncJobs();
    if (typeof Schedule !== 'undefined') Schedule.render();
  },

  getJob(id) {
    return this.getJobs().find(j => String(j.id) === String(id)) || null;
  },

  // Update a job's status in the DB and immediately patch the local cache
  async updateJobStatusLocal(id, status) {
    // Optimistic local update
    const jobs = this.getJobs();
    const idx = jobs.findIndex(j => String(j.id) === String(id));
    if (idx !== -1) {
      jobs[idx].status = status;
      jobs[idx].updatedAt = new Date().toISOString();
      localStorage.setItem(this.JOBS_CACHE, JSON.stringify(jobs));
    }
    // Persist to DB
    try {
      await this.api.updateJobStatus(id, status);
    } catch (err) {
      console.error('Failed to update job status in DB:', err.message);
      throw err;
    }
    return jobs[idx] || null;
  },

  // Legacy sync wrappers so job-form.js / schedule.js still work
  addJob(jobData) {
    // For locally-created jobs (SOS/manual) — save to cache immediately
    // A full DB write would need a POST /api/jobs endpoint; for now cache locally
    const jobs = this.getJobs();
    const job = {
      id:            this.uid(),
      createdAt:     new Date().toISOString(),
      updatedAt:     new Date().toISOString(),
      status:        'BOOKED',
      scheduledDate: new Date().toISOString().slice(0, 10),
      scheduledTime: '',
      client: { name: '', phone: '', email: '' },
      vehicle: { make: '', model: '', year: '', color: '', rego: '' },
      pickup:  { address: '' },
      dropoff: { address: '' },
      distance:     0,
      serviceType:  'standard',
      timeMultiplier: 'business',
      price:        0,
      payment:      'unpaid',
      driverNotes:  '',
      transportDoc: {
        started:  false,
        phase:    'pickup',
        pickupInvoiceShown: false,
        pickupSignature:    null,
        pickupPhotos:       [],
        pickupClientPresent: false,
        pickupCompletedAt:  null,
        deliveryTime:      '',
        deliveryRecipient: '',
        deliverySignature: null,
        deliveryPhotos:    [],
        deliveryCompletedAt: null
      },
      ...jobData
    };
    jobs.unshift(job);
    localStorage.setItem(this.JOBS_CACHE, JSON.stringify(jobs));
    return job;
  },

  updateJob(id, changes) {
    const jobs = this.getJobs();
    const idx  = jobs.findIndex(j => String(j.id) === String(id));
    if (idx === -1) return null;
    jobs[idx] = { ...jobs[idx], ...changes, updatedAt: new Date().toISOString() };
    localStorage.setItem(this.JOBS_CACHE, JSON.stringify(jobs));
    // If status changed, also push to DB
    if (changes.status) {
      this.api.updateJobStatus(id, changes.status).catch(err =>
        console.warn('DB status sync failed:', err.message)
      );
    }
    return jobs[idx];
  },

  deleteJob(id) {
    const jobs = this.getJobs().filter(j => String(j.id) !== String(id));
    localStorage.setItem(this.JOBS_CACHE, JSON.stringify(jobs));
  },

  // ── Map DB row → PWA job shape ────────────────────────────
  _dbRowToJob(row) {
    return {
      id:            String(row.id),
      createdAt:     row.created_at,
      updatedAt:     row.updated_at || row.created_at,
      status:        (row.status || 'BOOKED').toUpperCase(),
      scheduledDate: row.scheduled_date || (row.created_at || '').slice(0, 10),
      scheduledTime: row.scheduled_time || '',
      client: {
        name:  row.name  || '',
        phone: row.phone || '',
        email: row.email || ''
      },
      vehicle: {
        make:  row.bike_make  || '',
        model: row.bike_model || '',
        year:  '',
        color: '',
        rego:  ''
      },
      pickup:  { address: row.pickup_address  || row.pickup  || '' },
      dropoff: { address: row.dropoff_address || row.dropoff || '' },
      distance:      row.distance      || 0,
      serviceType:   row.service_type  || 'standard',
      timeMultiplier: 'business',
      price:         row.price         || 0,
      payment:       'unpaid',
      driverNotes:   row.notes         || '',
      transportDoc: {
        started:  false,
        phase:    'pickup',
        pickupInvoiceShown: false,
        pickupSignature:    null,
        pickupPhotos:       [],
        pickupClientPresent: false,
        pickupCompletedAt:  null,
        deliveryTime:      '',
        deliveryRecipient: '',
        deliverySignature: null,
        deliveryPhotos:    [],
        deliveryCompletedAt: null
      }
    };
  },

  // ── Rates ─────────────────────────────────────────────────
  getRates() {
    try {
      const stored = JSON.parse(localStorage.getItem(this.RATES_KEY) || 'null');
      return stored ? { ...this.DEFAULT_RATES, ...stored,
        serviceMultipliers: { ...this.DEFAULT_RATES.serviceMultipliers, ...(stored.serviceMultipliers||{}) },
        timeMultipliers:    { ...this.DEFAULT_RATES.timeMultipliers,    ...(stored.timeMultipliers||{}) },
        longHaul:           { ...this.DEFAULT_RATES.longHaul,           ...(stored.longHaul||{}) }
      } : { ...this.DEFAULT_RATES };
    } catch { return { ...this.DEFAULT_RATES }; }
  },

  saveRates(rates) {
    localStorage.setItem(this.RATES_KEY, JSON.stringify(rates));
  },

  // ── Setup ─────────────────────────────────────────────────
  getSetup() {
    try {
      const stored = JSON.parse(localStorage.getItem(this.SETUP_KEY) || 'null');
      return stored ? { ...this.DEFAULT_SETUP, ...stored } : { ...this.DEFAULT_SETUP };
    } catch { return { ...this.DEFAULT_SETUP }; }
  },

  saveSetup(setup) {
    localStorage.setItem(this.SETUP_KEY, JSON.stringify(setup));
  },

  // ── Price calculator ──────────────────────────────────────
  calculatePrice(opts = {}) {
    const r = this.getRates();
    const {
      distance       = 0,
      serviceType    = 'standard',
      timeMultiplier = 'business',
      extraBikes     = 0,
      waitSlots      = 0,
      nights         = 0,
      mealDays       = 0,
      driverDays     = 0
    } = opts;

    const base          = r.callout + (distance * r.perKm);
    const svcMult       = r.serviceMultipliers[serviceType] || 1;
    const timeMult      = r.timeMultipliers[timeMultiplier] || 1;
    const adjusted      = base * svcMult * timeMult;
    const extrasTotal   = (extraBikes * r.additionalBike) + (waitSlots * r.waitTime);
    const longHaulTotal = (nights    * r.longHaul.accommodation)
                        + (mealDays  * r.longHaul.meals)
                        + (driverDays * r.longHaul.driverDay);
    const total = adjusted + extrasTotal + longHaulTotal;

    return {
      callout:  r.callout,
      distance: distance * r.perKm,
      adjusted,
      extras:   extrasTotal,
      longHaul: longHaulTotal,
      total:    Math.round(total * 100) / 100
    };
  }
};
