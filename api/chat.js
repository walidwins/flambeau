const HF_CHAT_COMPLETIONS_URL = 'https://router.huggingface.co/v1/chat/completions';
const DEFAULT_HF_MODEL = 'meta-llama/Llama-3.1-8B-Instruct';

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

function parseBody(body) {
  if (!body) {
    return {};
  }

  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch (error) {
      return {};
    }
  }

  return body;
}

module.exports = async function chatHandler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { error: 'Methode non autorisee. Utilisez POST.' });
  }

  const hfToken = process.env.HF_TOKEN;
  const model = process.env.HF_MODEL || DEFAULT_HF_MODEL;

  if (!hfToken) {
    return sendJson(res, 500, {
      error: 'Configuration Hugging Face manquante. La variable HF_TOKEN doit etre definie.'
    });
  }

  const body = parseBody(req.body);
  const message = typeof body.message === 'string' ? body.message.trim() : '';

  if (!message) {
    return sendJson(res, 400, { error: 'Le message est obligatoire.' });
  }

  const controller = new AbortController();
  const timeout = setTimeout(function () {
    controller.abort();
  }, 30000);

  try {
    const hfResponse = await fetch(HF_CHAT_COMPLETIONS_URL, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + hfToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'system',
            content: [
              'Tu es l assistant officiel de FLAMBEAU, une boutique artisanale basee a Oujda.',
              'FLAMBEAU est specialisee dans les fondants parfumes, bougies parfumees, bakhour ou boukhour, poudre parfumee et accessoires parfumes.',
              'Informations produit a connaitre : les fondants font environ 12 g par fondant, leur diffusion peut aller jusqu a 10 heures, ils sont fabriques artisanalement a Oujda avec une cire de soja 100 % vegetale.',
              'La livraison est disponible partout au Maroc.',
              'Reponds en francais simple, professionnel et chaleureux. Si le client ecrit en darija marocaine, reponds naturellement en darija et francais simple.',
              'N invente jamais un prix ou un stock si l information n est pas disponible.',
              'Si le client veut commander, demande son nom, telephone, ville, adresse, produit, parfum choisi et quantite.',
              'N enregistre pas de commande automatiquement. Tu aides seulement le client.'
            ].join(' ')
          },
          {
            role: 'user',
            content: message
          }
        ],
        temperature: 0.5,
        max_tokens: 450
      }),
      signal: controller.signal
    });

    const data = await hfResponse.json().catch(function () {
      return {};
    });

    if (!hfResponse.ok) {
      console.error('Hugging Face chat error:', hfResponse.status, data);
      return sendJson(res, hfResponse.status, {
        error: 'Erreur lors de la generation de la reponse IA.'
      });
    }

    const reply = data &&
      data.choices &&
      data.choices[0] &&
      data.choices[0].message &&
      typeof data.choices[0].message.content === 'string'
      ? data.choices[0].message.content.trim()
      : '';

    if (!reply) {
      return sendJson(res, 502, { error: 'La reponse IA est vide.' });
    }

    return sendJson(res, 200, { reply: reply });
  } catch (error) {
    console.error('Chat API failed:', error);
    return sendJson(res, 500, { error: 'Erreur de connexion avec Hugging Face.' });
  } finally {
    clearTimeout(timeout);
  }
};
