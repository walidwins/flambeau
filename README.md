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

## Deploiement Vercel

Avant production, configurez au minimum:

```env
NODE_ENV=production
ADMIN_PASSWORD=un-mot-de-passe-long-et-unique
SESSION_SECRET=une-cle-aleatoire-de-plus-de-32-caracteres
CORS_ALLOWED_ORIGINS=https://votre-projet.vercel.app
TRUST_PROXY=true
GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/xxx/exec
HF_TOKEN=hf_xxx
HF_MODEL=meta-llama/Llama-3.1-8B-Instruct
```

Le fichier `vercel.json` route `/api/*` vers le backend Node serverless et sert les pages depuis `public/`.

Important: sur Vercel, le disque local n'est pas durable. `GOOGLE_APPS_SCRIPT_URL` est obligatoire pour conserver les produits, les commandes et les contacts dans Google Sheets / Apps Script.

Documentation detaillee: `docs/DEPLOYMENT.md`.
