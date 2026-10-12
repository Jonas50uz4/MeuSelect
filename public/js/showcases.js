// Cinco vitrines demonstrativas. Os anúncios não são inseridos no banco de imóveis.
function buildShowcases(image = '/media/advert-placeholder.svg') {
  return [
    ['lancamentos', 'Lançamento'], ['ofertas', 'Ofertas'], ['novidades', 'Novidades'],
    ['casas-condominios', 'Casas em condomínios'], ['empreendimentos', 'Empreendimentos']
  ].map(([id, title], group) => ({ id, title,
    ads: Array.from({ length: 8 }, (_, offset) => ({
      title: `Anúncio ${String((group + 1) * 100 + offset + 1).padStart(3, '0')}`, image
    }))
  }));
}

function visibleAds(ads, index, count) {
  return Array.from({ length: Math.min(count, ads.length) }, (_, offset) => ads[(index + offset + ads.length) % ads.length]);
}

function createRotation({ total, onChange, setTimer = setInterval, clearTimer = clearInterval }) {
  let index = 0;
  let timer = null;
  const pauses = new Set();
  function syncTimer() {
    if (timer !== null) clearTimer(timer);
    timer = null;
    if (total > 1 && pauses.size === 0) timer = setTimer(() => move(1, false), 4000);
  }
  function move(direction, manual = true) {
    if (!total) return;
    index = (index + direction + total) % total;
    onChange(index, manual);
    if (manual) syncTimer();
  }
  syncTimer();
  return {
    next: () => move(1), previous: () => move(-1),
    pause(reason, paused) { if (paused) pauses.add(reason); else pauses.delete(reason); syncTimer(); },
    destroy() { pauses.add('destroyed'); syncTimer(); },
    get index() { return index; }
  };
}

function mountShowcases() {
  const host = document.querySelector('#showcases');
  if (!host) return;
  const groups = buildShowcases(window.siteConfig?.advertImage);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const desktop = window.matchMedia('(min-width: 1100px)');
  const tablet = window.matchMedia('(min-width: 640px)');
  groups.forEach(group => {
    const section = document.createElement('section');
    section.id = group.id;
    section.className = 'showcase-section';
    section.setAttribute('aria-labelledby', `${group.id}-title`);
    section.setAttribute('aria-roledescription', 'carrossel');
    const inner = document.createElement('div');
    inner.className = 'showcase-inner';
    const heading = document.createElement('h2');
    heading.id = `${group.id}-title`;
    heading.textContent = group.title;
    const note = document.createElement('p');
    note.className = 'showcase-note';
    note.textContent = 'Espaços para os seus próximos anúncios';
    const frame = document.createElement('div');
    frame.className = 'showcase-frame';
    const grid = document.createElement('div');
    grid.id = `${group.id}-ads`;
    grid.className = 'showcase-grid';
    const status = document.createElement('p');
    status.className = 'showcase-status';
    const announcement = document.createElement('p');
    announcement.className = 'sr-only';
    announcement.setAttribute('aria-live', 'polite');
    function arrow(direction, label) {
      const button = document.createElement('button');
      button.type = 'button'; button.className = `carousel-arrow ${direction}`;
      button.textContent = direction === 'previous' ? '‹' : '›';
      button.setAttribute('aria-label', `${label} — ${group.title}`);
      button.setAttribute('aria-controls', grid.id);
      return button;
    }
    const previous = arrow('previous', 'Anúncio anterior');
    const next = arrow('next', 'Próximo anúncio');
    const pauseButton = document.createElement('button');
    pauseButton.type = 'button'; pauseButton.className = 'carousel-pause';
    pauseButton.textContent = 'Pausar';
    pauseButton.setAttribute('aria-label', `Pausar troca automática — ${group.title}`);
    pauseButton.setAttribute('aria-pressed', 'false');
    let manualPause = false;
    function render(index, manual = false) {
      const count = desktop.matches ? 4 : tablet.matches ? 2 : 1;
      grid.replaceChildren(...visibleAds(group.ads, index, count).map(ad => {
        const card = document.createElement('article'); card.className = 'advert-card';
        const imageWrap = document.createElement('div'); imageWrap.className = 'advert-image';
        const image = document.createElement('img'); image.src = ad.image;
        image.alt = `Imagem de preenchimento de ${ad.title}`; image.loading = 'lazy';
        image.width = 640; image.height = 420;
        const tag = document.createElement('span'); tag.className = 'advert-tag'; tag.textContent = group.title;
        imageWrap.append(image, tag);
        const body = document.createElement('div'); body.className = 'advert-body';
        const title = document.createElement('h3'); title.textContent = ad.title;
        const detail = document.createElement('p'); detail.textContent = 'Seu próximo imóvel pode estar aqui.';
        body.append(title, detail); card.append(imageWrap, body);
        return card;
      }));
      status.textContent = `${index + 1} / ${group.ads.length}`;
      if (manual) announcement.textContent = visibleAds(group.ads, index, count).map(ad => ad.title).join(', ');
    }
    const rotation = createRotation({ total: group.ads.length, onChange: render });
    render(0);
    previous.addEventListener('click', rotation.previous);
    next.addEventListener('click', rotation.next);
    pauseButton.addEventListener('click', () => {
      manualPause = !manualPause;
      rotation.pause('manual', manualPause);
      pauseButton.textContent = manualPause ? 'Retomar' : 'Pausar';
      pauseButton.setAttribute('aria-label', `${manualPause ? 'Retomar' : 'Pausar'} troca automática — ${group.title}`);
      pauseButton.setAttribute('aria-pressed', String(manualPause));
    });
    section.addEventListener('mouseenter', () => rotation.pause('hover', true));
    section.addEventListener('mouseleave', () => rotation.pause('hover', false));
    section.addEventListener('focusin', () => rotation.pause('focus', true));
    section.addEventListener('focusout', event => { if (!section.contains(event.relatedTarget)) rotation.pause('focus', false); });
    function syncMotion() { rotation.pause('motion', reducedMotion.matches); }
    function syncVisibility() { rotation.pause('hidden', document.hidden); }
    syncMotion(); syncVisibility();
    reducedMotion.addEventListener('change', syncMotion);
    document.addEventListener('visibilitychange', syncVisibility);
    desktop.addEventListener('change', () => render(rotation.index));
    tablet.addEventListener('change', () => render(rotation.index));
    if (typeof IntersectionObserver !== 'undefined') {
      rotation.pause('offscreen', true);
      const observer = new IntersectionObserver(entries => {
        rotation.pause('offscreen', !entries[0].isIntersecting);
      }, { threshold: 0.1 });
      observer.observe(section);
    }
    const controls = document.createElement('div'); controls.className = 'showcase-controls';
    controls.append(status, pauseButton);
    frame.append(previous, grid, next);
    inner.append(heading, note, frame, controls, announcement);
    section.append(inner); host.append(section);
  });
}

if (typeof module !== 'undefined' && module.exports) module.exports = { buildShowcases, visibleAds, createRotation };
else mountShowcases();
