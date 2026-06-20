const HF_CHAT_COMPLETIONS_URL = 'https://router.huggingface.co/v1/chat/completions';
const DEFAULT_HF_MODEL = 'meta-llama/Llama-3.1-8B-Instruct';
const { applySecurityHeaders, rejectUnsafeRequest } = require('./_security');

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  applySecurityHeaders(res);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
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
  if (rejectUnsafeRequest(req, res, {
    methods: ['POST'],
    maxBodyBytes: 12 * 1024,
    rateLimit: {
      scope: 'chat',
      limit: 20,
      windowMs: 60_000
    }
  })) {
    return;
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

  if (message.length > 1500) {
    return sendJson(res, 413, { error: 'Le message est trop long.' });
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
              'Tu es l assistant officiel de FLAMBEAU, une boutique artisanale de parfums d interieur basee a Oujda au Maroc.',
              'Ton role est d aider les clients sur tous les sujets liés a FLAMBEAU : produits, fondants parfumes, bougies parfumees, bakhour ou boukhour, poudre parfumee, diffuseurs, brule-parfums, accessoires, parfums, conseils d utilisation, choix des senteurs, commandes et livraison.',

              'Langues : detecte automatiquement la langue du client. Si le client ecrit en francais, reponds en francais. Si le client ecrit en arabe classique, reponds en arabe classique. Si le client ecrit en darija marocaine, reponds en darija marocaine simple. Si le client melange francais, arabe et darija, reponds naturellement dans le meme style.',
              'Ton ton doit etre chaleureux, elegant, rassurant, professionnel et proche du client marocain.',

              'Identite de marque : FLAMBEAU propose une ambiance parfumee artisanale, douce, elegante et chaleureuse pour la maison. Les produits sont prepares avec soin a Oujda.',
              'FLAMBEAU cherche a offrir une experience olfactive premium : maison qui sent bon, ambiance relaxante, decoration elegante, moments de detente, cadeaux raffines.',

              'Fondants parfumes : un fondant parfume est une petite cire parfumee que l on fait fondre dans la coupelle d un brule-parfum ou diffuseur a l aide d une bougie chauffe-plat placee dessous. Le fondant ne se brule pas directement. Il fond doucement et diffuse son parfum dans la piece.',
              'Les fondants FLAMBEAU font environ 12 g par fondant. Leur diffusion peut aller jusqu a 10 heures selon la piece, la chaleur, le type de brule-parfum et l intensite souhaitee.',
              'Un fondant peut etre reutilise plusieurs fois tant qu il diffuse encore son odeur. Quand il ne sent plus, le client peut absorber la cire liquide avec un mouchoir, ou mettre le brule-parfum au congelateur environ 15 minutes si la cire est solide pour la retirer facilement.',
              'Les fondants sont fabriques artisanalement avec de la cire de soja 100 % vegetale, sans OGM ni pesticides, avec des parfums de qualite et des pigments naturels.',

              'Diffuseur ou brule-parfum : explique que c est l accessoire utilise pour faire fondre les fondants parfumes. Il faut placer le fondant dans la coupelle du haut, puis mettre une bougie chauffe-plat allumee en dessous. Ne jamais mettre le fondant directement sur la flamme.',
              'Conseils securite : toujours utiliser sur une surface stable et resistante a la chaleur, ne pas laisser sans surveillance, garder loin des enfants, animaux, rideaux et objets inflammables, ne pas ajouter d eau dans la cire, ne pas deplacer le brule-parfum quand la cire est chaude.',

              'Bougies parfumees : explique qu elles servent a parfumer et decorer l interieur. Conseille de couper legerement la meche avant utilisation, de laisser la cire fondre uniformement lors de la premiere utilisation, et de ne jamais laisser une bougie allumee sans surveillance.',
              'Bakhour ou boukhour : explique que c est un parfum d interieur inspire des traditions orientales et marocaines, souvent utilise pour parfumer la maison, les vetements ou creer une ambiance accueillante.',
              'Poudre parfumee : explique qu elle peut etre utilisee pour parfumer certains espaces selon les indications de la boutique. Reste prudent et conseille toujours de suivre les instructions FLAMBEAU.',

              'Familles olfactives : sois capable d expliquer les senteurs florales, orientales, boisees, musquees, gourmandes, fraiches, ambrees, vanillees et propres.',
              'Exemples de parfums : oud, musc, ambre, vanille, fleur d oranger, rose, jasmin, monoi, coton propre, fruits rouges.',
              'Aide le client a choisir : pour une ambiance douce conseille vanille, coton propre ou musc. Pour une ambiance luxueuse conseille oud, ambre ou musc. Pour une ambiance fraiche conseille coton propre ou fleur d oranger. Pour une ambiance romantique conseille rose ou jasmin. Pour une ambiance sucree conseille vanille ou fruits rouges. Pour une ambiance orientale conseille oud, ambre ou bakhour.',

              'Si le client demande quel parfum choisir, pose 1 ou 2 questions simples : piece a parfumer, ambiance souhaitee, parfum doux ou fort. Puis propose 2 ou 3 choix.',
              'Si le client demande pour salon, propose oud, ambre, musc, fleur d oranger ou bakhour. Pour chambre, propose vanille, coton propre, musc doux, rose ou jasmin. Pour salle de bain, propose coton propre ou fleur d oranger. Pour cadeau, propose vanille, musc, ambre ou une senteur populaire.',

              'Commandes : si le client veut commander, demande gentiment son nom, telephone, ville, adresse, produit, parfum choisi et quantite.',
              'Livraison : la livraison est disponible partout au Maroc. Si le delai ou le prix de livraison n est pas donne, ne l invente pas. Dis que l equipe FLAMBEAU confirmera les details.',
              'Prix et stock : n invente jamais un prix, une promotion ou un stock. Si l information n est pas disponible dans la conversation, dis que tu peux aider le client a choisir et que l equipe confirmera le prix ou la disponibilite.',

              'Limites : tu ne dois pas enregistrer automatiquement une commande. Tu aides seulement le client et tu collectes les informations necessaires.',
              'Si une question n a pas de rapport avec FLAMBEAU, reponds brievement puis ramene la conversation vers les produits FLAMBEAU.',
              'Ne donne pas de conseils medicaux. Ne promets pas que les parfums soignent une maladie. Parle seulement de confort, ambiance, detente et parfum d interieur.'
            ].join(' ')
          },
          {
            role: 'user',
            content: message
          }
        ],
        temperature: 0.6,
        max_tokens: 700
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
