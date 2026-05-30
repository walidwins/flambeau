# 📋 Guide de déploiement — Flambeau × Google Sheets + Gmail

## Étape 1 — Créer votre Google Sheet

1. Allez sur [sheets.google.com](https://sheets.google.com) et créez un nouveau classeur
2. Nommez-le **"Flambeau Commandes"**
3. Copiez l'**ID du Sheet** depuis l'URL :  
   `https://docs.google.com/spreadsheets/d/**VOTRE_ID_ICI**/edit`

---

## Étape 2 — Créer le Google Apps Script

1. Allez sur [script.google.com](https://script.google.com)
2. Cliquez **"Nouveau projet"**
3. Supprimez le code existant
4. **Copiez-collez** tout le contenu de `google-apps-script.js`
5. Modifiez les deux lignes en haut du fichier :
   ```js
   var SHEET_ID    = 'VOTRE_ID_COPIÉ_À_L_ÉTAPE_1';
   var NOTIF_EMAIL = 'votre.email@gmail.com';
   ```
6. Cliquez **Enregistrer** (💾)

---

## Étape 3 — Déployer le script

1. Cliquez **"Déployer"** → **"Nouveau déploiement"**
2. Type : **Application Web**
3. Paramètres :
   - Exécuter en tant que : **Moi**
   - Accès : **Tout le monde** *(requis pour recevoir les commandes du site)*
4. Cliquez **"Déployer"**
5. Acceptez les permissions Gmail et Sheets
6. **Copiez l'URL** qui s'affiche (ressemble à `https://script.google.com/macros/s/XXXX/exec`)

---

## Étape 4 — Connecter le site

Ouvrez `js/app.js` et remplacez la ligne :

```js
var GOOGLE_SCRIPT_URL = 'VOTRE_URL_GOOGLE_APPS_SCRIPT_ICI';
```

par :

```js
var GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/VOTRE_ID/exec';
```

---

## ✅ Résultat

À chaque commande passée sur votre site :

| Action | Détail |
|--------|--------|
| 📊 **Google Sheets** | Nouvelle ligne : N° commande, date, client, adresse, articles, total |
| 📧 **Gmail** | Email HTML élégant avec tous les détails de la commande |

---

## ⚠️ Notes importantes

- Le script tourne sur le **compte Google** qui le déploie — Gmail et Sheets doivent être sur le même compte
- Aucun serveur ni abonnement requis — **100% gratuit** avec Google
- Si vous mettez à jour le code du script, pensez à créer un **nouveau déploiement** (pas "gérer les déploiements")
