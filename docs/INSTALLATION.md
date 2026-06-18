# Installation Flambeau

L'application doit etre lancee avec le backend Node.js. Google Apps Script est
utilise seulement comme integration privee pour envoyer les commandes vers
Google Sheets/email et les contacts vers email.

## 1. Configuration

Copiez `.env.example` vers `.env`, puis modifiez au minimum:

```text
ADMIN_PASSWORD=un-mot-de-passe-fort
SESSION_SECRET=une-longue-cle-secrete-aleatoire
```

Pour Google Sheets avec Apps Script:

```text
GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/xxx/exec
```

Etapes:

1. Ouvre Google Apps Script.
2. Copie le contenu de `google-apps-script.js`.
3. Verifie `SHEET_ID` avec l'id de ton Google Sheet.
4. Verifie `NOTIF_EMAIL` dans le script pour recevoir les confirmations.
5. Dans Apps Script, choisis la fonction `testEmailAuthorization` puis clique sur Run.
6. Accepte les permissions Google pour envoyer les emails.
7. Deploie en application web.
8. Mets l'URL de deploiement dans `.env`.

Configuration avancee sans Apps Script:

```text
GOOGLE_SHEET_ID=id_de_votre_sheet
GOOGLE_ORDERS_SHEET_NAME=Commandes
GOOGLE_CLIENT_EMAIL=email_du_service_account
GOOGLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
```

## 2. Demarrage

```bash
npm install
npm start
```

Puis ouvrez:

```text
http://localhost:3000
```

## 3. Donnees

- Produits: `data/products.json`
- Commandes: `data/orders.json`

Si Google Sheets est configure, chaque commande est ajoutee dans l'onglet
`Commandes`. Les messages contact sont envoyes par email seulement.

## 4. Organisation des fichiers

```text
public/     Pages HTML, CSS, JavaScript, images et videos
server/     Backend Node.js
data/       Donnees JSON
docs/       Documentation
```

La page admin utilise maintenant le backend:

```text
http://localhost:3000/admin.html
```

## 5. Deploiement

Consultez `docs/DEPLOYMENT.md` avant la mise en production.
