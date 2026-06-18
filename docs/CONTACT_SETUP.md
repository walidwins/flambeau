# Contact et commandes

Le comportement voulu est volontairement simple:

- Les commandes sont enregistrees localement dans `data/orders.json`.
- Les commandes sont envoyees a Google Sheets dans l'onglet `Commandes`.
- Les commandes sont envoyees par email a `NOTIF_EMAIL`.
- Les messages de contact sont envoyes par email seulement.
- Les messages de contact ne sont pas enregistres dans Google Sheets.
- Les messages de contact ne sont pas stockes dans `data/`.

## Configuration

Dans `.env`, configurez uniquement l'URL du deploiement Apps Script:

```env
GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/VOTRE_DEPLOIEMENT/exec
```

Le navigateur ne contient pas cette URL. Le formulaire appelle seulement:

```text
POST /api/contact
```

## Apps Script

Copiez `google-apps-script.js` dans Google Apps Script, puis redeployez la Web App.

Le script accepte:

- `action: "order"`: sauvegarde dans Sheet + email.
- `action: "contact"`: email seulement.

Apres chaque modification Apps Script:

1. Cliquez sur Save.
2. Deploy -> Manage deployments.
3. Edit.
4. Choisissez New version.
5. Deploy.

## Tests

Pour tester les commandes:

1. Passez une commande depuis le site.
2. Verifiez `data/orders.json`.
3. Verifiez l'onglet Google Sheet `Commandes`.
4. Verifiez l'email.

Pour tester le contact:

1. Envoyez un message depuis `contact.html`.
2. Verifiez l'email.
3. Ne cherchez pas ce message dans Google Sheet: ce n'est plus enregistre la-bas.
