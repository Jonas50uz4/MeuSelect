let csrfToken;
const form = document.querySelector('#login-form');
const message = document.querySelector('#message');
const button = form.querySelector('button');
button.disabled = true;
appUI.request('/api/session').then(session => {
  if (session.broker) { window.location.replace('/dashboard'); return; }
  csrfToken = session.csrfToken;
  button.disabled = false;
}).catch(error => { message.textContent = error.message; });
form.addEventListener('submit', async event => {
  event.preventDefault();
  button.disabled = true;
  message.textContent = 'Entrando…';
  try {
    await appUI.request('/api/login', { method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
      body: JSON.stringify(Object.fromEntries(new FormData(form))) });
    window.location.replace('/dashboard');
  } catch (error) { message.textContent = error.message; button.disabled = false; }
});
