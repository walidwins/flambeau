// ============================================================
// FLAMBEAU - Google Apps Script
// Produits + commandes Google Sheets + emails
// ============================================================

var DEFAULT_SHEET_ID = '1SI8I4j0FSsUJKd44pHApttKW9F2wCp3jXNviBuJfQ8c';
var NOTIF_EMAIL = 'flambeaushop@gmail.com';
var DEFAULT_ADMIN_PASSWORD = 'FlambeauAdmin2026!';
var TIMEZONE = 'Africa/Casablanca';
var MAX_ORDER_ITEMS = 50;

var PRODUCT_HEADERS = [
  'id',
  'name',
  'category',
  'categoryLabel',
  'price',
  'description',
  'notes',
  'fragrances',
  'weight',
  'stock',
  'image',
  'inStock'
];

var ORDER_HEADERS = [
  'N° Commande',
  'Date',
  'Heure',
  'Statut',
  'Prenom',
  'Nom',
  'Telephone',
  'Ville',
  'Adresse',
  'Articles',
  'Parfums',
  'Quantite totale',
  'Sous-total',
  'Livraison',
  'Total',
  'Notes'
];

// -------------------- HTTP --------------------

function doGet(e) {
  var action = getAction(e);

  try {
    if (action === 'products' || action === 'Produits') {
      return jsonResponse(getProductsPayload());
    }

    if (action === 'debugConfig') {
      return jsonResponse(getDebugConfig());
    }

    if (action === 'setup') {
      setupSheets();
      return jsonResponse({ status: 'ok', message: 'Feuilles preparees' });
    }

    return jsonResponse({
      status: 'ok',
      message: 'Flambeau API',
      actions: ['products', 'debugConfig', 'setup']
    });
  } catch (err) {
    return jsonResponse({ status: 'error', message: err.message });
  }
}

function doPost(e) {
  try {
    var data = parsePostData(e);
    var action = cleanText(data.action, 60);

    if (action === 'addProduct') {
      return jsonResponse(addProduct(data));
    }

    if (action === 'updateProduct') {
      return jsonResponse(updateProduct(data));
    }

    if (action === 'order') {
      return jsonResponse(handleOrder(data));
    }

    if (action === 'contact') {
      return jsonResponse(handleContact(data));
    }

    if (action === 'setup') {
      setupSheets();
      return jsonResponse({ status: 'ok', message: 'Feuilles preparees' });
    }

    return jsonResponse({ status: 'error', message: 'Action inconnue' });
  } catch (err) {
    return jsonResponse({ status: 'error', message: err.message });
  }
}

function getAction(e) {
  return e && e.parameter && e.parameter.action
    ? String(e.parameter.action).trim()
    : '';
}

function parsePostData(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error('Donnees POST manquantes');
  }

  try {
    return JSON.parse(e.postData.contents);
  } catch (err) {
    throw new Error('JSON invalide');
  }
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

// -------------------- Configuration --------------------

function getSpreadsheet() {
  var sheetId = getConfiguredSheetId();
  if (!sheetId) {
    throw new Error('SHEET_ID non configure dans Google Apps Script');
  }

  try {
    return SpreadsheetApp.openById(sheetId);
  } catch (err) {
    throw new Error('Impossible ouvrir Google Sheet ' + sheetId + ': ' + err.message);
  }
}

function getConfiguredSheetId() {
  var value = getScriptProperty('SHEET_ID')
    || getScriptProperty('GOOGLE_SHEET_ID')
    || getScriptProperty('SPREADSHEET_ID')
    || DEFAULT_SHEET_ID;

  var sheetId = extractSheetId(value);
  return sheetId === 'TON_GOOGLE_SHEET_ID_ICI' ? '' : sheetId;
}

function getConfiguredSheetIdSource() {
  if (getScriptProperty('SHEET_ID')) return 'SHEET_ID';
  if (getScriptProperty('GOOGLE_SHEET_ID')) return 'GOOGLE_SHEET_ID';
  if (getScriptProperty('SPREADSHEET_ID')) return 'SPREADSHEET_ID';
  return 'DEFAULT_SHEET_ID';
}

function getAdminPassword() {
  return cleanText(getScriptProperty('ADMIN_PASSWORD') || DEFAULT_ADMIN_PASSWORD, 120);
}

function getScriptProperty(name) {
  try {
    return PropertiesService.getScriptProperties().getProperty(name) || '';
  } catch (err) {
    return '';
  }
}

function extractSheetId(value) {
  var text = String(value || '').trim().replace(/^["']|["']$/g, '');
  if (!text) return '';

  if (/^SHEET_ID\s*=/i.test(text)) {
    text = text.split('=').slice(1).join('=').trim();
  }

  var urlMatch = text.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (urlMatch) return urlMatch[1];

  var idMatch = text.match(/[a-zA-Z0-9-_]{20,}/);
  return idMatch ? idMatch[0] : '';
}

function getDebugConfig() {
  var sheetId = getConfiguredSheetId();
  var payload = {
    status: sheetId ? 'ok' : 'error',
    sheetIdConfigured: Boolean(sheetId),
    sheetIdSource: getConfiguredSheetIdSource(),
    sheetIdPreview: sheetId ? sheetId.slice(0, 6) + '...' + sheetId.slice(-6) : '',
    spreadsheetOpen: false,
    message: ''
  };

  if (!sheetId) {
    payload.message = 'SHEET_ID absent dans Google Apps Script.';
    return payload;
  }

  try {
    SpreadsheetApp.openById(sheetId);
    payload.spreadsheetOpen = true;
    payload.message = 'Google Sheet accessible.';
  } catch (err) {
    payload.status = 'error';
    payload.message = 'SHEET_ID trouve mais feuille inaccessible: ' + err.message;
  }

  return payload;
}

// -------------------- Setup feuilles --------------------

function setupSheets() {
  var ss = getSpreadsheet();
  var productsSheet = ss.getSheetByName('Produits') || ss.insertSheet('Produits');
  var ordersSheet = ss.getSheetByName('Commandes') || ss.insertSheet('Commandes');

  ensureHeaders(productsSheet, PRODUCT_HEADERS);
  formatProductsSheet(productsSheet);

  ensureHeaders(ordersSheet, ORDER_HEADERS);
  formatOrdersSheet(ordersSheet);

  return ss;
}

function ensureHeaders(sheet, headers) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  } else {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  sheet.setFrozenRows(1);
}

function formatHeader(sheet, columnCount, background, textColor) {
  sheet.getRange(1, 1, 1, columnCount)
    .setBackground(background)
    .setFontColor(textColor)
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle')
    .setWrap(true);
  sheet.setRowHeight(1, 38);
}

function formatProductsSheet(sheet) {
  var widths = [130, 190, 130, 150, 90, 330, 260, 300, 100, 90, 330, 110];
  formatHeader(sheet, PRODUCT_HEADERS.length, '#2c211a', '#fff7e6');

  widths.forEach(function(width, index) {
    sheet.setColumnWidth(index + 1, width);
  });

  var dataRows = Math.max(sheet.getMaxRows() - 1, 1);
  sheet.getRange(2, 5, dataRows, 1).setNumberFormat('0.00');
  sheet.getRange(2, 10, dataRows, 1).setNumberFormat('0');
  sheet.getRange(2, 6, dataRows, 4).setWrap(true);
  sheet.getRange(2, 11, dataRows, 1).setWrap(true);
}

function formatOrdersSheet(sheet) {
  var widths = [150, 105, 85, 120, 130, 130, 130, 120, 260, 420, 260, 130, 110, 105, 110, 260];
  formatHeader(sheet, ORDER_HEADERS.length, '#2f6f55', '#ffffff');

  widths.forEach(function(width, index) {
    sheet.setColumnWidth(index + 1, width);
  });

  var dataRows = Math.max(sheet.getMaxRows() - 1, 1);
  sheet.getRange(2, 10, dataRows, 2).setWrap(true);
  sheet.getRange(2, 12, dataRows, 4).setNumberFormat('0.00');
  sheet.getRange(2, 12, dataRows, 4).setHorizontalAlignment('right');
}

// -------------------- Produits --------------------

function getProductsPayload() {
  var ss = setupSheets();
  var sheet = ss.getSheetByName('Produits');
  var rows = sheet.getDataRange().getValues();
  var products = [];

  for (var i = 1; i < rows.length; i += 1) {
    var row = rows[i];
    var id = cleanText(row[0], 80);
    var name = cleanText(row[1], 160);

    if (!id && !name) continue;

    products.push({
      id: id || ('P' + i),
      name: name,
      category: cleanCategory(row[2]),
      categoryLabel: cleanText(row[3], 80) || getCategoryLabel(row[2]),
      price: cleanNumber(row[4], 0, 100000),
      description: cleanText(row[5], 1000),
      notes: splitList(row[6]),
      fragrances: splitList(row[7]),
      weight: cleanText(row[8], 80),
      stock: cleanNumber(row[9], 0, 100000),
      image: cleanImage(row[10]),
      inStock: row[11] === false ? false : String(row[11]).toUpperCase() !== 'FALSE'
    });
  }

  return { status: 'ok', products: products };
}

function addProduct(data) {
  checkAdminPassword(data.password);

  var ss = setupSheets();
  var sheet = ss.getSheetByName('Produits');
  var product = validateProduct(data);
  var id = cleanText(data.id, 80) || ('P' + Date.now());
  var existingRow = findProductRow(sheet, id, product.name, product.category);

  if (existingRow > 1) {
    writeProductRow(sheet, existingRow, id, product);
    return { status: 'ok', type: 'product', id: id, updated: true };
  }

  sheet.appendRow(buildProductRow(id, product));
  formatProductsSheet(sheet);
  return { status: 'ok', type: 'product', id: id, created: true };
}

function updateProduct(data) {
  checkAdminPassword(data.password);

  var id = cleanText(data.id, 80);
  if (!id) throw new Error('ID produit manquant');

  var ss = setupSheets();
  var sheet = ss.getSheetByName('Produits');
  var product = validateProduct(data);
  var existingRow = findProductRow(sheet, id, product.name, product.category);

  if (existingRow > 1) {
    writeProductRow(sheet, existingRow, id, product);
    return { status: 'ok', type: 'product', id: id, updated: true };
  }

  sheet.appendRow(buildProductRow(id, product));
  formatProductsSheet(sheet);
  return { status: 'ok', type: 'product', id: id, created: true };
}

function checkAdminPassword(password) {
  if (cleanText(password, 120) !== getAdminPassword()) {
    throw new Error('Mot de passe incorrect');
  }
}

function validateProduct(data) {
  var category = cleanCategory(data.category);
  return {
    name: cleanText(data.name || data.nom, 160) || 'Produit',
    category: category,
    categoryLabel: cleanText(data.categoryLabel, 80) || getCategoryLabel(category),
    price: cleanNumber(data.price || data.prix, 0, 100000),
    description: cleanText(data.description, 1000),
    notes: normalizeListText(data.notes),
    fragrances: normalizeListText(data.fragrances || data.parfums),
    weight: cleanText(data.weight || data.poids, 80),
    stock: cleanNumber(data.stock, 0, 100000),
    image: cleanImage(data.image),
    inStock: data.inStock === false ? false : true
  };
}

function buildProductRow(id, product) {
  return [
    id,
    product.name,
    product.category,
    product.categoryLabel,
    product.price,
    product.description,
    product.notes,
    product.fragrances,
    product.weight,
    product.stock,
    product.image,
    product.inStock
  ];
}

function writeProductRow(sheet, rowNumber, id, product) {
  sheet.getRange(rowNumber, 1, 1, PRODUCT_HEADERS.length)
    .setValues([buildProductRow(id, product)]);
  formatProductsSheet(sheet);
}

function findProductRow(sheet, id, name, category) {
  var values = sheet.getDataRange().getValues();
  var cleanId = normalizeKey(id);
  var cleanName = normalizeKey(name);
  var cleanCategory = normalizeKey(category);

  for (var i = 1; i < values.length; i += 1) {
    var rowId = normalizeKey(values[i][0]);
    var rowName = normalizeKey(values[i][1]);
    var rowCategory = normalizeKey(values[i][2]);

    if (cleanId && rowId === cleanId) return i + 1;
    if (cleanName && cleanCategory && rowName === cleanName && rowCategory === cleanCategory) return i + 1;
  }

  return -1;
}

// -------------------- Commandes --------------------

function handleOrder(order) {
  var ss = setupSheets();
  var sheet = ss.getSheetByName('Commandes');
  var cleanOrder = validateOrder(order);
  var lock = LockService.getScriptLock();

  lock.waitLock(10000);
  try {
    sheet.appendRow(buildOrderRow(cleanOrder));
    var lastRow = sheet.getLastRow();
    sheet.getRange(lastRow, 10, 1, 2).setWrap(true);
    formatOrdersSheet(sheet);
  } finally {
    lock.releaseLock();
  }

  var emailStatus = 'skipped';
  try {
    sendOrderEmail(cleanOrder);
    emailStatus = 'sent';
  } catch (err) {
    emailStatus = 'error: ' + err.message;
    Logger.log(emailStatus);
  }

  return {
    status: 'ok',
    type: 'order',
    orderNum: cleanOrder.orderNum,
    sheet: 'saved',
    email: emailStatus
  };
}

function validateOrder(order) {
  if (!order || !Array.isArray(order.items) || order.items.length === 0) {
    throw new Error('Commande vide');
  }

  var now = new Date();
  var items = order.items.slice(0, MAX_ORDER_ITEMS).map(function(item) {
    var qty = cleanNumber(item.qty || item.quantity, 1, 1000);
    var price = cleanNumber(item.price || item.prix, 0, 100000);
    return {
      name: cleanText(item.name || item.nom, 160) || 'Produit',
      fragrance: cleanText(item.fragrance || item.parfum, 160),
      qty: qty,
      price: price,
      total: qty * price
    };
  });

  var quantityTotal = items.reduce(function(sum, item) {
    return sum + item.qty;
  }, 0);

  var subtotal = order.subtotal != null
    ? cleanNumber(order.subtotal, 0, 1000000)
    : items.reduce(function(sum, item) {
        return sum + item.total;
      }, 0);

  var livraison = order.livraison != null
    ? cleanNumber(order.livraison, 0, 1000000)
    : getDeliveryFee(order.ville || order.city, subtotal);

  var total = order.total != null
    ? cleanNumber(order.total, 0, 1000000)
    : subtotal + livraison;

  return {
    orderNum: cleanText(order.orderNum, 80) || ('FLB-' + Date.now()),
    date: Utilities.formatDate(now, TIMEZONE, 'dd/MM/yyyy'),
    heure: Utilities.formatDate(now, TIMEZONE, 'HH:mm'),
    status: cleanText(order.status || order.statut, 80) || 'Nouvelle',
    prenom: cleanText(order.prenom || order.firstName, 120),
    nom: cleanText(order.nom || order.lastName, 120),
    telephone: cleanText(order.telephone || order.phone, 60),
    ville: cleanText(order.ville || order.city, 120),
    adresse: cleanText(order.adresse || order.address, 260),
    notes: cleanText(order.notes || order.note || order.commentaire, 400),
    items: items,
    articles: formatOrderArticles(items),
    parfums: formatOrderFragrances(items),
    quantityTotal: quantityTotal,
    subtotal: subtotal,
    livraison: livraison,
    total: total
  };
}

function buildOrderRow(order) {
  return [
    order.orderNum,
    order.date,
    order.heure,
    order.status,
    order.prenom,
    order.nom,
    order.telephone,
    order.ville,
    order.adresse,
    order.articles,
    order.parfums,
    order.quantityTotal,
    order.subtotal,
    order.livraison,
    order.total,
    order.notes
  ];
}

function formatOrderArticles(items) {
  return items.map(function(item) {
    return item.name
      + (item.fragrance ? ' - Parfum : ' + item.fragrance : '')
      + ' x' + item.qty
      + ' | Prix : ' + formatPrice(item.price) + ' MAD'
      + ' | Total : ' + formatPrice(item.total) + ' MAD';
  }).join('\n');
}

function formatOrderFragrances(items) {
  return items.map(function(item) {
    return item.fragrance ? item.name + ' : ' + item.fragrance : '';
  }).filter(function(value) {
    return value;
  }).join('\n');
}

function sendOrderEmail(order) {
  if (!NOTIF_EMAIL) return;

  var body = [
    'Nouvelle commande : ' + order.orderNum,
    '',
    'Client : ' + order.prenom + ' ' + order.nom,
    'Telephone : ' + order.telephone,
    'Ville : ' + order.ville,
    'Adresse : ' + order.adresse,
    '',
    'Articles :',
    order.articles,
    '',
    'Sous-total : ' + formatPrice(order.subtotal) + ' MAD',
    'Livraison : ' + formatPrice(order.livraison) + ' MAD',
    'Total : ' + formatPrice(order.total) + ' MAD',
    '',
    'Notes : ' + order.notes
  ].join('\n');

  MailApp.sendEmail({
    to: NOTIF_EMAIL,
    subject: 'Nouvelle commande Flambeau - ' + order.orderNum,
    body: body
  });
}

// -------------------- Contact --------------------

function handleContact(contact) {
  var cleanContact = {
    prenom: cleanText(contact.prenom || contact.firstName, 80),
    nom: cleanText(contact.nom || contact.lastName, 80),
    email: cleanText(contact.email, 160),
    telephone: cleanText(contact.telephone || contact.phone, 60),
    sujet: cleanText(contact.sujet || contact.subject, 160),
    message: cleanText(contact.message, 2000)
  };

  if (!cleanContact.prenom || !cleanContact.nom || !cleanContact.message) {
    throw new Error('Contact incomplet');
  }

  if (NOTIF_EMAIL) {
    MailApp.sendEmail({
      to: NOTIF_EMAIL,
      subject: 'Message contact Flambeau - ' + (cleanContact.sujet || 'Nouveau message'),
      body: [
        'Nouveau message contact',
        '',
        'Nom : ' + cleanContact.prenom + ' ' + cleanContact.nom,
        'Email : ' + cleanContact.email,
        'Telephone : ' + cleanContact.telephone,
        'Sujet : ' + cleanContact.sujet,
        '',
        cleanContact.message
      ].join('\n')
    });
  }

  return { status: 'ok', type: 'contact', email: 'sent' };
}

// -------------------- Helpers --------------------

function cleanText(value, maxLength) {
  return String(value == null ? '' : value)
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength || 500);
}

function cleanNumber(value, min, max) {
  var number = Number(value);
  if (!isFinite(number)) number = min;
  if (number < min) number = min;
  if (number > max) number = max;
  return number;
}

function normalizeKey(value) {
  return removeAccents(cleanText(value, 300).toLowerCase())
    .replace(/\s+/g, ' ')
    .trim();
}

function removeAccents(value) {
  return String(value || '')
    .replace(/[àáâãäå]/g, 'a')
    .replace(/[ç]/g, 'c')
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[ñ]/g, 'n')
    .replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[ýÿ]/g, 'y');
}

function cleanCategory(value) {
  var category = normalizeKey(value).replace(/\s+/g, '-');
  var allowed = ['fondants', 'bougies', 'bakhour', 'diffuseurs', 'poudre-parfumee'];
  return allowed.indexOf(category) !== -1 ? category : 'bougies';
}

function getCategoryLabel(category) {
  var labels = {
    fondants: 'Fondants',
    bougies: 'Bougies',
    bakhour: 'Bakhour',
    diffuseurs: 'Diffuseurs',
    'poudre-parfumee': 'Poudre parfumee'
  };
  return labels[cleanCategory(category)] || 'Bougies';
}

function splitList(value) {
  if (Array.isArray(value)) {
    return value.map(function(item) {
      return cleanText(item, 160);
    }).filter(Boolean);
  }

  return String(value || '')
    .split(/[,;\n|]/)
    .map(function(item) {
      return cleanText(item, 160);
    })
    .filter(Boolean);
}

function normalizeListText(value) {
  return splitList(value).join(', ');
}

function cleanImage(value) {
  var image = cleanText(value, 500);
  if (/^https:\/\/[^\s"'<>]+$/i.test(image)) return image;
  if (/^imgs\/[-a-zA-Z0-9_./]+$/i.test(image)) return image;
  return 'imgs/aery-good-vibes-premium-scented-candle-packaging.jpg';
}

function getDeliveryFee(city, subtotal) {
  if (cleanNumber(subtotal, 0, 1000000) >= 500) return 0;
  return normalizeKey(city) === 'oujda' ? 15 : 30;
}

function formatPrice(value) {
  return (Math.round(cleanNumber(value, 0, 1000000) * 100) / 100).toFixed(2);
}
