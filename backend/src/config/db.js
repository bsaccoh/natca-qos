import pg from 'pg';
import { env } from './env.js';

const isCloudDb = env.db.url.includes('sslmode=') || env.db.url.includes('neon.tech') || process.env.NODE_ENV === 'production';
const pool = new pg.Pool({
  connectionString: env.db.url,
  max: 50,
  ...(isCloudDb ? { ssl: { rejectUnauthorized: false } } : {}),
});

pool.on('error', (err) => console.error('PG pool error', err));

function buildQuery(sql, params = {}) {
  const keys = [];
  const values = [];
  const text = sql.replace(/:([a-zA-Z_]\w*)/g, (_, k) => {
    const idx = keys.indexOf(k);
    if (idx >= 0) return `$${idx + 1}`;
    keys.push(k);
    values.push(params[k] ?? null);
    return `$${keys.length}`;
  });
  return { text, values };
}

export async function query(sql, params = {}) {
  const { text, values } = buildQuery(sql, params);
  const result = await pool.query(text, values);
  return result.rows;
}

export async function queryOne(sql, params = {}) {
  const rows = await query(sql, params);
  return rows[0] ?? null;
}

export async function withTransaction(cb) {
  const client = await pool.connect();
  const q = async (sql, params = {}) => {
    const { text, values } = buildQuery(sql, params);
    const result = await client.query(text, values);
    return result.rows;
  };
  try {
    await client.query('BEGIN');
    const result = await cb({ client, q });
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function waitForDb(attempts = 15, delayMs = 3000) {
  for (let i = 1; i <= attempts; i++) {
    try {
      await pool.query('SELECT 1');
      console.log('✓ Database connected');
      return;
    } catch (err) {
      console.log(`DB not ready (attempt ${i}/${attempts}): ${err.message}`);
      if (i === attempts) throw err;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}
