// ============================================================
//  FLAMBEAU — Google Apps Script
//  Copiez ce code dans script.google.com (nouveau projet)
//  puis déployez en "Application Web" (accès : Tout le monde)
// ============================================================

// 👇 Mettez l'ID de votre Google Sheet ici
//    (l'ID se trouve dans l'URL de votre Sheet)
var SHEET_ID    = '1SI8I4j0FSsUJKd44pHApttKW9F2wCp3jXNviBuJfQ8c';

// 👇 L'adresse Gmail qui recevra les notifications de commande
var NOTIF_EMAIL = 'flambeaushop@gmail.com';

// ---- NE PAS MODIFIER EN DESSOUS ----

function doPost(e) {
  try {
    var data  = JSON.parse(e.postData.contents);
    saveToSheet(data);
    sendEmailNotification(data);
  } catch (err) {
    Logger.log('Erreur: ' + err.message);
  }

  // Réponse CORS obligatoire pour fetch() no-cors
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ---------- GOOGLE SHEETS ----------
function saveToSheet(order) {
  var ss    = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName('Commandes') || ss.insertSheet('Commandes');

  // Crée l'en-tête si la feuille est vide
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      'N° Commande', 'Date', 'Prénom', 'Nom',
      'Téléphone', 'Ville', 'Code Postal', 'Adresse',
      'Articles', 'Total (MAD)'
    ]);
    sheet.getRange(1, 1, 1, 10)
         .setFontWeight('bold')
         .setBackground('#2C2C2C')
         .setFontColor('#FFFFFF');
    sheet.setFrozenRows(1);
  }

  // Formatage des articles
  var itemsStr = (order.items || []).map(function(i) {
    return i.name + ' ×' + i.qty;
  }).join(' | ');

  sheet.appendRow([
    order.orderNum   || '',
    order.date       || new Date().toLocaleString('fr-FR'),
    order.prenom     || '',
    order.nom        || '',
    order.telephone  || '',
    order.ville      || '',
    order.codePostal || '',
    order.adresse    || '',
    itemsStr,
    order.total      || 0
  ]);
}

// ---------- GMAIL ----------
function sendEmailNotification(order) {
  var itemsHtml = (order.items || []).map(function(i) {
    return '<tr>'
      + '<td style="padding:6px 12px;border-bottom:1px solid #eee">' + i.name + '</td>'
      + '<td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:center">×' + i.qty + '</td>'
      + '<td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right">' + (i.price * i.qty).toFixed(2) + ' MAD</td>'
      + '</tr>';
  }).join('');

  var html = ''
    + '<div style="font-family:Georgia,serif;max-width:600px;margin:auto;border:1px solid #ddd;padding:32px;background:#FAF8F5">'
    + '<h1 style="font-family:Georgia,serif;color:#2C2C2C;letter-spacing:4px;text-align:center;font-size:28px">FLAMBEAU</h1>'
    + '<hr style="border:1px solid #D4AF37;margin:16px 0">'
    + '<h2 style="color:#2C2C2C;font-size:18px">🛍 Nouvelle commande : ' + order.orderNum + '</h2>'
    + '<table style="width:100%;border-collapse:collapse;margin:16px 0">'
    + '<tr><td style="padding:4px 0;color:#888">Date</td><td style="padding:4px 0"><strong>' + order.date + '</strong></td></tr>'
    + '<tr><td style="padding:4px 0;color:#888">Client</td><td style="padding:4px 0"><strong>' + order.prenom + ' ' + order.nom + '</strong></td></tr>'
    + '<tr><td style="padding:4px 0;color:#888">Téléphone</td><td style="padding:4px 0"><strong>' + order.telephone + '</strong></td></tr>'
    + '<tr><td style="padding:4px 0;color:#888">Adresse</td><td style="padding:4px 0"><strong>' + order.adresse + ', ' + order.codePostal + ' ' + order.ville + '</strong></td></tr>'
    + '</table>'
    + '<h3 style="color:#2C2C2C;margin-top:24px">Articles commandés</h3>'
    + '<table style="width:100%;border-collapse:collapse">'
    + '<thead><tr style="background:#2C2C2C;color:#fff">'
    + '<th style="padding:8px 12px;text-align:left">Produit</th>'
    + '<th style="padding:8px 12px;text-align:center">Qté</th>'
    + '<th style="padding:8px 12px;text-align:right">Prix</th>'
    + '</tr></thead>'
    + '<tbody>' + itemsHtml + '</tbody>'
    + '</table>'
    + '<div style="text-align:right;margin-top:16px;font-size:20px;font-weight:bold;color:#D4AF37">'
    + 'Total : ' + (order.total || 0).toFixed(2) + ' MAD'
    + '</div>'
    + '<hr style="border:1px solid #eee;margin-top:32px">'
    + '<p style="color:#aaa;font-size:12px;text-align:center">Flambeau · Boutique en ligne · ' + new Date().getFullYear() + '</p>'
    + '</div>';

  GmailApp.sendEmail(
    NOTIF_EMAIL,
    '🛍 Nouvelle commande Flambeau — ' + order.orderNum,
    // Version texte (fallback)
    'Nouvelle commande ' + order.orderNum + '\nClient : ' + order.prenom + ' ' + order.nom
      + '\nTél : ' + order.telephone + '\nAdresse : ' + order.adresse + ', ' + order.ville
      + '\nTotal : ' + order.total + ' MAD',
    { htmlBody: html }
  );
}
