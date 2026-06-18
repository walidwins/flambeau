# Deploiement Flambeau

## Checklist avant mise en ligne

1. Executer `npm run check`.
2. Verifier que `.env` n'est pas versionne.
3. Definir un `ADMIN_PASSWORD` long et unique.
4. Definir un `SESSION_SECRET` aleatoire de 32 caracteres ou plus.
5. Definir `CORS_ALLOWED_ORIGINS` avec l'URL publique exacte du site.
6. Definir `TRUST_PROXY=true` si l'app est derriere Render, Railway, Heroku, Nginx ou Cloudflare.
7. Configurer `GOOGLE_APPS_SCRIPT_URL` pour envoyer commandes et contacts.
8. Tester `GET /api/health` apres deploiement.

## Variables d'environnement production

```env
NODE_ENV=production
PORT=3000
ADMIN_PASSWORD=remplacer-par-un-secret-fort
SESSION_SECRET=remplacer-par-une-cle-random-longue
CORS_ALLOWED_ORIGINS=https://votre-domaine.com
TRUST_PROXY=true
GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/xxx/exec
```

`PORT` est souvent fourni automatiquement par l'hebergeur.

## Vercel

Le fichier `vercel.json` est pret:

- `/api/*` est envoye vers `server/index.js`.
- Les pages HTML/CSS/JS/images sont servies depuis `public/`.
- `server/index.js` exporte un handler serverless pour Vercel et continue de fonctionner avec `npm start` en local.

Variables a ajouter dans Vercel Project Settings -> Environment Variables:

```env
NODE_ENV=production
ADMIN_PASSWORD=remplacer-par-un-secret-fort
SESSION_SECRET=remplacer-par-une-cle-random-longue
CORS_ALLOWED_ORIGINS=https://votre-projet.vercel.app
TRUST_PROXY=true
GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/xxx/exec
```

Le disque Vercel est ephemere. Les commandes doivent etre envoyees a Google Apps Script pour etre conservees durablement. L'ajout de produits depuis `/admin.html` est donc desactive sur Vercel.

Commande de verification apres deploiement:

```text
https://votre-projet.vercel.app/api/health
```

## Render

Le fichier `render.yaml` est pret:

- Build command: `npm install`
- Start command: `npm start`
- Health check: `/api/health`

Dans Render, ajoutez les variables marquees `sync: false`.

## Railway / Heroku

Le `Procfile` lance:

```text
web: npm start
```

Ajoutez les memes variables d'environnement dans le dashboard.

## Donnees

Les produits sont lus depuis `data/products.json`.

Les commandes sont sauvegardees localement dans `data/orders.json`, puis envoyees a Google Apps Script si `GOOGLE_APPS_SCRIPT_URL` est configure. Sur beaucoup d'hebergeurs gratuits, le disque local est ephemere: Google Sheets doit etre considere comme la source durable des commandes.

## Securite

En production, le serveur refuse de demarrer si:

- `ADMIN_PASSWORD` est absent ou trop faible.
- `SESSION_SECRET` est absent ou trop faible.
- `CORS_ALLOWED_ORIGINS` est vide.

Pour une vraie protection DDoS, placez Cloudflare ou un reverse proxy devant l'application.
