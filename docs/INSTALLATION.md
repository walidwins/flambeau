# Installation Flambeau

## Configuration locale

Copier `.env.example` vers `.env`, puis verifier:

```env
ADMIN_PASSWORD=FlambeauAdmin2026!
SESSION_SECRET=une-longue-cle-secrete
GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/xxx/exec
HF_TOKEN=
HF_MODEL=meta-llama/Llama-3.1-8B-Instruct
```

## Google Apps Script

1. Ouvrir Google Apps Script.
2. Copier le contenu de `google-apps-script.js`.
3. Verifier `SHEET_ID`, `NOTIF_EMAIL` et `ADMIN_PASSWORD`.
4. Deployer en application web.
5. Mettre l'URL de deploiement dans `GOOGLE_APPS_SCRIPT_URL`.

Le script gere:

- `GET ?action=products`
- `POST { action: "addProduct", ... }`
- `POST { action: "order", ... }`
- `POST { action: "contact", ... }`

## Demarrage

```bash
npm install
npm start
```

Ouvrir:

```text
http://localhost:3000
```

## Organisation

```text
api/       Fonctions Vercel dediees
public/    Pages HTML, CSS, JS, images et videos
server/    Backend local et catch-all API
data/      Historique local, non durable sur Vercel
docs/      Documentation
```
