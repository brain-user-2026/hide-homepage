(() => {
  const form = document.querySelector('form[name="contact"]');
  const fields = form.querySelector('.contact-fields');
  const button = form.querySelector('button[type="submit"]');
  const status = document.getElementById('contact-status');
  const buttonLabel = button.textContent;
  let submitting = false;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (submitting) return;

    for (const name of ['name', 'email', 'message']) {
      const input = form.elements.namedItem(name);
      input.value = input.value.trim();
    }
    if (!form.reportValidity()) return;

    // Encode before disabling the fields so every named field is included.
    const body = new URLSearchParams(new FormData(form)).toString();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    submitting = true;
    fields.disabled = true;
    form.setAttribute('aria-busy', 'true');
    button.textContent = '送信中…';
    status.removeAttribute('data-state');
    status.textContent = '送信中です。しばらくお待ちください。';

    try {
      const response = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
        signal: controller.signal,
      });
      if (!response.ok) throw new Error('Form submission failed');

      form.reset();
      status.textContent = 'お問い合わせを送信しました。ご連絡ありがとうございます。';
      status.dataset.state = 'success';
    } catch {
      status.textContent = '送信の完了を確認できませんでした。入力内容は保持しています。通信状況をご確認のうえ、時間をおいて再度お試しください。';
      status.dataset.state = 'error';
    } finally {
      clearTimeout(timeout);
      submitting = false;
      fields.disabled = false;
      form.removeAttribute('aria-busy');
      button.textContent = buttonLabel;
      status.focus();
    }
  });
})();
