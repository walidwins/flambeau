    // ============================================================
    // FLAMBEAU — Google Apps Script
    // Produits + commandes Sheet/email + contact email
    // ============================================================

  var SHEET_ID = '1SI8I4j0FSsUJKd44pHApttKW9F2wCp3jXNviBuJfQ8c';
  var NOTIF_EMAIL = 'flambeaushop@gmail.com';
  var MAX_ORDER_ITEMS = 50;
  var MAX_TEXT_LENGTH = 500;

  // Fallback local. En production, utilisez une propriété Apps Script ADMIN_PASSWORD.
  var ADMIN_PASSWORD = 'FlambeauAdmin2026!';

    // ---------- GET : récupérer les produits ----------
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
            .createTextOutput(JSON.stringify({ status: 'error', message: 'Données POST manquantes' }))
            .setMimeType(ContentService.MimeType.JSON);
        }

        var data = JSON.parse(e.postData.contents);

        if (data.action === 'addProduct') {
          return addProduct(data);
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
        product.category = product.category || product.categorie || product.catégorie || product.Category || 'bougies';
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
        return SpreadsheetApp.openById(SHEET_ID);
      } catch (err) {
        return null;
      }
    }

  function openSpreadsheetOrThrow() {
    if (!SHEET_ID || SHEET_ID === 'TON_GOOGLE_SHEET_ID_ICI') {
      throw new Error('SHEET_ID non configure');
    }

    try {
      return SpreadsheetApp.openById(SHEET_ID);
    } catch (err) {
      throw new Error('Impossible ouvrir Google Sheet ' + SHEET_ID + ': ' + err.message);
    }
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
          .createTextOutput(JSON.stringify({ status: 'error', message: 'SHEET_ID non configuré' }))
          .setMimeType(ContentService.MimeType.JSON);
      }

    var sheet = ss.getSheetByName('Produits') || ss.insertSheet('Produits');
    var cleanProduct = validateProductInput(data);

    if (sheet.getLastRow() === 0) {
        sheet.appendRow([
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
        ]);
      }

      var id = 'P' + Date.now();

    sheet.appendRow([
      id,
      cleanProduct.name,
      cleanProduct.category,
      cleanProduct.categoryLabel,
      cleanProduct.price,
      cleanProduct.description,
      cleanProduct.notes,
      cleanProduct.fragrances,
      cleanProduct.weight,
      cleanProduct.stock,
      cleanProduct.image,
      cleanProduct.inStock ? 'TRUE' : 'FALSE'
    ]);

      return ContentService
        .createTextOutput(JSON.stringify({ status: 'ok', type: 'product', id: id }))
        .setMimeType(ContentService.MimeType.JSON);
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
      'poudre-parfumee': 'Poudre parfumée'
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
      var sheet = ss.getSheetByName('Commandes') || ss.insertSheet('Commandes');
      ensureOrderSheetHeaders(sheet);

      var itemsStr = cleanOrder.items.map(function(i) {
        return formatOrderItemForSheet(i);
      }).join('\n');

      var parfumsStr = cleanOrder.items.map(function(i) {
        return i.fragrance ? i.name + ' : ' + i.fragrance : '';
      }).filter(function(value) {
        return value;
      }).join('\n');

      sheet.appendRow([
        cleanOrder.orderNum,
        cleanOrder.date,
        cleanOrder.prenom,
        cleanOrder.nom,
        cleanOrder.telephone,
        cleanOrder.ville,
        cleanOrder.codePostal,
        cleanOrder.adresse,
        itemsStr,
        parfumsStr,
        cleanOrder.total
      ]);

      SpreadsheetApp.flush();
      var lastRow = sheet.getLastRow();
      sheet.getRange(lastRow, 9, 1, 2).setWrap(true);
      sheet.autoResizeColumns(1, 11);
      return 'saved: Commandes row ' + lastRow;
    } finally {
      lock.releaseLock();
    }
  }

  function ensureOrderSheetHeaders(sheet) {
    var headers = [
      'N° Commande',
      'Date',
      'Prénom',
      'Nom',
      'Téléphone',
      'Ville',
      'Code Postal',
      'Adresse',
      'Articles détaillés',
      'Parfums',
      'Total'
    ];

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(headers);
    } else {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }

    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  function formatOrderItemForSheet(item) {
    var total = cleanNumber(item.price, 0, 100000) * cleanNumber(item.qty, 1, 1000);
    return item.name
      + (item.fragrance ? ' - Parfum : ' + item.fragrance : '')
      + ' x' + item.qty
      + ' | Prix : ' + formatPrice(item.price) + ' MAD'
      + ' | Total : ' + formatPrice(total) + ' MAD';
  }
  function validateOrderInput(order) {
    if (!order || !Array.isArray(order.items) || order.items.length === 0) {
      throw new Error('Commande vide');
    }

    var items = order.items.slice(0, MAX_ORDER_ITEMS).map(function(item) {
      return {
        name: cleanText(item.name, 120) || 'Produit',
        fragrance: cleanText(item.fragrance || item.parfum, 120),
        price: cleanNumber(item.price, 0, 100000),
        qty: cleanNumber(item.qty, 1, 1000)
      };
    });

    return {
      orderNum: cleanText(order.orderNum, 80) || ('FLB-' + Date.now()),
      date: cleanText(order.date, 80) || new Date().toLocaleString('fr-FR'),
      prenom: cleanText(order.prenom, 120),
      nom: cleanText(order.nom, 120),
      telephone: cleanText(order.telephone, 40),
      ville: cleanText(order.ville, 120),
      codePostal: cleanText(order.codePostal, 40),
      adresse: cleanText(order.adresse, 200),
      items: items,
      total: cleanNumber(order.total, 0, 1000000)
    };
  }

    // ---------- EMAIL ----------
  function sendEmailNotification(order) {
    var cleanOrder = validateOrderInput(order);
    var itemsText = cleanOrder.items.map(function(i) {
      return i.name + (i.fragrance ? ' - Parfum : ' + i.fragrance : '') + ' ×' + i.qty + ' = ' + (i.price * i.qty) + ' MAD';
    }).join('\n');

    if (!NOTIF_EMAIL) return;

    var subject = 'Nouvelle commande Flambeau — ' + (cleanOrder.orderNum || 'N/A');
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
              '<div style="margin-bottom:8px"><strong style="display:block;color:#444">Téléphone</strong>' + escapeHtml(cleanOrder.telephone || '') + '</div>' +
              '<div style="margin-bottom:8px"><strong style="display:block;color:#444">Adresse</strong>' + escapeHtml((cleanOrder.adresse || '') + (cleanOrder.codePostal ? ', ' + escapeHtml(cleanOrder.codePostal) : '') + (cleanOrder.ville ? ', ' + escapeHtml(cleanOrder.ville) : '')) + '</div>' +
            '</td>' +
            '<td style="vertical-align:top;padding:6px 8px;width:55%">' +
              '<table style="width:100%;border-collapse:collapse;background:#fafafa;border:1px solid #eee">' +
                '<thead>' +
                  '<tr style="background:#333;color:#fff">' +
                    '<th style="text-align:left;padding:10px 12px;font-weight:600">Produit</th>' +
                    '<th style="text-align:center;padding:10px 12px;font-weight:600">Qté</th>' +
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
      '<div style="text-align:center;color:#999;font-size:12px;margin-top:18px;padding-top:12px;border-top:1px solid #f0f0f0">Flambeau · Boutique en ligne · 2026</div>' +
    '</div>';

    // Try MailApp first (supports htmlBody), then GmailApp, and always log result
    try {
      MailApp.sendEmail({
        to: NOTIF_EMAIL,
        subject: subject,
        htmlBody: htmlBody,
        body: plainBody
      });
      logEmailStatus(cleanOrder, 'sent_html_mailapp', null);
    } catch (errMail) {
      try {
        GmailApp.sendEmail(NOTIF_EMAIL, subject, plainBody, { htmlBody: htmlBody });
        logEmailStatus(cleanOrder, 'sent_html_gmail_fallback', errMail.message);
      } catch (errGmail) {
        logEmailStatus(cleanOrder, 'failed', (errGmail.message || errMail.message));
        Logger.log('Email sending failed: ' + (errGmail.message || errMail.message));
        throw new Error(errGmail.message || errMail.message);
      }
    }
  }

  function logEmailStatus(order, status, errorMessage) {
    var ss = getSpreadsheet();
    var now = new Date();
    var row = [now.toISOString(), order.orderNum || '', status, errorMessage || ''];

    if (ss) {
      var sheet = ss.getSheetByName('EmailLogs') || ss.insertSheet('EmailLogs');
      if (sheet.getLastRow() === 0) {
        sheet.appendRow(['Timestamp', 'OrderNum', 'Status', 'Error']);
      }
      sheet.appendRow(row);
    } else {
      Logger.log('EmailLog: ' + JSON.stringify(row));
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

  function cleanImage(value) {
    var image = cleanText(value, 300);
    if (/^imgs\/[-a-zA-Z0-9_./]+$/.test(image)) return image;
    if (/^https:\/\/[^\s"'<>]+$/i.test(image)) return image;
    return '';
  }

  // ---------- TEST / DEBUG ----------
  // Exécuter `testSendEmail()` depuis l'éditeur Apps Script pour forcer l'envoi
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

    var subject = 'Nouveau message Flambeau — ' + cleanContact.sujet;
    var plainBody = 'De : ' + cleanContact.prenom + ' ' + cleanContact.nom + ' (' + cleanContact.email + ')' +
      '\nSujet : ' + cleanContact.sujet +
      '\n\nMessage :\n' + cleanContact.message +
      (cleanContact.telephone ? '\n\nTéléphone : ' + cleanContact.telephone : '');

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
            '<td style="padding:8px;border-bottom:1px solid #eee"><strong>Téléphone :</strong></td>' +
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
      '<div style="text-align:center;color:#999;font-size:12px;margin-top:18px;padding-top:12px;border-top:1px solid #f0f0f0">Flambeau · Boutique en ligne · 2026</div>' +
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
