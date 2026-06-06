const ADMIN_EMAIL = 'info@open-newstages-ai.com';

function doPost(e) {
  try {
    console.log('postData.contents', e && e.postData ? e.postData.contents : null);
    console.log('postData.type', e && e.postData ? e.postData.type : null);
    console.log('parameter data', JSON.stringify(e && e.parameter ? e.parameter : {}));
    const data = parseRequest(e);
    console.log('parsed contact data', JSON.stringify(data));

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

  const parameterData = normalizeContactData(e.parameter || {});

  if (hasContactValue(parameterData)) {
    return parameterData;
  }

  if (e.postData && e.postData.contents) {
    const contents = e.postData.contents;

    try {
      return normalizeContactData(JSON.parse(contents));
    } catch (error) {
      console.warn('Invalid JSON payload', error);
    }
  }

  return parameterData;
}

function hasContactValue(data) {
  return Boolean(
    cleanText(data.name) ||
    cleanText(data.company) ||
    cleanText(data.email) ||
    cleanText(data.category) ||
    cleanText(data.message)
  );
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
