let csrfToken;
const message = document.querySelector('#message');
const form = document.querySelector('#property-form');
const submitButton = form.querySelector('button');
submitButton.disabled = true;
appUI.fillSelect(form.elements.type, propertyCatalog.types, 'Selecione o tipo');
appUI.fillSelect(form.elements.city, propertyCatalog.cities, 'Selecione a cidade');
appUI.fillSelect(form.elements.neighborhood, propertyCatalog.neighborhoods, 'Selecione o bairro');
appUI.fillSelect(form.elements.condominium, propertyCatalog.condominiums, 'Sem condomínio');
form.elements.neighborhood.value = 'Centro';

function showError(error) {
  if (error.status === 401) { window.location.replace('/login'); return; }
  message.textContent = error.message;
}
async function loadProperties() {
  const properties = await appUI.request('/api/admin/properties');
  document.querySelector('#count').textContent = `${properties.length} cadastro(s)`;
  document.querySelector('#properties').replaceChildren(...properties.map(property => {
    const { article, body } = appUI.card(property);
    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.textContent = property.status === 'available' ? 'Disponível' : 'Baixado';
    const actions = document.createElement('div');
    actions.className = 'actions';
    const statusButton = document.createElement('button');
    statusButton.className = 'secondary';
    statusButton.textContent = property.status === 'available' ? 'Dar baixa' : 'Reativar';
    statusButton.addEventListener('click', () => mutate(statusButton, `/api/properties/${property.id}/status`, 'PATCH', {
      status: property.status === 'available' ? 'unavailable' : 'available'
    }));
    const deleteButton = document.createElement('button');
    deleteButton.className = 'danger';
    deleteButton.textContent = 'Excluir';
    deleteButton.addEventListener('click', () => {
      if (confirm(`Excluir definitivamente "${property.title}" e sua foto?`)) {
        mutate(deleteButton, `/api/properties/${property.id}`, 'DELETE');
      }
    });
    actions.append(statusButton, deleteButton);
    body.prepend(badge);
    body.append(actions);
    return article;
  }));
}
async function mutate(button, url, method, data) {
  button.disabled = true;
  try {
    await appUI.request(url, { method,
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
      body: data ? JSON.stringify(data) : undefined });
    message.textContent = 'Alteração salva.';
    await loadProperties();
  } catch (error) { showError(error); button.disabled = false; }
}
form.addEventListener('submit', async event => {
  event.preventDefault();
  const photo = form.elements.photo.files[0];
  if (photo?.size > 5 * 1024 * 1024) { message.textContent = 'A foto deve ter até 5 MB.'; return; }
  submitButton.disabled = true;
  message.textContent = 'Salvando imóvel…';
  try {
    await appUI.request('/api/properties', { method: 'POST',
      headers: { 'X-CSRF-Token': csrfToken }, body: new FormData(form) });
    form.reset();
    form.elements.neighborhood.value = 'Centro';
    message.textContent = 'Imóvel cadastrado! Já aparece na listagem pública.';
    await loadProperties();
  } catch (error) { showError(error); }
  finally { submitButton.disabled = false; }
});
document.querySelector('#logout').addEventListener('click', async () => {
  try {
    await appUI.request('/api/logout', { method: 'POST', headers: { 'X-CSRF-Token': csrfToken } });
    window.location.replace('/login');
  } catch (error) { showError(error); }
});
async function initialize() {
  try {
    const session = await appUI.request('/api/session');
    if (!session.broker) { window.location.replace('/login'); return; }
    csrfToken = session.csrfToken;
    document.querySelector('#broker').textContent = `Conectado como ${session.broker.email}`;
    await loadProperties();
    submitButton.disabled = false;
  } catch (error) { showError(error); }
}
initialize();
