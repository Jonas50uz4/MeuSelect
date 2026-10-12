const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const form = document.querySelector('#search-form');
const minPrice = document.querySelector('#min-price');
const maxPrice = document.querySelector('#max-price');
const message = document.querySelector('#message');
const clearButton = document.querySelector('#clear-search');
const refreshButton = document.querySelector('#refresh-properties');
const advancedSearch = document.querySelector('#advanced-search');
const searchType = document.querySelector('#search-type');
const searchCity = document.querySelector('#search-city');
const searchNeighborhood = document.querySelector('#search-neighborhood');
const searchCondominium = document.querySelector('#search-condominium');
appUI.fillSelect(searchType, propertyCatalog.types, 'Todos os tipos');
appUI.fillSelect(searchCity, propertyCatalog.cities, 'Todas as cidades');
appUI.fillSelect(searchNeighborhood, propertyCatalog.neighborhoods, 'Todos os bairros');
appUI.fillSelect(searchCondominium, propertyCatalog.condominiums, 'Todos os condomínios');
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
let properties = [];
let loaded = false;
let activeFilters = null;

function normalize(text) {
  return String(text).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}
function updatePriceLabels(changed) {
  if (Number(minPrice.value) > Number(maxPrice.value)) {
    if (changed === minPrice) maxPrice.value = minPrice.value;
    else minPrice.value = maxPrice.value;
  }
  document.querySelector('#min-price-label').textContent = currency.format(Number(minPrice.value));
  document.querySelector('#max-price-label').textContent = currency.format(Number(maxPrice.value));
  minPrice.setAttribute('aria-valuetext', currency.format(Number(minPrice.value)));
  maxPrice.setAttribute('aria-valuetext', currency.format(Number(maxPrice.value)));
}
minPrice.addEventListener('input', () => updatePriceLabels(minPrice));
maxPrice.addEventListener('input', () => updatePriceLabels(maxPrice));
updatePriceLabels();

function renderProperties() {
  if (!loaded) return;
  const results = properties.filter(property => {
    if (!activeFilters) return true;
    const text = normalize(`${property.title} ${property.description}`);
    return (!activeFilters.type || property.type === activeFilters.type) &&
      (!activeFilters.city || property.city === activeFilters.city) &&
      (!activeFilters.neighborhood || (property.neighborhood || 'Centro') === activeFilters.neighborhood) &&
      (!activeFilters.condominium || property.condominium === activeFilters.condominium) &&
      (!activeFilters.code || normalize(property.code || property.id) === normalize(activeFilters.code)) &&
      (!activeFilters.useAdvanced || (activeFilters.words.every(word => text.includes(word)) &&
        property.price >= activeFilters.min && property.price <= activeFilters.max));
  });
  document.querySelector('#count').textContent = `${results.length} ${results.length === 1 ? 'imóvel' : 'imóveis'}`;
  document.querySelector('#properties').replaceChildren(...results.map(property => appUI.card(property).article));
  message.textContent = results.length ? '' : properties.length ?
    'Nenhum imóvel encontrado. Experimente outros filtros ou amplie a faixa de preço em Avançado.' :
    'Novas histórias estão chegando. Em breve, imóveis disponíveis por aqui.';
  const labels = activeFilters ? [activeFilters.type, activeFilters.city, activeFilters.neighborhood,
    activeFilters.condominium, activeFilters.code,
    activeFilters.useAdvanced ? activeFilters.query : '',
    activeFilters.useAdvanced ? `${currency.format(activeFilters.min)} a ${currency.format(activeFilters.max)}` : ''].filter(Boolean) : [];
  document.querySelector('#search-summary').textContent = labels.length ? labels.join(' • ') : 'Conheça os imóveis disponíveis.';
  clearButton.hidden = !activeFilters;
}
form.addEventListener('submit', event => {
  event.preventDefault();
  const query = form.elements.query.value.trim();
  activeFilters = { query, type: searchType.value, city: searchCity.value,
    neighborhood: searchNeighborhood.value, condominium: searchCondominium.value,
    code: form.elements.code.value.trim(), useAdvanced: advancedSearch.open,
    words: normalize(query).split(/\s+/).filter(Boolean),
    min: Number(minPrice.value), max: Number(maxPrice.value) };
  renderProperties();
  document.querySelector('#comprar').scrollIntoView({ behavior: motionPreference.matches ? 'instant' : 'smooth' });
});
clearButton.addEventListener('click', () => {
  form.reset(); advancedSearch.open = false; updatePriceLabels(); activeFilters = null; renderProperties();
});
async function loadProperties() {
  if (refreshButton.disabled) return;
  refreshButton.disabled = true;
  refreshButton.textContent = 'Atualizando…';
  document.querySelector('#properties').setAttribute('aria-busy', 'true');
  message.textContent = 'Carregando imóveis…';
  try {
    properties = await appUI.request('/api/properties');
    loaded = true;
    renderProperties();
  } catch (error) { message.textContent = error.message; }
  finally {
    refreshButton.disabled = false;
    refreshButton.textContent = 'Atualizar imóveis';
    document.querySelector('#properties').setAttribute('aria-busy', 'false');
  }
}
refreshButton.addEventListener('click', loadProperties);

// O vídeo só é carregado quando configurado; a imagem fica como fundo alternativo.
const video = document.querySelector('#hero-video');
const videoButton = document.querySelector('#video-toggle');
const config = window.siteConfig || {};
if (config.heroImage) document.querySelector('#hero-image').src = config.heroImage;
document.querySelector('#hero-placeholder-label').hidden = Boolean(config.heroVideo) || Boolean(config.heroImage && config.heroImage !== '/media/hero-placeholder.svg');
video.muted = true;
function syncVideoButton() {
  videoButton.textContent = video.paused ? 'Reproduzir vídeo' : 'Pausar vídeo';
}
function startVideo() {
  if (!config.heroVideo) return;
  if (!video.getAttribute('src')) video.src = config.heroVideo;
  videoButton.hidden = false;
  video.play().catch(syncVideoButton);
}
video.addEventListener('playing', () => { video.hidden = false; syncVideoButton(); });
video.addEventListener('pause', syncVideoButton);
video.addEventListener('error', () => { video.hidden = true; videoButton.hidden = true; });
videoButton.addEventListener('click', () => { if (video.paused) startVideo(); else video.pause(); });
motionPreference.addEventListener('change', () => {
  if (motionPreference.matches) video.pause(); else startVideo();
});
if (!motionPreference.matches) startVideo();
else if (config.heroVideo) { videoButton.hidden = false; syncVideoButton(); }

// Ícones sem um perfil configurado ficam desativados.
document.querySelectorAll('[data-social]').forEach(button => {
  const url = config.socialLinks?.[button.dataset.social];
  if (!url) return;
  try {
    const target = new URL(url);
    if (target.protocol !== 'https:') return;
    const link = document.createElement('a');
    link.className = button.className; link.href = target.href; link.target = '_blank'; link.rel = 'noopener noreferrer';
    const name = button.dataset.social === 'youtube' ? 'YouTube' : button.dataset.social === 'facebook' ? 'Facebook' : 'Instagram';
    link.setAttribute('aria-label', `${name} — abrir em nova aba`); link.title = name;
    link.append(...button.childNodes); button.replaceWith(link);
  } catch { /* Mantém desativado se a URL não for válida. */ }
});

// Não há publicidade ou analytics nesta versão. A escolha prepara futuras integrações.
const consentKey = 'meular.cookie-preference.v1';
const banner = document.querySelector('#cookie-banner');
function showCookieBanner() { banner.hidden = false; document.body.classList.add('cookie-visible'); }
function saveConsent(optionalCookies) {
  let persisted = true;
  try { localStorage.setItem(consentKey, JSON.stringify({ version: 1, optionalCookies, savedAt: new Date().toISOString() })); }
  catch { persisted = false; }
  banner.hidden = true; document.body.classList.remove('cookie-visible');
  document.querySelector('#privacy-feedback').textContent = `${optionalCookies ? 'Preferência de concordar registrada.' : 'Cookies opcionais rejeitados.'}${persisted ? '' : ' Seu navegador não permitiu salvar a preferência.'}`;
  if (banner.contains(document.activeElement)) document.querySelector('#privacy-settings').focus({ preventScroll: true });
}
try {
  const preference = JSON.parse(localStorage.getItem(consentKey));
  if (preference?.version !== 1 || typeof preference.optionalCookies !== 'boolean') showCookieBanner();
} catch { showCookieBanner(); }
document.querySelector('#accept-cookies').addEventListener('click', () => saveConsent(true));
document.querySelector('#reject-cookies').addEventListener('click', () => saveConsent(false));
document.querySelector('#privacy-settings').addEventListener('click', () => {
  showCookieBanner(); document.querySelector('#reject-cookies').focus({ preventScroll: true });
});
loadProperties();
