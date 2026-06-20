const PRODUCTS_ACTION = 'products';
const ADD_PRODUCT_ACTION = 'addProduct';
const UPDATE_PRODUCT_ACTION = 'updateProduct';

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

function parseBody(body) {
  if (!body) return {};
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch (error) {
      return {};
    }
  }
  return body;
}

async function readJsonResponse(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch (error) {
    return { success: true, raw: text };
  }
}

function normalizeProductsPayload(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.products)) return data.products;
  if (data && Array.isArray(data.data)) return data.data;
  return [];
}

function dedupeProducts(products) {
  const merged = [];
  const seenIds = new Set();
  const seenKeys = new Set();

  function normalizeKeyPart(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  function productKey(product) {
    const name = normalizeKeyPart(product.name || product.nom || product.Nom || '');
    const category = normalizeKeyPart(product.category || product.categorie || product.Category || '');
    return name && category ? `${category}::${name}` : '';
  }

  function addList(products) {
    if (!Array.isArray(products)) return;
    products.forEach((product) => {
      const key = productKey(product);
      if (!product || !product.id || seenIds.has(product.id) || (key && seenKeys.has(key))) return;
      seenIds.add(product.id);
      if (key) seenKeys.add(key);
      merged.push(product);
    });
  }

  addList(products);
  return merged;
}

module.exports = async function handler(req, res) {
  const scriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL;

  try {
    if (req.method === 'GET') {
      res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

      if (!scriptUrl) {
        return sendJson(res, 500, { error: 'GOOGLE_APPS_SCRIPT_URL manquante' });
      }

      const separator = scriptUrl.indexOf('?') === -1 ? '?' : '&';
      const response = await fetch(scriptUrl + separator + 'action=' + encodeURIComponent(PRODUCTS_ACTION));
      const data = await readJsonResponse(response);

      if (!response.ok || data.status === 'error') {
        return sendJson(res, response.ok ? 502 : response.status, {
          error: 'Erreur Google Apps Script produits',
          details: data.message || data.error || data.raw || response.statusText
        });
      }

      return sendJson(res, 200, dedupeProducts(normalizeProductsPayload(data)));
    }

    if (req.method === 'POST' || req.method === 'PUT') {
      if (!scriptUrl) {
        return sendJson(res, 500, { error: 'GOOGLE_APPS_SCRIPT_URL manquante' });
      }

      const body = parseBody(req.body);
      const isUpdate = req.method === 'PUT'
        || body.action === UPDATE_PRODUCT_ACTION
        || body._method === 'PUT'
        || body.update === true;

      const payload = {
        ...body,
        action: isUpdate ? UPDATE_PRODUCT_ACTION : ADD_PRODUCT_ACTION
      };

      const response = await fetch(scriptUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await readJsonResponse(response);

      if (!response.ok || data.status === 'error') {
        return sendJson(res, response.ok ? 400 : response.status, {
          error: 'Produit refuse par Google Apps Script',
          details: data.message || data.error || data.raw || response.statusText
        });
      }

      return sendJson(res, 200, data);
    }

    res.setHeader('Allow', 'GET, POST, PUT');
    return sendJson(res, 405, { error: 'Methode non autorisee' });
  } catch (error) {
    return sendJson(res, 500, {
      error: 'Erreur API produits',
      details: error.message
    });
  }
};
