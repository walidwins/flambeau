const rateBuckets = new Map();

function parseList(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function getRequestOrigin(req) {
  const origin = String(req.headers.origin || '').trim();
  if (!origin) return '';

  try {
    return new URL(origin).origin;
  } catch (_) {
    return 'invalid';
  }
}

function getServerOrigin(req) {
  const host = String(req.headers.host || '').trim();
  if (!host) return '';
  const proto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim() || 'https';
  return `${proto}://${host}`;
}

function isAllowedOrigin(req) {
  const origin = getRequestOrigin(req);
  if (!origin) return true;
  if (origin === 'invalid') return false;
  if (origin === getServerOrigin(req)) return true;

  const host = String(req.headers.host || '').trim();
  if (host && origin === `https://${host}`) return true;

  return parseList(process.env.CORS_ALLOWED_ORIGINS || '').includes(origin);
}

function applySecurityHeaders(res, extraHeaders = {}) {
  const headers = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    ...extraHeaders
  };

  Object.keys(headers).forEach((key) => {
    res.setHeader(key, headers[key]);
  });
}

function applyCors(req, res) {
  const origin = getRequestOrigin(req);
  if (!origin || origin === 'invalid' || !isAllowedOrigin(req)) return;

  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-CSRF-Token');
  res.setHeader('Vary', 'Origin');
}

function getClientKey(req, scope) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const ip = forwarded || req.socket?.remoteAddress || 'unknown';
  return `${scope}:${ip}`;
}

function applyRateLimit(req, res, options = {}) {
  const windowMs = options.windowMs || 60_000;
  const limit = options.limit || 60;
  const scope = options.scope || req.url || 'api';
  const now = Date.now();
  const key = getClientKey(req, scope);
  const bucket = rateBuckets.get(key) || { count: 0, resetAt: now + windowMs };

  if (now > bucket.resetAt) {
    bucket.count = 0;
    bucket.resetAt = now + windowMs;
  }

  bucket.count += 1;
  rateBuckets.set(key, bucket);

  if (rateBuckets.size > 5000) {
    for (const [bucketKey, value] of rateBuckets.entries()) {
      if (now > value.resetAt + windowMs) rateBuckets.delete(bucketKey);
    }
  }

  if (bucket.count > limit) {
    res.setHeader('Retry-After', Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)));
    return false;
  }

  return true;
}

function getBodySize(body) {
  if (!body) return 0;
  if (typeof body === 'string') return Buffer.byteLength(body, 'utf8');
  return Buffer.byteLength(JSON.stringify(body), 'utf8');
}

function rejectUnsafeRequest(req, res, options = {}) {
  applySecurityHeaders(res);
  applyCors(req, res);

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return true;
  }

  if (!isAllowedOrigin(req)) {
    res.statusCode = 403;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'Origin not allowed' }));
    return true;
  }

  if (options.methods && !options.methods.includes(req.method)) {
    res.setHeader('Allow', options.methods.join(', '));
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'Methode non autorisee' }));
    return true;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const contentType = String(req.headers['content-type'] || '').toLowerCase();
    if (contentType && !contentType.includes('application/json')) {
      res.statusCode = 415;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: 'Content-Type doit etre application/json' }));
      return true;
    }
  }

  if (options.maxBodyBytes && getBodySize(req.body) > options.maxBodyBytes) {
    res.statusCode = 413;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'Requete trop volumineuse' }));
    return true;
  }

  if (options.rateLimit && !applyRateLimit(req, res, options.rateLimit)) {
    res.statusCode = 429;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'Trop de requetes. Reessayez plus tard.' }));
    return true;
  }

  return false;
}

module.exports = {
  applySecurityHeaders,
  rejectUnsafeRequest
};
