/**
 * IHS Music — ACTE IV
 * API Google Apps Script (Web App) pour les inscriptions.
 *
 * Déploiement recommandé :
 *   Exécuter en tant que : Moi
 *   Qui a accès : Tout le monde
 *
 * Le frontend n'accède jamais au Sheet directement.
 */

var SHEET_NAME = "Inscriptions";
var HEADERS = [
  "Code",
  "Nom complet",
  "Téléphone",
  "Email",
  "Attentes",
  "QR Code/identifiant",
  "Présent",
  "Date d'inscription",
  "Heure d'entrée",
];

var COL = {
  CODE: 1,
  NOM: 2,
  TEL: 3,
  EMAIL: 4,
  ATTENTES: 5,
  QR: 6,
  PRESENT: 7,
  DATE: 8,
  ENTREE: 9,
};

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

function doGet(e) {
  try {
    var p = e && e.parameter ? e.parameter : {};
    var action = p.action || "lookup";
    if (action === "lookup") return json_(lookup_(p.code || ""));
    if (action === "list") return json_(list_());
    if (action === "search") return json_(search_(p.q || ""));
    return json_({ ok: false, error: "Action inconnue." });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function doPost(e) {
  try {
    var data = parseBody_(e);
    var action = data.action || "register";
    if (action === "register") return json_(register_(data));
    if (action === "checkin") return json_(checkin_(data.code || ""));
    if (action === "lookup") return json_(lookup_(data.code || ""));
    if (action === "list") return json_(list_());
    if (action === "search") return json_(search_(data.q || data.query || ""));
    return json_({ ok: false, error: "Action inconnue." });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function parseBody_(e) {
  if (!e || !e.postData || !e.postData.contents) return {};
  return JSON.parse(e.postData.contents);
}

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  ensureHeaders_(sheet);
  return sheet;
}

function ensureHeaders_(sheet) {
  var first = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  var missing = false;
  for (var i = 0; i < HEADERS.length; i++) {
    if (first[i] !== HEADERS[i]) {
      missing = true;
      break;
    }
  }
  if (missing) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, HEADERS.length);
  }
}

function stamp_() {
  return Utilities.formatDate(
    new Date(),
    Session.getScriptTimeZone(),
    "yyyy-MM-dd HH:mm:ss",
  );
}

function generateCode_() {
  var chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  var suffix = "";
  for (var i = 0; i < 6; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return "IHS-ACT4-" + suffix;
}

function codeExists_(sheet, code) {
  var last = sheet.getLastRow();
  if (last < 2) return false;
  var values = sheet.getRange(2, COL.CODE, last - 1, 1).getValues();
  var upper = String(code).toUpperCase();
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0]).toUpperCase() === upper) return true;
  }
  return false;
}

function uniqueCode_(sheet) {
  for (var i = 0; i < 12; i++) {
    var code = generateCode_();
    if (!codeExists_(sheet, code)) return code;
  }
  return generateCode_();
}

function register_(data) {
  var nom = String(data.nom || "").trim();
  var telephone = String(data.telephone || "").trim();
  var email = String(data.email || "").trim();
  var attentes = String(data.attentes || "").trim();
  if (!nom || !telephone || !email || !attentes) {
    return { ok: false, error: "Tous les champs sont obligatoires." };
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var sheet = getSheet_();
    var code = uniqueCode_(sheet);
    sheet.appendRow([
      code,
      nom,
      telephone,
      email,
      attentes,
      code,
      "NON",
      stamp_(),
      "",
    ]);
    return { ok: true, code: code, nom: nom };
  } finally {
    lock.releaseLock();
  }
}

function findRow_(sheet, code) {
  var last = sheet.getLastRow();
  if (last < 2) return null;
  var values = sheet.getRange(2, 1, last - 1, HEADERS.length).getValues();
  var upper = String(code).toUpperCase();
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0]).toUpperCase() === upper) {
      return { index: i + 2, values: values[i] };
    }
  }
  return null;
}

function formatCell_(value) {
  if (Object.prototype.toString.call(value) === "[object Date]") {
    return Utilities.formatDate(
      value,
      Session.getScriptTimeZone(),
      "yyyy-MM-dd HH:mm:ss",
    );
  }
  var text = String(value || "");
  return text;
}

function rowToPublic_(values) {
  var present =
    String(values[6] || "NON").toUpperCase() === "OUI" ? "OUI" : "NON";
  var entree = values[8] ? formatCell_(values[8]) : "";
  return {
    code: String(values[0]),
    nom: String(values[1]),
    telephone: String(values[2]),
    email: String(values[3]),
    attentes: String(values[4]),
    present: present,
    dateInscription: formatCell_(values[7]),
    heureEntree: entree ? entree : null,
  };
}

function lookup_(code) {
  var cleaned = String(code || "").trim();
  if (!cleaned) return { ok: true, found: false };
  var found = findRow_(getSheet_(), cleaned);
  if (!found) return { ok: true, found: false };
  var pub = rowToPublic_(found.values);
  return {
    ok: true,
    found: true,
    code: pub.code,
    nom: pub.nom,
    telephone: pub.telephone,
    email: pub.email,
    present: pub.present,
    dateInscription: pub.dateInscription,
    heureEntree: pub.heureEntree,
  };
}

function list_() {
  var sheet = getSheet_();
  var last = sheet.getLastRow();
  if (last < 2) return { ok: true, rows: [] };
  var values = sheet.getRange(2, 1, last - 1, HEADERS.length).getValues();
  var rows = [];
  for (var i = 0; i < values.length; i++) {
    if (values[i][0]) rows.push(rowToPublic_(values[i]));
  }
  rows.reverse();
  return { ok: true, rows: rows };
}

function search_(q) {
  var query = String(q || "").trim().toLowerCase();
  if (!query) return { ok: true, rows: [] };
  var all = list_();
  if (!all.ok) return all;
  var phoneQ = query.replace(/\s/g, "");
  var rows = [];
  for (var i = 0; i < all.rows.length; i++) {
    var row = all.rows[i];
    var nom = String(row.nom).toLowerCase();
    var tel = String(row.telephone).replace(/\s/g, "");
    var code = String(row.code).toLowerCase();
    if (
      nom.indexOf(query) !== -1 ||
      tel.indexOf(phoneQ) !== -1 ||
      code.indexOf(query) !== -1
    ) {
      rows.push(row);
    }
  }
  return { ok: true, rows: rows };
}

function checkin_(code) {
  var cleaned = String(code || "").trim();
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var sheet = getSheet_();
    var found = findRow_(sheet, cleaned);
    if (!found) return { ok: false, error: "Inscription introuvable." };
    var pub = rowToPublic_(found.values);
    if (pub.present === "OUI") {
      return {
        ok: true,
        already: true,
        code: pub.code,
        nom: pub.nom,
        present: "OUI",
        heureEntree: pub.heureEntree,
      };
    }
    var when = stamp_();
    sheet.getRange(found.index, COL.PRESENT).setValue("OUI");
    sheet.getRange(found.index, COL.ENTREE).setValue(when);
    return {
      ok: true,
      already: false,
      code: pub.code,
      nom: pub.nom,
      present: "OUI",
      heureEntree: when,
    };
  } finally {
    lock.releaseLock();
  }
}
