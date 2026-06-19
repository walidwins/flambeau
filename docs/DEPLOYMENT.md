# Deploiement Vercel

## Checklist

1. Executer `npm run check`.
2. Verifier que `.env` n'est pas versionne.
3. Redeployer Google Apps Script apres modification.
4. Definir les variables Vercel.
5. Tester `/api/health`, `/api/products`, puis une commande.

## Variables Vercel

```env
NODE_ENV=production
ADMIN_PASSWORD=un-mot-de-passe-long-et-unique
SESSION_SECRET=une-cle-aleatoire-de-plus-de-32-caracteres
CORS_ALLOWED_ORIGINS=https://votre-projet.vercel.app
TRUST_PROXY=true
GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/xxx/exec
HF_TOKEN=
HF_MODEL=meta-llama/Llama-3.1-8B-Instruct
```

## Architecture

- `public/` sert le site statique.
- `/api/products` lit et ajoute les produits via Google Apps Script.
- `/api/orders` envoie les commandes via Google Apps Script.
- `/api/contact` envoie les messages via Google Apps Script.
- `/api/chat` utilise Hugging Face cote serveur.

Le disque Vercel est ephemere. Les produits et commandes de production doivent
etre dans Google Sheets, pas dans `data/*.json`.

## Verification apres deploiement

```text
https://votre-projet.vercel.app/api/health
https://votre-projet.vercel.app/api/products
```
