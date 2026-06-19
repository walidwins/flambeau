const PRODUCTS_ACTION = 'products';
const ADD_PRODUCT_ACTION = 'addProduct';

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

module.exports = async function handler(req, res) {
  const scriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL;

  if (!scriptUrl) {
    return sendJson(res, 500, { error: 'GOOGLE_APPS_SCRIPT_URL manquante' });
  }

  try {
    if (req.method === 'GET') {
      const separator = scriptUrl.indexOf('?') === -1 ? '?' : '&';
      const response = await fetch(scriptUrl + separator + 'action=' + encodeURIComponent(PRODUCTS_ACTION));
      const data = await readJsonResponse(response);

      if (!response.ok || data.status === 'error') {
        return sendJson(res, response.ok ? 502 : response.status, {
          error: 'Erreur Google Apps Script produits',
          details: data.message || data.error || data.raw || response.statusText
        });
      }

      return sendJson(res, 200, data);
    }

    if (req.method === 'POST') {
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
