const crypto = require('crypto');
const fs = require('fs/promises');
const http = require('http');
const os = require('os');
const path = require('path');
const { URL } = require('url');

const ROOT_DIR = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
const IS_VERCEL = Boolean(process.env.VERCEL);
const ORDERS_FILE = IS_VERCEL ? path.join(os.tmpdir(), 'flambeau-orders.json') : path.join(DATA_DIR, 'orders.json');
const ENV_FILE = path.join(ROOT_DIR, '.env');

loadEnvFile();

const config = {
  port: parsePort(process.env.PORT || 3000),
  nodeEnv: process.env.NODE_ENV || 'development',
  adminPassword: process.env.ADMIN_PASSWORD || 'change-this-password',
  sessionSecret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
  googleAppsScriptUrl: process.env.GOOGLE_APPS_SCRIPT_URL || '',
  googleSheetId: process.env.GOOGLE_SHEET_ID || '',
  googleOrdersSheetName: process.env.GOOGLE_ORDERS_SHEET_NAME || 'Commandes',
  googleClientEmail: process.env.GOOGLE_CLIENT_EMAIL || '',
  googlePrivateKey: normalizePrivateKey(process.env.GOOGLE_PRIVATE_KEY || ''),
  corsAllowedOrigins: parseList(process.env.CORS_ALLOWED_ORIGINS || ''),
  trustProxy: String(process.env.TRUST_PROXY || '').toLowerCase() === 'true'
};

const sessions = new Map();
const rateBuckets = new Map();
const ONE_HOUR = 60 * 60 * 1000;

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.ico': 'image/x-icon'
};

function loadEnvFile() {
  try {
    const raw = require('fs').readFileSync(ENV_FILE, 'utf8');
    raw.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const index = trimmed.indexOf('=');
      if (index === -1) return;
      const key = trimmed.slice(0, index).trim();
      const value = trimmed.slice(index + 1).trim();
      if (key && process.env[key] == null) {
        process.env[key] = value.replace(/^["']|["']$/g, '');
      }
    });
  } catch (_) {}
}

function normalizePrivateKey(value) {
  return String(value || '').replace(/\\n/g, '\n');
}

function parsePort(value) {
  const port = Number(value);
  if (Number.isInteger(port) && port > 0 && port <= 65535) return port;
  throw new Error('PORT must be a valid TCP port between 1 and 65535');
}

function parseList(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function isWeakSecret(value) {
  const secret = String(value || '').trim();
  return !secret
    || secret === 'change-this-password'
    || secret.startsWith('change-me')
    || secret.length < 24;
}

function validateRuntimeConfig() {
  if (config.nodeEnv !== 'production') return;

  const errors = [];
  if (isWeakSecret(config.adminPassword)) {
    errors.push('ADMIN_PASSWORD must be a strong production password');
  }
  if (isWeakSecret(config.sessionSecret)) {
    errors.push('SESSION_SECRET must be at least 24 random characters');
  }
  if (config.corsAllowedOrigins.length === 0) {
    errors.push('CORS_ALLOWED_ORIGINS must include your public production URL');
  }
  if (IS_VERCEL && !config.googleAppsScriptUrl) {
    errors.push('GOOGLE_APPS_SCRIPT_URL is required on Vercel because local files are ephemeral');
  }

  if (errors.length > 0) {
    throw new Error(`Invalid production configuration:\n- ${errors.join('\n- ')}`);
  }
}

function securityHeaders(extra = {}) {
  const headers = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https:",
      "media-src 'self'",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; '),
    ...extra
  };

  if (config.nodeEnv === 'production') {
    headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
  }

  return headers;
}

function sendJson(res, status, payload, headers = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(status, securityHeaders({
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    ...headers
  }));
  res.end(body);
}

function sendError(res, status, message) {
  sendJson(res, status, { error: message });
}

async function parseJsonBody(req, maxBytes = 1024 * 1024) {
  const contentType = String(req.headers['content-type'] || '').toLowerCase();
  if (req.method !== 'GET' && contentType && !contentType.includes('application/json')) {
    throw Object.assign(new Error('Content-Type must be application/json'), { statusCode: 415 });
  }

  let size = 0;
  const chunks = [];

  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) {
      throw Object.assign(new Error('Payload too large'), { statusCode: 413 });
    }
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch (_) {
    throw Object.assign(new Error('Invalid JSON'), { statusCode: 400 });
  }
}

async function readJson(file, fallback) {
  try {
    const raw = await fs.readFile(file, 'utf8');
    return JSON.parse(raw.replace(/^\uFEFF/, ''));
  } catch (error) {
    if (error.code === 'ENOENT') return fallback;
    throw error;
  }
}

async function readJsonArray(file) {
  const value = await readJson(file, []);
  if (Array.isArray(value)) return value;
  if (value && Array.isArray(value.value)) return value.value;
  if (value && typeof value === 'object') return [value];
  return [];
}

async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tempFile = `${file}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tempFile, JSON.stringify(value, null, 2), 'utf8');
  await fs.rename(tempFile, file);
}

function cleanText(value, max = 500) {
  return String(value || '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function cleanSheetCell(value) {
  const text = cleanText(value, 5000);
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

function cleanNumber(value, min, max) {
  let number = Number(value);
  if (!Number.isFinite(number)) number = min;
  if (number < min) number = min;
  if (number > max) number = max;
  return number;
}

function cleanImage(value) {
  const image = cleanText(value, 300);
  if (/^imgs\/[-a-zA-Z0-9_./]+$/.test(image)) return image;
  if (/^https:\/\/[^\s"'<>]+$/i.test(image)) return image;
  return 'imgs/aery-good-vibes-premium-scented-candle-packaging.jpg';
}

function cleanCategory(value) {
  const category = cleanText(value, 40).toLowerCase();
  const allowed = ['fondants', 'bougies', 'bakhour', 'diffuseurs', 'poudre-parfumee'];
  return allowed.includes(category) ? category : 'bougies';
}

function validateProduct(input) {
  const labels = {
    fondants: 'Fondants',
    bougies: 'Bougies',
    bakhour: 'Bakhour',
    diffuseurs: 'Diffuseurs',
    'poudre-parfumee': 'Poudre parfumée'
  };
  const category = cleanCategory(input.category);
  const name = cleanText(input.name, 120);

  if (!name) throw Object.assign(new Error('Product name is required'), { statusCode: 400 });

  return {
    id: cleanText(input.id, 80) || `P${Date.now()}`,
    name,
    category,
    categoryLabel: labels[category],
    price: cleanNumber(input.price, 0, 100000),
    description: cleanText(input.description, 1200),
    notes: Array.isArray(input.notes)
      ? input.notes.map((note) => cleanText(note, 80)).filter(Boolean).slice(0, 12)
      : cleanText(input.notes, 300).split(',').map((note) => cleanText(note, 80)).filter(Boolean).slice(0, 12),
    fragrances: Array.isArray(input.fragrances)
      ? input.fragrances.map((item) => cleanText(item, 120)).filter(Boolean).slice(0, 40)
      : cleanText(input.fragrances, 1000).split(',').map((item) => cleanText(item, 120)).filter(Boolean).slice(0, 40),
    weight: cleanText(input.weight, 80),
    stock: cleanNumber(input.stock, 0, 100000),
    image: cleanImage(input.image),
    inStock: input.inStock === false ? false : true
  };
}

function validateOrder(input) {
  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw Object.assign(new Error('Order is empty'), { statusCode: 400 });
  }

  const items = input.items.slice(0, 50).map((item) => ({
    productId: cleanText(item.productId, 80),
    name: cleanText(item.name, 120) || 'Produit',
    fragrance: cleanText(item.fragrance || item.parfum, 120),
    price: cleanNumber(item.price, 0, 100000),
    qty: cleanNumber(item.qty || item.quantity, 1, 1000)
  }));

  return {
    id: `ORD-${Date.now().toString(36).toUpperCase()}`,
    orderNum: cleanText(input.orderNum, 80) || `FLB-${Date.now().toString(36).toUpperCase()}`,
    date: new Date().toISOString(),
    customer: {
      firstName: cleanText(input.prenom || input.firstName, 120),
      lastName: cleanText(input.nom || input.lastName, 120),
      phone: cleanText(input.telephone || input.phone, 40),
      city: cleanText(input.ville || input.city, 120),
      postalCode: cleanText(input.codePostal || input.postalCode, 40),
      address: cleanText(input.adresse || input.address, 250)
    },
    items,
    total: cleanNumber(input.total, 0, 1000000),
    status: 'new'
  };
}

function validateContact(input) {
  const prenom = cleanText(input.prenom || input.firstName, 50);
  const nom = cleanText(input.nom || input.lastName, 50);
  const email = cleanText(input.email, 120).toLowerCase();
  const telephone = cleanText(input.telephone || input.phone, 40);
  const sujet = cleanText(input.sujet || input.subject, 100);
  const message = cleanText(input.message, 2000);

  if (!prenom || prenom.length < 2) {
    throw Object.assign(new Error('Prenom is required'), { statusCode: 400 });
  }

  if (!nom || nom.length < 2) {
    throw Object.assign(new Error('Nom is required'), { statusCode: 400 });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw Object.assign(new Error('Valid email is required'), { statusCode: 400 });
  }

  if (!sujet || sujet.length < 5) {
    throw Object.assign(new Error('Sujet is required'), { statusCode: 400 });
  }

  if (!message || message.length < 20) {
    throw Object.assign(new Error('Message is required'), { statusCode: 400 });
  }

  return {
    id: `MSG-${Date.now().toString(36).toUpperCase()}`,
    date: new Date().toISOString(),
    prenom,
    nom,
    email,
    telephone,
    sujet,
    message,
    status: 'new'
  };
}

function sign(value) {
  return crypto.createHmac('sha256', config.sessionSecret).update(value).digest('base64url');
}

function parseCookies(req) {
  return String(req.headers.cookie || '').split(';').reduce((cookies, item) => {
    const index = item.indexOf('=');
    if (index === -1) return cookies;
    cookies[item.slice(0, index).trim()] = decodeURIComponent(item.slice(index + 1).trim());
    return cookies;
  }, {});
}

function createSession(res) {
  const id = crypto.randomBytes(24).toString('base64url');
  const csrfToken = crypto.randomBytes(24).toString('base64url');
  sessions.set(id, { csrfToken, createdAt: Date.now() });
  const cookie = `${id}.${sign(id)}`;
  const secure = config.nodeEnv === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `flambeau_admin=${encodeURIComponent(cookie)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=7200${secure}`);
  return { csrfToken };
}

function getSession(req) {
  const cookie = parseCookies(req).flambeau_admin;
  if (!cookie) return null;
  const [id, signature] = cookie.split('.');
  if (!id || signature !== sign(id)) return null;
  const session = sessions.get(id);
  if (!session) return null;
  if (Date.now() - session.createdAt > 2 * 60 * 60 * 1000) {
    sessions.delete(id);
    return null;
  }
  return { id, ...session };
}

function requireAdmin(req, res) {
  const session = getSession(req);
  if (!session) {
    sendError(res, 401, 'Admin authentication required');
    return null;
  }

  if (req.method !== 'GET' && req.headers['x-csrf-token'] !== session.csrfToken) {
    sendError(res, 403, 'Invalid CSRF token');
    return null;
  }

  return session;
}

function applyRateLimit(req, res) {
  const forwardedFor = config.trustProxy ? String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() : '';
  const ip = forwardedFor || req.socket.remoteAddress || 'unknown';
  const key = `${ip}:${req.url.split('?')[0]}`;
  const now = Date.now();
  const bucket = rateBuckets.get(key) || { count: 0, resetAt: now + 60_000 };

  if (now > bucket.resetAt) {
    bucket.count = 0;
    bucket.resetAt = now + 60_000;
  }

  bucket.count += 1;
  rateBuckets.set(key, bucket);

  let limit = 120;
  if (req.url.startsWith('/api/admin/login')) limit = 8;
  else if (req.url.startsWith('/api/admin')) limit = 30;
  else if (req.method === 'POST' && req.url.startsWith('/api/contact')) limit = 10;
  else if (req.method === 'POST' && req.url.startsWith('/api/orders')) limit = 20;

  if (bucket.count > limit) {
    res.setHeader('Retry-After', Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)));
    sendError(res, 429, 'Too many requests');
    return false;
  }

  return true;
}

function cleanupRateBuckets() {
  const now = Date.now();
  for (const [key, bucket] of rateBuckets.entries()) {
    if (now > bucket.resetAt + 60_000) rateBuckets.delete(key);
  }
}

function cleanupSessions() {
  const now = Date.now();
  for (const [id, session] of sessions.entries()) {
    if (now - session.createdAt > 2 * ONE_HOUR) sessions.delete(id);
  }
}

function getRequestOrigin(req) {
  const origin = String(req.headers.origin || '').trim();
  if (!origin) return '';

  try {
    const parsed = new URL(origin);
    return parsed.origin;
  } catch (_) {
    return 'invalid';
  }
}

function getServerOrigin(req) {
  const proto = config.trustProxy && req.headers['x-forwarded-proto']
    ? String(req.headers['x-forwarded-proto']).split(',')[0].trim()
    : 'http';
  const host = String(req.headers.host || '').trim();
  return host ? `${proto}://${host}` : '';
}

function isAllowedOrigin(req) {
  const origin = getRequestOrigin(req);
  if (!origin) return true;
  if (origin === 'invalid') return false;
  if (origin === getServerOrigin(req)) return true;
  return config.corsAllowedOrigins.includes(origin);
}

function applyCors(req, res) {
  const origin = getRequestOrigin(req);
  if (!origin || origin === 'invalid' || !isAllowedOrigin(req)) return;

  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-CSRF-Token');
  res.setHeader('Vary', 'Origin');
}

function rejectBadRequest(req, res) {
  if (!['GET', 'POST', 'OPTIONS', 'HEAD'].includes(req.method)) {
    sendError(res, 405, 'Method not allowed');
    return true;
  }

  if (!isAllowedOrigin(req)) {
    sendError(res, 403, 'Origin not allowed');
    return true;
  }

  return false;
}

function base64UrlJson(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

async function getGoogleAccessToken() {
  if (!config.googleClientEmail || !config.googlePrivateKey) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: config.googleClientEmail,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };
  const unsignedJwt = `${base64UrlJson(header)}.${base64UrlJson(claim)}`;
  const signature = crypto
    .createSign('RSA-SHA256')
    .update(unsignedJwt)
    .sign(config.googlePrivateKey, 'base64url');
  const jwt = `${unsignedJwt}.${signature}`;

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error_description || data.error || 'Google auth failed');
  }

  return data.access_token;
}

function orderToSheetRow(order) {
  const items = order.items
    .map((item) => {
      const lineTotal = Number(item.price || 0) * Number(item.qty || 0);
      return `${item.name}${item.fragrance ? ' - Parfum : ' + item.fragrance : ''} x${item.qty} | Prix : ${item.price} DH | Total : ${lineTotal} DH`;
    })
    .join('\n');
  const fragrances = order.items
    .map((item) => (item.fragrance ? `${item.name} : ${item.fragrance}` : ''))
    .filter(Boolean)
    .join('\n');

  return [
    cleanSheetCell(order.orderNum),
    cleanSheetCell(order.date),
    cleanSheetCell(order.customer.firstName),
    cleanSheetCell(order.customer.lastName),
    cleanSheetCell(order.customer.phone),
    cleanSheetCell(order.customer.city),
    cleanSheetCell(order.customer.postalCode),
    cleanSheetCell(order.customer.address),
    cleanSheetCell(items),
    cleanSheetCell(fragrances),
    order.total,
    cleanSheetCell(order.status)
  ];
}

function sheetHeaders() {
  return [
    'Numero commande',
    'Date',
    'Prenom',
    'Nom',
    'Telephone',
    'Ville',
    'Code postal',
    'Adresse',
    'Articles detailles',
    'Parfums',
    'Total',
    'Statut'
  ];
}

async function googleSheetsRequest(pathname, options = {}) {
  const accessToken = await getGoogleAccessToken();
  if (!accessToken) {
    return { skipped: true, reason: 'Google service account not configured' };
  }

  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${config.googleSheetId}${pathname}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new Error(data.error && data.error.message ? data.error.message : 'Google Sheets request failed');
  }

  return data;
}

async function ensureOrdersSheet() {
  const spreadsheet = await googleSheetsRequest('?fields=sheets.properties.title');
  if (spreadsheet.skipped) return spreadsheet;

  const exists = (spreadsheet.sheets || []).some((sheet) => {
    return sheet.properties && sheet.properties.title === config.googleOrdersSheetName;
  });

  if (!exists) {
    await googleSheetsRequest(':batchUpdate', {
      method: 'POST',
      body: JSON.stringify({
        requests: [
          {
            addSheet: {
              properties: {
                title: config.googleOrdersSheetName
              }
            }
          }
        ]
      })
    });
  }

  const sheetName = encodeURIComponent(config.googleOrdersSheetName);
  await googleSheetsRequest(`/values/${sheetName}!A1:L1?valueInputOption=RAW`, {
    method: 'PUT',
    body: JSON.stringify({
      values: [sheetHeaders()]
    })
  });

  return { status: 'ready' };
}

async function appendOrderToGoogleSheet(order) {
  if (!config.googleSheetId) {
    return { status: 'skipped', reason: 'GOOGLE_SHEET_ID not configured' };
  }

  const ready = await ensureOrdersSheet();
  if (ready.skipped) return ready;

  const sheetName = encodeURIComponent(config.googleOrdersSheetName);
  const data = await googleSheetsRequest(`/values/${sheetName}!A:L:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
    method: 'POST',
    body: JSON.stringify({
      values: [orderToSheetRow(order)]
    })
  });

  return { status: 'saved', updatedRange: data.updates && data.updates.updatedRange };
}

async function sendOrderToAppsScript(order) {
  if (!config.googleAppsScriptUrl) {
    return { status: 'skipped', reason: 'GOOGLE_APPS_SCRIPT_URL not configured' };
  }

  const payload = {
    action: 'order',
    orderNum: order.orderNum,
    date: order.date,
    prenom: order.customer.firstName,
    nom: order.customer.lastName,
    telephone: order.customer.phone,
    ville: order.customer.city,
    codePostal: order.customer.postalCode,
    adresse: order.customer.address,
    items: order.items,
    total: order.total
  };

  const response = await fetch(config.googleAppsScriptUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload)
  });

  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch (_) {
    data = { raw: text };
  }

  if (!response.ok || data.status === 'error') {
    throw new Error(data.message || data.email || data.sheet || `Apps Script failed with status ${response.status}`);
  }

  return { status: 'saved', provider: 'apps-script', response: data };
}

async function sendContactToAppsScript(contact) {
  if (!config.googleAppsScriptUrl) {
    return { status: 'skipped', reason: 'GOOGLE_APPS_SCRIPT_URL not configured' };
  }

  const payload = {
    action: 'contact',
    id: contact.id,
    date: contact.date,
    prenom: contact.prenom,
    nom: contact.nom,
    email: contact.email,
    telephone: contact.telephone,
    sujet: contact.sujet,
    message: contact.message
  };

  const response = await fetch(config.googleAppsScriptUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload)
  });

  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch (_) {
    data = { raw: text };
  }

  if (!response.ok || data.status === 'error') {
    throw new Error(data.message || data.email || `Apps Script contact failed with status ${response.status}`);
  }

  return { status: 'saved', provider: 'apps-script', response: data };
}

async function handleApi(req, res, url) {
  if (!applyRateLimit(req, res)) return;

  if (req.method === 'OPTIONS') {
    res.writeHead(204, securityHeaders({
      'Cache-Control': 'no-store'
    }));
    res.end();
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/health') {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/products') {
    sendJson(res, 200, await readJson(PRODUCTS_FILE, []));
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/contact') {
    const contact = validateContact(await parseJsonBody(req, 128 * 1024));

    try {
      const integration = await sendContactToAppsScript(contact);
      if (integration.status === 'skipped') {
        sendJson(res, 503, {
          ok: false,
          error: 'Contact email is not configured',
          details: integration.reason
        });
        return;
      }

      sendJson(res, 201, { ok: true, messageId: contact.id, integration });
      return;
    } catch (error) {
      console.warn('Contact email failed:', error.message);
      sendJson(res, 502, {
        ok: false,
        messageId: contact.id,
        error: 'Contact email failed',
        details: error.message
      });
      return;
    }
  }

  if (req.method === 'GET' && url.pathname.startsWith('/api/products/')) {
    const id = decodeURIComponent(url.pathname.replace('/api/products/', ''));
    const products = await readJson(PRODUCTS_FILE, []);
    const product = products.find((item) => item.id === id);
    product ? sendJson(res, 200, product) : sendError(res, 404, 'Product not found');
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/orders') {
    const order = validateOrder(await parseJsonBody(req));
    const orders = await readJsonArray(ORDERS_FILE);
    orders.push(order);
    await writeJson(ORDERS_FILE, orders);

    try {
      const integration = config.googleAppsScriptUrl
        ? await sendOrderToAppsScript(order)
        : await appendOrderToGoogleSheet(order);

      if (integration && integration.status === 'skipped') {
        console.warn('Order Google integration skipped:', integration.reason);
        sendJson(res, 503, {
          ok: false,
          orderNum: order.orderNum,
          error: 'Order saved locally, but Google integration is not configured',
          details: integration.reason
        });
        return;
      }

      sendJson(res, 201, { ok: true, orderNum: order.orderNum, integration });
      return;
    } catch (error) {
      console.warn('Order Google integration failed:', error.message);
      sendJson(res, 502, {
        ok: false,
        orderNum: order.orderNum,
        error: 'Order saved locally, but Google Sheet or email failed',
        details: error.message
      });
      return;
    }
  }

  if (req.method === 'POST' && url.pathname === '/api/admin/login') {
    const body = await parseJsonBody(req);
    const password = String(body.password || '');
    const expected = Buffer.from(config.adminPassword);
    const received = Buffer.from(password);

    if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
      sendError(res, 401, 'Invalid admin password');
      return;
    }

    sendJson(res, 200, { ok: true, ...createSession(res) });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/admin/products') {
    if (!requireAdmin(req, res)) return;
    if (IS_VERCEL) {
      sendJson(res, 501, {
        ok: false,
        error: 'Product editing is disabled on Vercel because serverless files are not persistent'
      });
      return;
    }
    const product = validateProduct(await parseJsonBody(req));
    const products = await readJson(PRODUCTS_FILE, []);
    const existingIndex = products.findIndex((item) => item.id === product.id);

    if (existingIndex === -1) products.push(product);
    else products[existingIndex] = product;

    await writeJson(PRODUCTS_FILE, products);
    sendJson(res, 201, { ok: true, product });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/admin/orders') {
    if (!requireAdmin(req, res)) return;
    sendJson(res, 200, await readJsonArray(ORDERS_FILE));
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/admin/integrations') {
    if (!requireAdmin(req, res)) return;
    sendJson(res, 200, {
      email: {
        enabled: false,
        provider: null
      },
      googleSheets: {
        enabled: Boolean(config.googleAppsScriptUrl || (config.googleSheetId && config.googleClientEmail && config.googlePrivateKey)),
        provider: config.googleAppsScriptUrl ? 'apps-script' : 'google-service-account',
        appsScriptConfigured: Boolean(config.googleAppsScriptUrl),
        sheetIdConfigured: Boolean(config.googleSheetId),
        serviceAccountConfigured: Boolean(config.googleClientEmail && config.googlePrivateKey),
        ordersSheetName: config.googleOrdersSheetName
      }
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/admin/logout') {
    const session = getSession(req);
    if (session) sessions.delete(session.id);
    res.setHeader('Set-Cookie', 'flambeau_admin=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');
    sendJson(res, 200, { ok: true });
    return;
  }

  sendError(res, 404, 'API route not found');
}

async function serveStatic(req, res, url) {
  if (url.pathname === '/google-apps-script.js') {
    sendError(res, 410, 'Google Apps Script has been removed from the public app');
    return;
  }

  let requestedPath = decodeURIComponent(url.pathname);
  if (requestedPath === '/') requestedPath = '/index.html';

  const filePath = path.resolve(PUBLIC_DIR, `.${requestedPath}`);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    sendError(res, 403, 'Forbidden');
    return;
  }

  try {
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) {
      sendError(res, 404, 'Not found');
      return;
    }

    const extension = path.extname(filePath).toLowerCase();
    const body = await fs.readFile(filePath);
    const immutable = /\.(?:jpg|jpeg|png|webp|svg|mp4|css|js)$/i.test(filePath);

    res.writeHead(200, securityHeaders({
      'Content-Type': mimeTypes[extension] || 'application/octet-stream',
      'Content-Length': body.length,
      'Cache-Control': immutable ? 'public, max-age=86400' : 'no-store'
    }));
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch (error) {
    if (error.code === 'ENOENT') {
      sendError(res, 404, 'Not found');
      return;
    }
    throw error;
  }
}

async function requestHandler(req, res) {
  try {
    req.setTimeout(15_000);
    applyCors(req, res);

    if (rejectBadRequest(req, res)) return;

    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

    if (url.pathname.startsWith('/api/')) {
      await handleApi(req, res, url);
      return;
    }

    await serveStatic(req, res, url);
  } catch (error) {
    console.error(error);
    sendError(res, error.statusCode || 500, error.message || 'Internal server error');
  }
}

validateRuntimeConfig();
setInterval(cleanupRateBuckets, 60_000).unref();
setInterval(cleanupSessions, ONE_HOUR).unref();

if (require.main === module) {
  const server = http.createServer(requestHandler);

  server.listen(config.port, () => {
    console.log(`Flambeau backend running on http://localhost:${config.port}`);
    if (config.adminPassword === 'change-this-password') {
      console.warn('Set ADMIN_PASSWORD in .env before production use.');
    }
    if (!config.googleAppsScriptUrl && (!config.googleSheetId || !config.googleClientEmail || !config.googlePrivateKey)) {
      console.warn('Google Sheets sync disabled: set GOOGLE_APPS_SCRIPT_URL or service account values in .env.');
    }
  });

  function shutdown(signal) {
    console.log(`${signal} received, closing server...`);
    server.close(() => {
      process.exit(0);
    });
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

module.exports = requestHandler;
