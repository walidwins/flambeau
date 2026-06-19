# Contact et commandes

Les formulaires du site n'appellent jamais Google Apps Script directement.
Le navigateur appelle le backend:

```text
POST /api/orders
POST /api/contact
```

Le backend envoie ensuite vers `GOOGLE_APPS_SCRIPT_URL`.

## Apps Script

Le script accepte:

- `action: "order"`: ajoute la commande dans `Commandes` et envoie l'email.
- `action: "contact"`: envoie l'email de contact.

Apres chaque modification Apps Script:

1. Save.
2. Deploy -> Manage deployments.
3. Edit.
4. New version.
5. Deploy.

## Tests

- Commande: passer une commande depuis `cart.html`, puis verifier l'onglet `Commandes`.
- Contact: envoyer un message depuis `contact.html`, puis verifier l'email.
