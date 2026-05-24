const ADMIN_EMAIL = 'admin@example.com';
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

    const sheet = getContactSheet();
    sheet.appendRow([
      new Date(),
      savedData.name,
      savedData.company,
      savedData.email,
      savedData.category,
      savedData.message,
      '未対応',
      ''
    ]);

    sendAdminNotification(savedData);
    sendAutoReply(savedData);

    return jsonResponse({ ok: true });
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

function getContactSheet() {
  const spreadsheet = SPREADSHEET_ID
    ? SpreadsheetApp.openById(SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();

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
  try {
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
  } catch (error) {
    console.error('Admin notification failed', error);
  }
}

function sendAutoReply(data) {
  if (!isValidEmail(data.email)) return;

  try {
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
  } catch (error) {
    console.error('Auto reply failed', error);
  }
}

function cleanText(value) {
  return String(value || '').trim();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
