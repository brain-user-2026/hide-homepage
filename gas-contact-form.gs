const ADMIN_EMAIL = 'info@open-newstages-ai.com';

function doPost(e) {
  try {
    const data = parseRequest(e);

    const savedData = {
      name: cleanText(data.name),
      company: cleanText(data.company),
      email: cleanText(data.email),
      category: cleanText(data.category),
      message: cleanText(data.message)
    };

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
    const contents = e.postData.contents;

    try {
      return normalizeContactData(JSON.parse(contents));
    } catch (error) {
      console.warn('Invalid JSON payload', error);
    }

    try {
      return normalizeContactData(parseUrlEncoded(contents));
    } catch (error) {
      console.warn('Invalid form payload', error);
    }
  }

  return normalizeContactData(e.parameter || {});
}

function parseUrlEncoded(contents) {
  return String(contents || '').split('&').reduce(function (params, pair) {
    if (!pair) return params;

    const parts = pair.split('=');
    const key = decodeURIComponent(String(parts.shift() || '').replace(/\+/g, ' '));
    const value = decodeURIComponent(parts.join('=').replace(/\+/g, ' '));
    params[key] = value;
    return params;
  }, {});
}

function normalizeContactData(data) {
  data = data || {};

  return {
    name: data.name,
    company: data.company,
    email: data.email,
    category: data.category,
    message: data.message
  };
}

function sendAdminNotification(data) {
  MailApp.sendEmail({
    to: ADMIN_EMAIL,
    subject: `【お問い合わせ】${data.name || 'お客様'}様より`,
    body:
`お問い合わせが届きました。

お名前: ${data.name}
会社名: ${data.company}
メール: ${data.email}
カテゴリ: ${data.category}

内容:
${data.message}`
  });
}

function sendAutoReply(data) {
  if (!data.email) return;

  MailApp.sendEmail({
    to: data.email,
    subject: 'お問い合わせありがとうございます',
    body:
`${data.name || 'お客様'}

お問い合わせありがとうございます。
内容を確認し、必要に応じてご返信いたします。

送信内容:
${data.message}`
  });
}

function cleanText(value) {
  return String(value || '').trim();
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
