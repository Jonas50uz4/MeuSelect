function makeWhatsappUrl(phone, message) {
  const rawPhone = String(phone || '');
  const digits = rawPhone.replace(/\D/g, '');
  if (!/^[+\d\s().-]+$/.test(rawPhone) || !/^[1-9]\d{7,14}$/.test(digits)) {
    throw new Error('O número de atendimento não está disponível no momento.');
  }
  const text = String(message || '').trim();
  if (!text) throw new Error('Escreva uma mensagem antes de continuar.');
  if (text.length > 2000) throw new Error('Use uma mensagem de até 2.000 caracteres.');
  const url = new URL('https://web.whatsapp.com/send');
  url.searchParams.set('phone', digits);
  url.searchParams.set('text', text);
  return url.href;
}

function mountWhatsapp() {
  const openButton = document.querySelector('#whatsapp-open');
  const dialog = document.querySelector('#whatsapp-dialog');
  const textarea = document.querySelector('#whatsapp-message');
  const errorMessage = document.querySelector('#whatsapp-error');
  const config = window.siteConfig || {};
  // O rascunho permanece apenas nesta página e não é enviado ao servidor.
  textarea.value = config.whatsappMessage || 'Olá, estou olhando o site e tem interesse em um imóvel';
  openButton.addEventListener('click', () => {
    errorMessage.textContent = '';
    dialog.showModal();
    textarea.focus();
  });
  document.querySelector('#whatsapp-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => openButton.focus({ preventScroll: true }));
  document.querySelector('#whatsapp-form').addEventListener('submit', event => {
    event.preventDefault();
    try {
      const url = makeWhatsappUrl(config.whatsappPhone, textarea.value);
      errorMessage.textContent = '';
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) { errorMessage.textContent = error.message; }
  });
  // O botão sobe quando a barra de cookies aparece para não cobrir seus controles.
  const banner = document.querySelector('#cookie-banner');
  if (banner && typeof ResizeObserver !== 'undefined') {
    const observer = new ResizeObserver(() => {
      const height = banner.getBoundingClientRect().height;
      if (height) document.documentElement.style.setProperty('--cookie-banner-height', `${height}px`);
    });
    observer.observe(banner);
  }
}

if (typeof module !== 'undefined' && module.exports) module.exports = { makeWhatsappUrl };
else mountWhatsapp();
