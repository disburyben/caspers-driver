import pg from 'pg';
const { Pool } = pg;

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

let pool;
function getPool() {
  if (!pool) {
    const connectionString =
      process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
    pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false }, max: 1 });
  }
  return pool;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const client = await getPool().connect();
  try {
    // GET /api/jobs?driver_id=X  — jobs assigned to this driver
    if (req.method === 'GET') {
      const { driver_id } = req.query;
      if (!driver_id) return res.status(400).json({ error: 'driver_id required' });
      const result = await client.query(
        `SELECT * FROM service_requests
         WHERE assigned_driver_id = $1
         AND status NOT IN ('completed','cancelled')
         ORDER BY created_at ASC`,
        [driver_id]
      );
      return res.status(200).json({ jobs: result.rows });
    }

    // PATCH /api/jobs?id=X  — update job status + optional photo
    if (req.method === 'PATCH') {
      const { id } = req.query;
      const { status, photo_data, photo_note } = req.body;

      let photoUpdate = '';
      const params = [status, id];

      if (photo_data) {
        // Store photo as base64 in a simple text column
        await client.query(
          `CREATE TABLE IF NOT EXISTS job_photos (
            id SERIAL PRIMARY KEY,
            job_id INTEGER,
            photo_data TEXT,
            note VARCHAR(255),
            taken_at TIMESTAMP DEFAULT NOW()
          )`
        );
        await client.query(
          `INSERT INTO job_photos (job_id, photo_data, note) VALUES ($1, $2, $3)`,
          [id, photo_data, photo_note || '']
        );
      }

      const result = await client.query(
        `UPDATE service_requests SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
        params
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
      return res.status(200).json({ job: result.rows[0] });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Jobs API error:', err);
    return res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
}
