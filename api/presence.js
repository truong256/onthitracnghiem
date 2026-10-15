import { createHash } from 'node:crypto';

const WINDOW_MS = 90_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// One atomic operation across every serverless instance. Redis owns the clock.
export const HEARTBEAT_SCRIPT = `
local time = redis.call('TIME')
local now = tonumber(time[1]) * 1000 + math.floor(tonumber(time[2]) / 1000)
redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', now - tonumber(ARGV[2]))
redis.call('ZADD', KEYS[1], now, ARGV[1])
redis.call('EXPIRE', KEYS[1], 180)
return redis.call('ZCARD', KEYS[1])
`;

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }
  // Browser requests must originate from this site. No public cross-origin API.
  if (req.headers['sec-fetch-site'] === 'cross-site') {
    return res.status(403).json({ error: 'forbidden' });
  }
  if (req.headers.origin) {
    try {
      const host = req.headers['x-forwarded-host'] || req.headers.host;
      if (new URL(req.headers.origin).host !== host) return res.status(403).json({ error: 'forbidden' });
    } catch {
      return res.status(403).json({ error: 'forbidden' });
    }
  }
  let body;
  try {
    if (typeof req.body === 'string' && req.body.length > 128) throw new Error('body too large');
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!UUID.test(body?.visitorId)) throw new Error('invalid id');
  } catch {
    return res.status(400).json({ error: 'invalid_visitor' });
  }
  // Support both current Upstash and existing Vercel Marketplace variable names.
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) return res.status(503).json({ error: 'presence_unavailable' });

  const environment = process.env.VERCEL_ENV || 'development';
  const preview = environment === 'preview'
    ? ':' + createHash('sha256').update(process.env.VERCEL_URL || 'local').digest('hex').slice(0, 16)
    : '';
  const key = `onthitracnghiem:presence:v1:${environment}${preview}`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(['EVAL', HEARTBEAT_SCRIPT, 1, key, body.visitorId.toLowerCase(), WINDOW_MS]),
      signal: AbortSignal.timeout(5000)
    });
    if (!response.ok) throw new Error('Redis unavailable');
    const { result, error } = await response.json();
    if (error || !Number.isSafeInteger(result) || result < 0) throw new Error('Invalid count');
    return res.status(200).json({ count: result });
  } catch {
    return res.status(503).json({ error: 'presence_unavailable' });
  }
}
