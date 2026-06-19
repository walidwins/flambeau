const PRODUCTS_ACTION = 'products';
const ADD_PRODUCT_ACTION = 'addProduct';
const fs = require('fs/promises');
const path = require('path');
const LOCAL_PRODUCTS_FILE = path.join(process.cwd(), 'data', 'products.json');

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

async function readLocalProducts() {
  try {
    const raw = await fs.readFile(LOCAL_PRODUCTS_FILE, 'utf8');
    const products = JSON.parse(raw.replace(/^\uFEFF/, ''));
    return Array.isArray(products) ? products : [];
  } catch (error) {
    return [];
  }
}

function mergeProducts(primaryProducts, fallbackProducts) {
  const merged = [];
  const seen = new Set();

  function addList(products) {
    if (!Array.isArray(products)) return;
    products.forEach((product) => {
      if (!product || !product.id || seen.has(product.id)) return;
      seen.add(product.id);
      merged.push(product);
    });
  }

  addList(primaryProducts);
  addList(fallbackProducts);
  return merged;
}

module.exports = async function handler(req, res) {
  const scriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL;

  try {
    if (req.method === 'GET') {
      if (!scriptUrl) {
        return sendJson(res, 200, await readLocalProducts());
      }

      const separator = scriptUrl.indexOf('?') === -1 ? '?' : '&';
      const response = await fetch(scriptUrl + separator + 'action=' + encodeURIComponent(PRODUCTS_ACTION));
      const data = await readJsonResponse(response);

      if (!response.ok || data.status === 'error') {
        return sendJson(res, 200, await readLocalProducts());
      }

      return sendJson(res, 200, mergeProducts(data, await readLocalProducts()));
    }

    if (req.method === 'POST') {
      if (!scriptUrl) {
        return sendJson(res, 500, { error: 'GOOGLE_APPS_SCRIPT_URL manquante' });
      }

      const payload = {
        ...parseBody(req.body),
        action: ADD_PRODUCT_ACTION
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

    res.setHeader('Allow', 'GET, POST');
    return sendJson(res, 405, { error: 'Methode non autorisee' });
  } catch (error) {
    return sendJson(res, 500, {
      error: 'Erreur API produits',
      details: error.message
    });
  }
};
