# Flambeau Backend

This project now runs through a real Node.js backend. Do not open `shop.html`
directly with `file://`; start the server and use the local URL.

## Start

1. Copy `.env.example` to `.env`.
2. Change `ADMIN_PASSWORD` and `SESSION_SECRET`.
3. Run:

```bash
npm start
```

Open:

```text
http://localhost:3000
```

## Structure

```text
public/     Frontend served by the backend
server/     Node.js backend
data/       JSON database files
docs/       Project documentation
```

## API

- `GET /api/products`
- `GET /api/products/:id`
- `POST /api/contact`
- `POST /api/orders`
- `POST /api/admin/login`
- `POST /api/admin/products`
- `GET /api/admin/orders`
- `POST /api/admin/logout`

## Google Sheets

Orders are sent to Google Sheets and email through Apps Script. Contact
messages are sent by email only.

Recommended setup:

```text
GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/xxx/exec
```

Copy `google-apps-script.js` into Apps Script, set `SHEET_ID` and
`NOTIF_EMAIL`, deploy it as a web app, then paste the deployment URL into
`.env`.

Apps Script will append the order to `Commandes` and send a confirmation email
to `NOTIF_EMAIL`. Contact messages are not appended to Google Sheets.

Before testing real orders, run the `testEmailAuthorization` function once in
Apps Script and accept the Google permission for `MailApp.sendEmail`.

Advanced setup without Apps Script:

```text
GOOGLE_SHEET_ID=your_sheet_id
GOOGLE_ORDERS_SHEET_NAME=Commandes
GOOGLE_CLIENT_EMAIL=service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
```

Share the Google Sheet with the service account email as editor.

The backend creates the `Commandes` sheet tab and headers if they do not exist.
