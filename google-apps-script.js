    // ============================================================
    // FLAMBEAU â€” Google Apps Script
    // Produits + commandes Sheet/email + contact email
    // ============================================================

  var SHEET_ID = '1SI8I4j0FSsUJKd44pHApttKW9F2wCp3jXNviBuJfQ8c';
  var NOTIF_EMAIL = 'flambeaushop@gmail.com';
  var MAX_ORDER_ITEMS = 50;
  var MAX_TEXT_LENGTH = 500;

  // Fallback local. En production, utilisez une propriÃ©tÃ© Apps Script ADMIN_PASSWORD.
  var ADMIN_PASSWORD = 'FlambeauAdmin2026!';

    // ---------- GET : rÃ©cupÃ©rer les produits ----------
    function doGet(e) {
      var action = e && e.parameter && e.parameter.action ? e.parameter.action : null;

      try {
        if (action === 'products' || action === 'Produits') {
          return getProducts();
        }
      } catch (err) {
        return ContentService
          .createTextOutput(JSON.stringify({ status: 'error', message: err.message }))
          .setMimeType(ContentService.MimeType.JSON);
      }

      return ContentService
        .createTextOutput(JSON.stringify({ status: 'ok', message: 'Flambeau API' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // ---------- POST : commandes + ajout produit ----------
  function doPost(e) {
    try {
        if (!e || !e.postData || !e.postData.contents) {
          return ContentService
            .createTextOutput(JSON.stringify({ status: 'error', message: 'DonnÃ©es POST manquantes' }))
            .setMimeType(ContentService.MimeType.JSON);
        }

        var data = JSON.parse(e.postData.contents);

        if (data.action === 'addProduct') {
          return addProduct(data);
        }

        if (data.action === 'updateProduct') {
          return updateProduct(data);
        }

        if (data.action === 'order') {
          var sheetStatus = 'saved';
          try {
            sheetStatus = saveToSheet(data);
          } catch (sheetErr) {
            sheetStatus = 'error: ' + sheetErr.message;
            Logger.log('Erreur Google Sheet commande: ' + sheetErr.message);
          }

          var emailStatus = 'sent';

          try {
            sendEmailNotification(data);
          } catch (emailErr) {
            emailStatus = 'error: ' + emailErr.message;
            Logger.log('Erreur email commande: ' + emailErr.message);
          }

          return ContentService
            .createTextOutput(JSON.stringify({
              status: sheetStatus.indexOf('error:') === 0 || emailStatus.indexOf('error:') === 0 ? 'error' : 'ok',
              type: 'order',
              sheet: sheetStatus,
              email: emailStatus
            }))
            .setMimeType(ContentService.MimeType.JSON);
        }

        if (data.action === 'contact') {
          var contactEmailStatus = 'sent';
          try {
            sendContactEmailNotification(data);
          } catch (emailErr) {
            contactEmailStatus = 'error: ' + emailErr.message;
            Logger.log('Erreur email contact: ' + emailErr.message);
          }

          return ContentService
            .createTextOutput(JSON.stringify({
              status: contactEmailStatus.indexOf('error:') === 0 ? 'error' : 'ok',
              type: 'contact',
              email: contactEmailStatus
            }))
            .setMimeType(ContentService.MimeType.JSON);
        }

        return ContentService
          .createTextOutput(JSON.stringify({ status: 'error', message: 'Action inconnue' }))
          .setMimeType(ContentService.MimeType.JSON);

      } catch (err) {
        return ContentService
          .createTextOutput(JSON.stringify({ status: 'error', message: err.message }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }

    // ---------- PRODUITS ----------
    function getProducts() {
      var ss = getSpreadsheet();
      var sheet = ss ? ss.getSheetByName('Produits') : null;

      if (!sheet) {
        return ContentService
          .createTextOutput(JSON.stringify([]))
          .setMimeType(ContentService.MimeType.JSON);
      }

      var values = sheet.getDataRange().getValues();

      if (values.length <= 1) {
        return ContentService
          .createTextOutput(JSON.stringify([]))
          .setMimeType(ContentService.MimeType.JSON);
      }

      var headerRowIndex = findProductHeaderRow(values);

      if (headerRowIndex === -1) {
        return ContentService
          .createTextOutput(JSON.stringify([]))
          .setMimeType(ContentService.MimeType.JSON);
      }

      var headers = values[headerRowIndex];
      var Produits = [];

      for (var i = headerRowIndex + 1; i < values.length; i++) {
        var row = values[i];
        var product = {};

        for (var j = 0; j < headers.length; j++) {
          var key = String(headers[j] || '').trim();
          if (key) {
            product[key] = row[j];
          }
        }

        product.id = product.id || product.ID || product.Id || '';
        product.name = product.name || product.nom || product.Nom || '';
        product.category = product.category || product.categorie || product['catÃ©gorie'] || product.Category || 'bougies';
        product.categoryLabel = product.categoryLabel || product.CategoryLabel || product.category || 'Bougies';
        product.description = product.description || product.Description || '';
        product.notes = product.notes || product.Notes || '';
        product.fragrances = product.fragrances || product.Fragrances || '';
        product.weight = product.weight || product.poids || product.Poids || '';
        product.image = product.image || product.Image || product.imageUrl || product.url || '';
        product.price = Number(product.price || product.prix || product.Prix || 0);
        product.stock = Number(product.stock || product.Stock || 0);
        product.inStock = String(product.inStock).toUpperCase() !== 'FALSE';

        if (!product.id || !product.name || !product.image) {
          continue;
        }

        if (product.notes) {
          product.notes = String(product.notes).split(',').map(function(note) {
            return note.trim();
          });
        } else {
          product.notes = [];
        }

        if (product.fragrances) {
          product.fragrances = String(product.fragrances).split(',').map(function(fragrance) {
            return fragrance.trim();
          });
        } else {
          product.fragrances = [];
        }

        Produits.push(product);
      }

      return ContentService
        .createTextOutput(JSON.stringify(Produits))
        .setMimeType(ContentService.MimeType.JSON);
    }

    function findProductHeaderRow(values) {
      for (var i = 0; i < values.length; i++) {
        var normalized = values[i].map(function(cell) {
          return String(cell || '').trim().toLowerCase();
        });

        var hasId = normalized.indexOf('id') !== -1;
        var hasName = normalized.indexOf('name') !== -1 || normalized.indexOf('nom') !== -1;
        var hasPrice = normalized.indexOf('price') !== -1 || normalized.indexOf('prix') !== -1;
        var hasImage = normalized.indexOf('image') !== -1 || normalized.indexOf('imageurl') !== -1 || normalized.indexOf('url') !== -1;

        if (hasId && hasName && hasPrice && hasImage) {
          return i;
        }
      }

      return -1;
    }

    // Utility: return Spreadsheet or null with helpful check
    function getSpreadsheet() {
      if (!SHEET_ID || SHEET_ID === 'TON_GOOGLE_SHEET_ID_ICI') {
        return null;
      }

      try {
        var ss = SpreadsheetApp.openById(SHEET_ID);
        cleanupWorkbookSheets(ss);
        return ss;
      } catch (err) {
        return null;
      }
    }

  function openSpreadsheetOrThrow() {
    if (!SHEET_ID || SHEET_ID === 'TON_GOOGLE_SHEET_ID_ICI') {
      throw new Error('SHEET_ID non configure');
    }

    try {
      var ss = SpreadsheetApp.openById(SHEET_ID);
      cleanupWorkbookSheets(ss);
      return ss;
    } catch (err) {
      throw new Error('Impossible ouvrir Google Sheet ' + SHEET_ID + ': ' + err.message);
    }
  }

  function cleanupWorkbookSheets(ss) {
    var allowed = {
      Produits: true,
      Commandes: true
    };

    var produitsSheet = ss.getSheetByName('Produits') || ss.insertSheet('Produits');
    var commandesSheet = ss.getSheetByName('Commandes') || ss.insertSheet('Commandes');

    ensureProductSheetHeaders(produitsSheet);
    ensureOrderSheetHeaders(commandesSheet);

    ss.getSheets().forEach(function(sheet) {
      if (!allowed[sheet.getName()]) {
        try {
          ss.deleteSheet(sheet);
          Logger.log('Deleted extra sheet: ' + sheet.getName());
        } catch (err) {
          Logger.log('Could not delete extra sheet ' + sheet.getName() + ': ' + err.message);
        }
      }
    });
  }

  function addProduct(data) {
    if (data.password !== getAdminPassword()) {
        return ContentService
          .createTextOutput(JSON.stringify({ status: 'error', message: 'Mot de passe incorrect' }))
          .setMimeType(ContentService.MimeType.JSON);
      }

      var ss = getSpreadsheet();
      if (!ss) {
        return ContentService
          .createTextOutput(JSON.stringify({ status: 'error', message: 'SHEET_ID non configurÃ©' }))
          .setMimeType(ContentService.MimeType.JSON);
      }

    var sheet = ss.getSheetByName('Produits') || ss.insertSheet('Produits');
    var cleanProduct = validateProductInput(data);
    ensureProductSheetHeaders(sheet);

    var values = sheet.getDataRange().getValues();
    var headerRowIndex = findProductHeaderRow(values);
    var headers = values[headerRowIndex];
    var id = cleanText(data.id, 80) || 'P' + Date.now();
    var rowData = buildProductRowData(id, cleanProduct);
    var targetRow = findProductRowByIdOrIdentity(values, headers, headerRowIndex, id, cleanProduct);

    if (targetRow !== -1) {
      writeProductRow(sheet, headers, targetRow, rowData);
      return ContentService
        .createTextOutput(JSON.stringify({ status: 'ok', type: 'product', id: id, updated: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    sheet.appendRow(headers.map(function(header) {
      return getProductValueForHeader(rowData, header);
    }));

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok', type: 'product', id: id, created: true }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  function updateProduct(data) {
    if (data.password !== getAdminPassword()) {
      return ContentService
        .createTextOutput(JSON.stringify({ status: 'error', message: 'Mot de passe incorrect' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var id = cleanText(data.id, 80);
    if (!id) {
      return ContentService
        .createTextOutput(JSON.stringify({ status: 'error', message: 'ID produit manquant' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var ss = getSpreadsheet();
    if (!ss) {
      return ContentService
        .createTextOutput(JSON.stringify({ status: 'error', message: 'SHEET_ID non configurÃƒÂ©' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var sheet = ss.getSheetByName('Produits') || ss.insertSheet('Produits');
    ensureProductSheetHeaders(sheet);

    var values = sheet.getDataRange().getValues();
    var headerRowIndex = findProductHeaderRow(values);
    var headers = values[headerRowIndex];
    var idCol = findHeaderIndex(headers, ['id', 'ID', 'Id']);
    if (idCol === -1) {
      return ContentService
        .createTextOutput(JSON.stringify({ status: 'error', message: 'Colonne id introuvable dans la feuille Produits' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var cleanProduct = validateProductInput(data);
    var rowData = buildProductRowData(id, cleanProduct);
    var targetRow = findProductRowByIdOrIdentity(values, headers, headerRowIndex, id, cleanProduct);

    if (targetRow === -1) {
      sheet.appendRow(headers.map(function(header) {
        return getProductValueForHeader(rowData, header);
      }));

      return ContentService
        .createTextOutput(JSON.stringify({ status: 'ok', type: 'product', id: id, created: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    writeProductRow(sheet, headers, targetRow, rowData);

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok', type: 'product', id: id, updated: true }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  function ensureProductSheetHeaders(sheet) {
    var headers = [
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

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(headers);
    } else {
      var firstRow = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
      var hasHeader = firstRow.some(function(value) {
        return String(value || '').trim();
      });

      if (!hasHeader) {
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      }
    }

    formatProductSheet(sheet, headers.length);
  }

  function formatProductSheet(sheet, columnCount) {
    var lastRow = Math.max(sheet.getLastRow(), 1);
    var dataRows = Math.max(sheet.getMaxRows() - 1, 1);

    sheet.setFrozenRows(1);
    sheet.setFrozenColumns(2);

    sheet.getRange(1, 1, 1, columnCount)
      .setBackground('#2c211a')
      .setFontColor('#fff7e6')
      .setFontWeight('bold')
      .setHorizontalAlignment('center')
      .setVerticalAlignment('middle');

    sheet.setRowHeight(1, 34);

    var widths = [130, 190, 130, 150, 90, 330, 220, 300, 100, 90, 330, 110];
    widths.forEach(function(width, index) {
      sheet.setColumnWidth(index + 1, width);
    });

    sheet.getRange(1, 1, lastRow, columnCount)
      .setVerticalAlignment('middle');

    sheet.getRange(2, 1, dataRows, columnCount)
      .setFontColor('#2d2d2d');

    sheet.getRange(2, 5, dataRows, 1)
      .setNumberFormat('0.00');

    sheet.getRange(2, 10, dataRows, 1)
      .setNumberFormat('0');

    sheet.getRange(2, 6, dataRows, 4)
      .setWrap(true);

    sheet.getRange(2, 11, dataRows, 1)
      .setWrap(true);

    sheet.getRange(2, 5, dataRows, 1)
      .setHorizontalAlignment('right');

    sheet.getRange(2, 10, dataRows, 1)
      .setHorizontalAlignment('center');

    sheet.getRange(2, 12, dataRows, 1)
      .setHorizontalAlignment('center');

    applyProductValidations(sheet, dataRows);
    applyProductFilter(sheet, lastRow, columnCount);
  }

  function applyProductValidations(sheet, dataRows) {
    var categoryRule = SpreadsheetApp.newDataValidation()
      .requireValueInList(['fondants', 'bougies', 'bakhour', 'diffuseurs', 'poudre-parfumee'], true)
      .setAllowInvalid(false)
      .build();

    var inStockRule = SpreadsheetApp.newDataValidation()
      .requireValueInList(['TRUE', 'FALSE'], true)
      .setAllowInvalid(false)
      .build();

    sheet.getRange(2, 3, dataRows, 1).setDataValidation(categoryRule);
    sheet.getRange(2, 12, dataRows, 1).setDataValidation(inStockRule);
  }

  function applyProductFilter(sheet, lastRow, columnCount) {
    var filter = sheet.getFilter();
    var wantedRange = sheet.getRange(1, 1, lastRow, columnCount);

    if (filter) {
      var filterRange = filter.getRange();
      if (
        filterRange.getRow() === 1 &&
        filterRange.getColumn() === 1 &&
        filterRange.getNumRows() === lastRow &&
        filterRange.getNumColumns() === columnCount
      ) {
        return;
      }

      filter.remove();
    }

    wantedRange.createFilter();
  }

  function findHeaderIndex(headers, names) {
    var normalized = headers.map(function(header) {
      return String(header || '').trim();
    });

    for (var i = 0; i < names.length; i++) {
      var index = normalized.indexOf(names[i]);
      if (index !== -1) return index;
    }

    return -1;
  }

  function normalizeProductKeyPart(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  function productIdentityKey(category, name) {
    var cleanCategory = normalizeProductKeyPart(category);
    var cleanName = normalizeProductKeyPart(name);
    return cleanCategory && cleanName ? cleanCategory + '::' + cleanName : '';
  }

  function buildProductRowData(id, cleanProduct) {
    return {
      id: id,
      name: cleanProduct.name,
      category: cleanProduct.category,
      categoryLabel: cleanProduct.categoryLabel,
      price: cleanProduct.price,
      description: cleanProduct.description,
      notes: cleanProduct.notes,
      fragrances: cleanProduct.fragrances,
      weight: cleanProduct.weight,
      stock: cleanProduct.stock,
      image: cleanProduct.image,
      inStock: cleanProduct.inStock ? 'TRUE' : 'FALSE'
    };
  }

  function findProductRowByIdOrIdentity(values, headers, headerRowIndex, id, cleanProduct) {
    var idCol = findHeaderIndex(headers, ['id', 'ID', 'Id']);
    var nameCol = findHeaderIndex(headers, ['name', 'nom', 'Nom', 'Name']);
    var categoryCol = findHeaderIndex(headers, ['category', 'categorie', 'catÃƒÂ©gorie', 'Category']);
    var wantedKey = productIdentityKey(cleanProduct.category, cleanProduct.name);

    for (var i = headerRowIndex + 1; i < values.length; i++) {
      if (idCol !== -1 && String(values[i][idCol] || '').trim() === id) {
        return i + 1;
      }

      if (nameCol !== -1 && categoryCol !== -1 && wantedKey) {
        var rowKey = productIdentityKey(values[i][categoryCol], values[i][nameCol]);
        if (rowKey === wantedKey) {
          return i + 1;
        }
      }
    }

    return -1;
  }

  function writeProductRow(sheet, headers, targetRow, rowData) {
    headers.forEach(function(header, index) {
      sheet.getRange(targetRow, index + 1).setValue(getProductValueForHeader(rowData, header));
    });
  }

  function getProductValueForHeader(rowData, header) {
    var key = String(header || '').trim();
    var normalized = key.toLowerCase();
    var aliases = {
      id: 'id',
      name: 'name',
      nom: 'name',
      category: 'category',
      categorie: 'category',
      'catÃƒÂ©gorie': 'category',
      categorylabel: 'categoryLabel',
      price: 'price',
      prix: 'price',
      description: 'description',
      notes: 'notes',
      fragrances: 'fragrances',
      parfums: 'fragrances',
      weight: 'weight',
      poids: 'weight',
      stock: 'stock',
      image: 'image',
      imageurl: 'image',
      url: 'image',
      instock: 'inStock',
      disponible: 'inStock'
    };
    var dataKey = aliases[normalized] || key;
    return rowData.hasOwnProperty(dataKey) ? rowData[dataKey] : '';
  }

  function getAdminPassword() {
    try {
      return PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD') || ADMIN_PASSWORD;
    } catch(e) {
      return ADMIN_PASSWORD;
    }
  }

  function validateProductInput(data) {
    var labels = {
      fondants: 'Fondants',
      bougies: 'Bougies',
      bakhour: 'Bakhour',
      diffuseurs: 'Diffuseurs',
      'poudre-parfumee': 'Poudre parfumÃ©e'
    };

    var category = cleanCategory(data.category);
    var image = cleanImage(data.image);

    if (!cleanText(data.name, 120)) {
      throw new Error('Nom produit obligatoire');
    }

    if (!image) {
      throw new Error('Image invalide');
    }

    return {
      name: cleanText(data.name, 120),
      category: category,
      categoryLabel: labels[category] || 'Bougies',
      price: cleanNumber(data.price, 0, 100000),
      description: cleanText(data.description, MAX_TEXT_LENGTH),
      notes: cleanText(data.notes, 200),
      fragrances: cleanText(data.fragrances, 1000),
      weight: cleanText(data.weight, 80),
      stock: cleanNumber(data.stock, 0, 100000),
      image: image,
      inStock: data.inStock === false ? false : true
    };
  }

    // ---------- COMMANDES ----------
  function saveToSheet(order) {
    var ss = openSpreadsheetOrThrow();

    var cleanOrder = validateOrderInput(order);
    var lock = LockService.getScriptLock();
    lock.waitLock(10000);

    try {
      var commandesSheet = ss.getSheetByName('Commandes') || ss.insertSheet('Commandes');
      ensureOrderSheetHeaders(commandesSheet);

      commandesSheet.appendRow([
        cleanOrder.orderNum,
        cleanOrder.date,
        cleanOrder.heure,
        cleanOrder.status,
        cleanOrder.prenom,
        cleanOrder.nom,
        cleanOrder.telephone,
        cleanOrder.ville,
        cleanOrder.adresse,
        cleanOrder.articlesSummary,
        cleanOrder.fragrancesSummary,
        cleanOrder.quantityTotal,
        cleanOrder.subtotal,
        cleanOrder.livraison,
        cleanOrder.total,
        cleanOrder.notes
      ]);

      SpreadsheetApp.flush();
      var commandesLastRow = commandesSheet.getLastRow();
      commandesSheet.getRange(commandesLastRow, 10, 1, 2).setWrap(true);
      commandesSheet.autoResizeColumns(1, 16);
      return 'saved: Commandes row ' + commandesLastRow;
    } finally {
      lock.releaseLock();
    }
  }

  function ensureOrderSheetHeaders(sheet) {
    var headers = [
      'N° Commande',
      'Date',
      'Heure',
      'Statut',
      'Prénom',
      'Nom',
      'Téléphone',
      'Ville',
      'Adresse',
      'Articles',
      'Parfums',
      'Quantité totale',
      'Sous-total',
      'Livraison',
      'Total',
      'Notes'
    ];

    ensureSheetHeaders(sheet, headers);
  }

  function ensureSheetHeaders(sheet, headers) {
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(headers);
    } else {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }

    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  function validateOrderInput(order) {
    if (!order || !Array.isArray(order.items) || order.items.length === 0) {
      throw new Error('Commande vide');
    }

    var now = new Date();
    var date = Utilities.formatDate(now, 'Africa/Casablanca', 'dd/MM/yyyy');
    var heure = Utilities.formatDate(now, 'Africa/Casablanca', 'HH:mm');

    var items = order.items.slice(0, MAX_ORDER_ITEMS).map(function(item) {
      var qty = cleanNumber(item.quantity || item.qty, 1, 1000);
      var price = cleanNumber(item.price, 0, 100000);
      return {
        name: cleanText(item.name, 120) || 'Produit',
        fragrance: cleanText(item.fragrance || item.parfum, 120),
        price: price,
        qty: qty,
        lineTotal: qty * price
      };
    });

    var quantityTotal = items.reduce(function(total, item) {
      return total + item.qty;
    }, 0);

    var subtotal = order.subtotal != null
      ? cleanNumber(order.subtotal, 0, 1000000)
      : items.reduce(function(total, item) {
          return total + item.lineTotal;
        }, 0);

    var livraison = getDeliveryFee(order.ville || order.city, subtotal);
    var total = subtotal + livraison;

    var articlesSummary = items.map(function(item) {
      return item.name + ' x' + item.qty;
    }).join(' | ');

    var fragrancesSummary = items.map(function(item) {
      return item.fragrance ? item.name + ' : ' + item.fragrance : '';
    }).filter(function(value) {
      return value;
    }).join(' | ');

    return {
      orderNum: cleanText(order.orderNum, 80) || ('FLB-' + Date.now()),
      date: date,
      heure: heure,
      status: cleanText(order.status || order.statut, 80) || 'Nouvelle',
      prenom: cleanText(order.prenom || order.firstName, 120),
      nom: cleanText(order.nom || order.lastName, 120),
      telephone: cleanText(order.telephone || order.phone, 40),
      ville: cleanText(order.ville || order.city, 120),
      codePostal: cleanText(order.codePostal || order.postalCode, 40),
      adresse: cleanText(order.adresse || order.address, 200),
      items: items,
      articlesSummary: articlesSummary,
      fragrancesSummary: fragrancesSummary,
      quantityTotal: quantityTotal,
      subtotal: subtotal,
      livraison: livraison,
      total: total,
      notes: cleanText(order.notes || order.note || order.commentaire, 300)
    };
  }

    // ---------- EMAIL ----------
  function sendEmailNotification(order) {
    var cleanOrder = validateOrderInput(order);
    var itemsText = cleanOrder.items.map(function(i) {
      return i.name + (i.fragrance ? ' - Parfum : ' + i.fragrance : '') + ' Ã—' + i.qty + ' = ' + (i.price * i.qty) + ' MAD';
    }).join('\n');

    if (!NOTIF_EMAIL) return;

    var subject = 'Nouvelle commande Flambeau â€” ' + (cleanOrder.orderNum || 'N/A');
    var plainBody = 'Nouvelle commande : ' + (cleanOrder.orderNum || '') + '\n' + itemsText + '\n\nTotal : ' + (cleanOrder.total || 0);

    // Build HTML email similar to confirmation page
    var htmlItems = cleanOrder.items.map(function(i) {
      return '<tr>' +
        '<td style="padding:12px 10px;border-bottom:1px solid #eee;font-size:15px;color:#333">' + escapeHtml(i.name + (i.fragrance ? ' - Parfum : ' + i.fragrance : '')) + '</td>' +
        '<td style="padding:12px 10px;border-bottom:1px solid #eee;text-align:center;font-size:15px;color:#333">' + i.qty + '</td>' +
        '<td style="padding:12px 10px;border-bottom:1px solid #eee;text-align:right;font-size:15px;color:#333">' + formatPrice(i.price * i.qty) + ' MAD</td>' +
      '</tr>';
    }).join('');

    var htmlBody = '<div style="font-family:Georgia, Times New Roman, serif; color:#222; max-width:680px; margin:0 auto; padding:20px; background:#fff">' +
      '<div style="text-align:center; padding-bottom:12px">' +
        '<h1 style="margin:0;font-size:32px;letter-spacing:6px;color:#222">FLAMBEAU</h1>' +
        '<div style="height:4px;width:160px;background:#d4af37;margin:12px auto 0;border-radius:2px"></div>' +
      '</div>' +
      '<div style="padding:18px 10px 0 10px">' +
        '<h2 style="font-size:20px;color:#333;margin:6px 0 4px">Nouvelle commande : <span style="color:#b8956e">' + escapeHtml(cleanOrder.orderNum) + '</span></h2>' +
        '<table style="width:100%;margin-top:8px;border-collapse:collapse">' +
          '<tr>' +
            '<td style="vertical-align:top;padding:6px 8px;color:#666;width:45%">' +
              '<div style="margin-bottom:8px"><strong style="display:block;color:#444">Date</strong>' + escapeHtml(cleanOrder.date) + '</div>' +
              '<div style="margin-bottom:8px"><strong style="display:block;color:#444">Client</strong>' + escapeHtml((cleanOrder.prenom || '') + ' ' + (cleanOrder.nom || '')) + '</div>' +
              '<div style="margin-bottom:8px"><strong style="display:block;color:#444">TÃ©lÃ©phone</strong>' + escapeHtml(cleanOrder.telephone || '') + '</div>' +
              '<div style="margin-bottom:8px"><strong style="display:block;color:#444">Adresse</strong>' + escapeHtml((cleanOrder.adresse || '') + (cleanOrder.codePostal ? ', ' + escapeHtml(cleanOrder.codePostal) : '') + (cleanOrder.ville ? ', ' + escapeHtml(cleanOrder.ville) : '')) + '</div>' +
            '</td>' +
            '<td style="vertical-align:top;padding:6px 8px;width:55%">' +
              '<table style="width:100%;border-collapse:collapse;background:#fafafa;border:1px solid #eee">' +
                '<thead>' +
                  '<tr style="background:#333;color:#fff">' +
                    '<th style="text-align:left;padding:10px 12px;font-weight:600">Produit</th>' +
                    '<th style="text-align:center;padding:10px 12px;font-weight:600">QtÃ©</th>' +
                    '<th style="text-align:right;padding:10px 12px;font-weight:600">Prix</th>' +
                  '</tr>' +
                '</thead>' +
                '<tbody>' + htmlItems + '</tbody>' +
              '</table>' +
              '<div style="text-align:right;padding-top:12px;font-size:20px;color:#b8956e;font-weight:700">Total : ' + formatPrice(cleanOrder.total) + ' MAD</div>' +
            '</td>' +
          '</tr>' +
        '</table>' +
      '</div>' +
      '<div style="text-align:center;color:#999;font-size:12px;margin-top:18px;padding-top:12px;border-top:1px solid #f0f0f0">Flambeau Â· Boutique en ligne Â· 2026</div>' +
    '</div>';

    // Try MailApp first (supports htmlBody), then GmailApp, and always log result
    try {
      MailApp.sendEmail({
        to: NOTIF_EMAIL,
        subject: subject,
        htmlBody: htmlBody,
        body: plainBody
      });
      Logger.log('Email status: sent_html_mailapp - ' + cleanOrder.orderNum);
    } catch (errMail) {
      try {
        GmailApp.sendEmail(NOTIF_EMAIL, subject, plainBody, { htmlBody: htmlBody });
        Logger.log('Email status: sent_html_gmail_fallback - ' + cleanOrder.orderNum + ' - fallback reason: ' + errMail.message);
      } catch (errGmail) {
        Logger.log('Email status: failed - ' + cleanOrder.orderNum + ' - ' + (errGmail.message || errMail.message));
        Logger.log('Email sending failed: ' + (errGmail.message || errMail.message));
        throw new Error(errGmail.message || errMail.message);
      }
    }
  }

  function cleanText(value, maxLength) {
    return String(value || '')
      .replace(/[\u0000-\u001F\u007F]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, maxLength || MAX_TEXT_LENGTH);
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatPrice(value) {
    var n = Number(value || 0);
    if (!isFinite(n)) n = 0;
    return n.toFixed(2);
  }

  function cleanNumber(value, min, max) {
    var num = Number(value || 0);
    if (!isFinite(num)) num = min || 0;
    if (num < min) num = min;
    if (num > max) num = max;
    return num;
  }

  function cleanCategory(value) {
    var category = cleanText(value, 40).toLowerCase();
    var allowed = ['fondants', 'bougies', 'bakhour', 'diffuseurs', 'poudre-parfumee'];
    return allowed.indexOf(category) === -1 ? 'bougies' : category;
  }

  function normalizeCityName(value) {
    return cleanText(value, 120)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  function getDeliveryFee(city, subtotal) {
    if (cleanNumber(subtotal, 0, 1000000) >= 500) return 0;
    return normalizeCityName(city) === 'oujda' ? 15 : 30;
  }

  function cleanImage(value) {
    var image = cleanText(value, 300);
    if (/^imgs\/[-a-zA-Z0-9_./]+$/.test(image)) return image;
    if (/^https:\/\/[^\s"'<>]+$/i.test(image)) return image;
    return '';
  }

  // ---------- TEST / DEBUG ----------
  // ExÃ©cuter `testSendEmail()` depuis l'Ã©diteur Apps Script pour forcer l'envoi
  function testSendEmail() {
    var order = {
      orderNum: 'TEST-' + Date.now(),
      prenom: 'Test',
      nom: 'Email',
      telephone: '000000000',
      ville: 'Testville',
      adresse: 'Adresse de test',
      items: [{ name: 'Produit test', price: 1, qty: 1 }],
      total: 1
    };

    try {
      sendEmailNotification(order);
      return ContentService
        .createTextOutput(JSON.stringify({ status: 'ok', message: 'order email sent' }))
        .setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
      return ContentService
        .createTextOutput(JSON.stringify({ status: 'error', message: err.message }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  function testContactEmail() {
    var contact = {
      prenom: 'Test',
      nom: 'Contact',
      email: 'test@example.com',
      telephone: '0600000000',
      sujet: 'Test contact Flambeau',
      message: 'Test direct pour verifier email contact seulement.'
    };

    try {
      sendContactEmailNotification(contact);
      return ContentService
        .createTextOutput(JSON.stringify({ status: 'ok', message: 'contact email sent' }))
        .setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
      return ContentService
        .createTextOutput(JSON.stringify({ status: 'error', message: err.message }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  // ---------- CONTACT EMAIL ----------
  function validateContactInput(contact) {
    return {
      prenom: cleanText(contact.prenom, 50),
      nom: cleanText(contact.nom, 50),
      email: cleanText(contact.email, 100),
      telephone: cleanText(contact.telephone, 20),
      sujet: cleanText(contact.sujet, 100),
      message: cleanText(contact.message, 2000)
    };
  }

  function sendContactEmailNotification(contact) {
    var cleanContact = validateContactInput(contact);

    if (!NOTIF_EMAIL) return;

    var subject = 'Nouveau message Flambeau â€” ' + cleanContact.sujet;
    var plainBody = 'De : ' + cleanContact.prenom + ' ' + cleanContact.nom + ' (' + cleanContact.email + ')' +
      '\nSujet : ' + cleanContact.sujet +
      '\n\nMessage :\n' + cleanContact.message +
      (cleanContact.telephone ? '\n\nTÃ©lÃ©phone : ' + cleanContact.telephone : '');

    var htmlBody = '<div style="font-family:Georgia, Times New Roman, serif; color:#222; max-width:680px; margin:0 auto; padding:20px; background:#fff">' +
      '<div style="text-align:center; padding-bottom:12px">' +
        '<h1 style="margin:0;font-size:32px;letter-spacing:6px;color:#222">FLAMBEAU</h1>' +
        '<div style="height:4px;width:160px;background:#d4af37;margin:12px auto 0;border-radius:2px"></div>' +
      '</div>' +
      '<div style="padding:18px 10px 0 10px">' +
        '<h2 style="font-size:20px;color:#333;margin:6px 0 4px">Nouveau message</h2>' +
        '<table style="width:100%;margin-top:8px;border-collapse:collapse">' +
          '<tr>' +
            '<td style="padding:8px;border-bottom:1px solid #eee"><strong>De :</strong></td>' +
            '<td style="padding:8px;border-bottom:1px solid #eee">' + escapeHtml(cleanContact.prenom + ' ' + cleanContact.nom) + '</td>' +
          '</tr>' +
          '<tr>' +
            '<td style="padding:8px;border-bottom:1px solid #eee"><strong>Email :</strong></td>' +
            '<td style="padding:8px;border-bottom:1px solid #eee">' + escapeHtml(cleanContact.email) + '</td>' +
          '</tr>' +
          (cleanContact.telephone ? '<tr>' +
            '<td style="padding:8px;border-bottom:1px solid #eee"><strong>TÃ©lÃ©phone :</strong></td>' +
            '<td style="padding:8px;border-bottom:1px solid #eee">' + escapeHtml(cleanContact.telephone) + '</td>' +
          '</tr>' : '') +
          '<tr>' +
            '<td style="padding:8px;border-bottom:1px solid #eee"><strong>Sujet :</strong></td>' +
            '<td style="padding:8px;border-bottom:1px solid #eee"><strong style="color:#b8956e">' + escapeHtml(cleanContact.sujet) + '</strong></td>' +
          '</tr>' +
        '</table>' +
        '<div style="margin-top:16px;padding:12px;background:#f9f9f9;border-left:4px solid #d4af37">' +
          '<p style="margin:0;white-space:pre-wrap;line-height:1.6">' + escapeHtml(cleanContact.message) + '</p>' +
        '</div>' +
      '</div>' +
      '<div style="text-align:center;color:#999;font-size:12px;margin-top:18px;padding-top:12px;border-top:1px solid #f0f0f0">Flambeau Â· Boutique en ligne Â· 2026</div>' +
    '</div>';

    try {
      MailApp.sendEmail({
        to: NOTIF_EMAIL,
        subject: subject,
        htmlBody: htmlBody,
        body: plainBody
      });
      Logger.log('Contact email sent: ' + cleanContact.email);
    } catch (errMail) {
      try {
        GmailApp.sendEmail(NOTIF_EMAIL, subject, plainBody, { htmlBody: htmlBody });
        Logger.log('Contact email sent via Gmail: ' + cleanContact.email);
      } catch (errGmail) {
        Logger.log('Contact email failed: ' + (errGmail.message || errMail.message));
        throw new Error(errGmail.message || errMail.message);
      }
    }
  }
