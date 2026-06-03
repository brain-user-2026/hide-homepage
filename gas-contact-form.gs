const ADMIN_EMAIL = 'nmiyu@cameo.plala.or.jp';
const SPREADSHEET_ID = '';
const SHEET_NAME = '';
const RATE_LIMIT_SECONDS = 60;

function doPost(e) {
  try {
    const data = parseRequest(e);

    if (data.website) {
      return jsonResponse({ ok: false, reason: 'spam' });
    }

    if (isRateLimited(data)) {
      return jsonResponse({ ok: false, reason: 'rate_limited' });
    }

    const savedData = {
      name: cleanText(data.name),
      company: cleanText(data.company),
      email: cleanText(data.email),
      category: cleanText(data.category),
      message: cleanText(data.message)
    };

    const results = {
      spreadsheet: runSafely('spreadsheet', function () {
        return saveToSpreadsheet(savedData);
      }),
      adminNotification: runSafely('adminNotification', function () {
        return sendAdminNotification(savedData);
      }),
      autoReply: runSafely('autoReply', function () {
        return sendAutoReply(savedData);
      })
    };

    return jsonResponse({ ok: true, results: results });
  } catch (error) {
    console.error(error);
    return jsonResponse({ ok: false, reason: 'server_error' });
  }
}

function parseRequest(e) {
  if (!e) return {};

  if (e.postData && e.postData.contents) {
    try {
      return JSON.parse(e.postData.contents);
    } catch (error) {
      console.warn('Invalid JSON payload', error);
    }
  }

  return e.parameter || {};
}

function saveToSpreadsheet(data) {
  const sheet = getContactSheet();
  if (!sheet) {
    return { status: 'skipped', reason: 'spreadsheet_not_configured' };
  }

  sheet.appendRow([
    new Date(),
    data.name,
    data.company,
    data.email,
    data.category,
    data.message,
    '未対応',
    ''
  ]);

  return { status: 'success' };
}

function getContactSheet() {
  if (!SPREADSHEET_ID) {
    return null;
  }

  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);

  if (!SHEET_NAME) {
    return spreadsheet.getActiveSheet();
  }

  const sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) {
    throw new Error('Sheet not found: ' + SHEET_NAME);
  }

  return sheet;
}

function isRateLimited(data) {
  const email = cleanText(data.email).toLowerCase();
  const keySource = email || cleanText(data.name) || cleanText(data.message).slice(0, 40);
  if (!keySource) return false;

  const cache = CacheService.getScriptCache();
  const key = 'contact_rate_' + Utilities.base64EncodeWebSafe(keySource).slice(0, 80);
  if (cache.get(key)) {
    return true;
  }

  cache.put(key, '1', RATE_LIMIT_SECONDS);
  return false;
}

function sendAdminNotification(data) {
  if (!isValidEmail(ADMIN_EMAIL)) {
    return { status: 'skipped', reason: 'admin_email_not_configured' };
  }

  const subject = '【お問い合わせ】' + (data.name || '名前未入力') + ' 様より';
  const body = [
    'Webサイトからお問い合わせが届きました。',
    '',
    '名前: ' + data.name,
    '会社名: ' + data.company,
    'メール: ' + data.email,
    'カテゴリー: ' + data.category,
    '',
    '内容:',
    data.message
  ].join('\n');

  MailApp.sendEmail(ADMIN_EMAIL, subject, body);
  return { status: 'success' };
}

function sendAutoReply(data) {
  if (!isValidEmail(data.email)) {
    return { status: 'skipped', reason: 'invalid_email' };
  }

  const subject = 'お問い合わせありがとうございます';
  const body = [
    (data.name || 'お客様') + ' 様',
    '',
    'お問い合わせありがとうございます。',
    '以下の内容で受け付けました。',
    '内容を確認後、通常1から2営業日を目安にご返信いたします。',
    '',
    'カテゴリー: ' + data.category,
    '',
    'お問い合わせ内容:',
    data.message,
    '',
    'このメールは自動返信です。'
  ].join('\n');

  MailApp.sendEmail(data.email, subject, body);
  return { status: 'success' };
}

function cleanText(value) {
  return String(value || '').trim();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

function runSafely(label, task) {
  try {
    return task();
  } catch (error) {
    console.error(label + ' failed', error);
    return {
      status: 'failed',
      reason: error && error.message ? error.message : String(error)
    };
  }
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
