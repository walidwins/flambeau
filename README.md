# Flambeau Shop

Application ecommerce Flambeau avec frontend statique servi par un backend Node.js.

## Demarrage local

```bash
npm install
copy .env.example .env
npm start
```

Ouvrir ensuite `http://localhost:3000`.

## Verification

```bash
npm run check
```

## Deploiement

Avant production, configurez au minimum:

```env
NODE_ENV=production
ADMIN_PASSWORD=un-mot-de-passe-long-et-unique
SESSION_SECRET=une-cle-aleatoire-de-plus-de-32-caracteres
CORS_ALLOWED_ORIGINS=https://votre-domaine.com
TRUST_PROXY=true
```

Pour les commandes et contacts, configurez aussi `GOOGLE_APPS_SCRIPT_URL`.

La configuration Render est fournie dans `render.yaml`. Le health check est `GET /api/health`.

Documentation detaillee: `docs/DEPLOYMENT.md`.
