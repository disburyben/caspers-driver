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
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { pin } = req.body;
  if (!pin) return res.status(400).json({ error: 'PIN required' });

  const client = await getPool().connect();
  try {
    const result = await client.query(
      `SELECT id, name, phone FROM drivers WHERE pin = $1 AND active = true LIMIT 1`,
      [String(pin)]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid PIN' });
    }
    return res.status(200).json({ driver: result.rows[0] });
  } catch (err) {
    console.error('Auth error:', err);
    return res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
}
