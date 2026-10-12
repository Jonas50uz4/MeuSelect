const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const fixtures = [
  { id: '1', code: 'IMV-001', type: 'Casa', city: 'Capão da Canoa', neighborhood: 'Centro', condominium: 'Enseada', title: 'Casa com varanda', description: 'Garagem no Centro', price: 500000 },
  { id: '2', code: 'IMV-002', type: 'Apartamento', city: 'Xangri-lá', neighborhood: 'Centro', condominium: '', title: 'Apartamento', description: 'Vista para o mar', price: 2000000 },
  { id: '3', code: 'IMV-003', type: 'Casa', city: 'Osório', neighborhood: 'Centro', condominium: '', title: 'Casa compacta', description: 'Bairro tranquilo', price: 200000 }
];

// Executa o JavaScript real da página em um DOM mínimo e isolado, sem navegador.
async function page({ storage = new Map(), request = async () => fixtures } = {}) {
  const elements = new Map();
  function element(id) {
    if (!elements.has(id)) {
      const attributes = new Map();
      const handlers = new Map();
      elements.set(id, { value: '', textContent: '', hidden: false, disabled: false, paused: true,
        children: [], attributes,
        addEventListener: (event, callback) => handlers.set(event, callback),
        emit: (event, data = {}) => handlers.get(event)?.({ preventDefault() {}, ...data }),
        setAttribute: (key, value) => attributes.set(key, value),
        getAttribute: key => attributes.get(key),
        replaceChildren(...children) { this.children = children; },
        scrollIntoView() {}, contains: () => false, focus() {}, pause() {} });
    }
    return elements.get(id);
  }
  element('#min-price').value = '250000';
  element('#max-price').value = '25000000';
  element('#cookie-banner').hidden = true;
  const form = element('#search-form');
  form.elements = { query: { value: '' }, code: { value: '' } };
  form.reset = () => {
    form.elements.query.value = ''; form.elements.code.value = '';
    ['#search-type', '#search-city', '#search-neighborhood', '#search-condominium'].forEach(id => { element(id).value = ''; });
    element('#min-price').value = '250000'; element('#max-price').value = '25000000';
  };
  const classes = new Set();
  const context = {
    Intl, URL, console, propertyCatalog: require('../public/js/property-catalog'),
    window: { siteConfig: {}, matchMedia: () => ({ matches: false, addEventListener() {} }) },
    document: { querySelector: element, querySelectorAll: () => [], activeElement: null,
      body: { classList: { add: item => classes.add(item), remove: item => classes.delete(item) } } },
    localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) },
    appUI: { request, card: property => ({ article: property }), fillSelect() {} }
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../public/js/listing.js'), 'utf8'), context);
  // Aguarda as Promises da VM terminarem antes de conferir a lista inicial.
  await new Promise(resolve => setImmediate(resolve));
  return { element, form, storage };
}

test('busca combina tipo, cidade, bairro e condomínio', async () => {
  const { element, form } = await page();
  assert.equal(element('#properties').children.length, 3);
  element('#search-type').value = 'Casa';
  element('#search-city').value = 'Capão da Canoa';
  element('#search-neighborhood').value = 'Centro';
  element('#search-condominium').value = 'Enseada';
  form.emit('submit');
  assert.equal(element('#properties').children.length, 1);
  assert.equal(element('#properties').children[0].id, '1');
  assert.equal(element('#clear-search').hidden, false);
  element('#clear-search').emit('click');
  assert.equal(element('#properties').children.length, 3);
  assert.equal(element('#clear-search').hidden, true);
});
test('faixa de preços inclui os limites e impede mínimo acima do máximo', async () => {
  const { element, form } = await page();
  element('#advanced-search').open = true;
  element('#max-price').value = '500000';
  element('#max-price').emit('input');
  form.emit('submit');
  assert.equal(element('#properties').children.length, 1);
  assert.equal(element('#properties').children[0].price, 500000);
  element('#min-price').value = '2000000';
  element('#min-price').emit('input');
  assert.equal(element('#max-price').value, '2000000');
  form.emit('submit');
  assert.equal(element('#properties').children[0].id, '2');
});
test('Atualizar imóveis mantém os filtros e encontra novos cadastros', async () => {
  let current = fixtures;
  const { element, form } = await page({ request: async () => current });
  element('#advanced-search').open = true;
  form.elements.query.value = 'varanda';
  form.emit('submit');
  current = [...fixtures, { id: '4', title: 'Apartamento com varanda', description: 'Novo cadastro', price: 750000 }];
  await element('#refresh-properties').emit('click');
  assert.equal(element('#properties').children.length, 2);
  assert.equal(form.elements.query.value, 'varanda');
  assert.equal(element('#refresh-properties').disabled, false);
  assert.equal(element('#properties').attributes.get('aria-busy'), 'false');
});
test('listagem permite tentar novamente depois de uma falha de conexão', async () => {
  let failed = true;
  const { element } = await page({ request: async () => {
    if (failed) throw new Error('Falha de conexão');
    return fixtures;
  } });
  assert.equal(element('#message').textContent, 'Falha de conexão');
  assert.equal(element('#refresh-properties').disabled, false);
  failed = false;
  await element('#refresh-properties').emit('click');
  assert.equal(element('#properties').children.length, 3);
  assert.equal(element('#message').textContent, '');
});
test('cookies permitem rejeitar, persistir, reabrir e concordar', async () => {
  const initial = await page();
  assert.equal(initial.element('#cookie-banner').hidden, false);
  initial.element('#reject-cookies').emit('click');
  assert.equal(initial.element('#cookie-banner').hidden, true);
  const key = 'meular.cookie-preference.v1';
  assert.equal(JSON.parse(initial.storage.get(key)).optionalCookies, false);
  const reloaded = await page({ storage: initial.storage });
  assert.equal(reloaded.element('#cookie-banner').hidden, true);
  reloaded.element('#privacy-settings').emit('click');
  assert.equal(reloaded.element('#cookie-banner').hidden, false);
  reloaded.element('#accept-cookies').emit('click');
  assert.equal(JSON.parse(initial.storage.get(key)).optionalCookies, true);
});

test('busca simples não aplica preços ocultos e permite consultar por código', async () => {
  const { element, form } = await page();
  form.emit('submit');
  assert.equal(element('#properties').children.length, 3);
  form.elements.code.value = 'imv-003';
  form.emit('submit');
  assert.equal(element('#properties').children[0].id, '3');
  assert.equal(element('#properties').children.length, 1);
});

test('palavra-chave e preço só são aplicados com Avançado aberto', async () => {
  const { element, form } = await page();
  form.elements.query.value = 'CÁSA';
  element('#advanced-search').open = true;
  form.emit('submit');
  assert.equal(element('#properties').children.length, 1);
  assert.equal(element('#properties').children[0].id, '1');
  element('#advanced-search').open = false;
  form.emit('submit');
  assert.equal(element('#properties').children.length, 3);
});
