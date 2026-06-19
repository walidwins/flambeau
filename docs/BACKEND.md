# Backend Flambeau

Le site est servi depuis `public/`. Les endpoints Node servent de passerelle
vers Google Apps Script et Hugging Face, sans exposer les secrets au navigateur.

## Demarrage

```bash
npm install
npm start
```

Ouvrir ensuite:

```text
http://localhost:3000
```

## API active

- `GET /api/health`
- `GET /api/products`
- `GET /api/products/:id`
- `POST /api/products`
- `POST /api/orders`
- `POST /api/contact`
- `POST /api/chat`
- `POST /api/admin/login`
- `GET /api/admin/orders`
- `GET /api/admin/integrations`
- `POST /api/admin/logout`

## Stockage durable

- Produits: feuille Google Sheets `Produits` via Apps Script.
- Commandes: feuille Google Sheets `Commandes` via Apps Script.
- Contact: email via Apps Script.
- IA: Hugging Face via `/api/chat`.

`data/*.json` reste seulement utile comme historique ou secours local; Vercel
ne doit pas l'utiliser comme stockage durable.
