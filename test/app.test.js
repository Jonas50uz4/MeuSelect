const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const sharp = require('sharp');
const { createApp } = require('../server');

test('login, proteção das rotas, foto, persistência, baixa, reativação e exclusão', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'imobiliaria-test-'));
  const app = createApp({ DATA_DIR: directory, NODE_ENV: 'test',
    SESSION_SECRET: 'uma-chave-de-testes-com-pelo-menos-32-caracteres',
    BROKER_EMAIL: 'teste@exemplo.com', BROKER_PASSWORD: 'senha-somente-para-testes',
    WIX_ORIGIN: 'https://www.exemplo.com' });
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  let cookie = '';
  async function request(url, options = {}) {
    const response = await fetch(base + url, { ...options,
      headers: { Cookie: cookie, ...options.headers }, redirect: 'manual' });
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) cookie = setCookie.split(';')[0];
    return response;
  }
  function json(method, body, token) {
    return { method, headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token || '' }, body: JSON.stringify(body) };
  }
  try {
    assert.equal((await request('/dashboard')).status, 302);
    assert.equal((await request('/api/admin/properties')).status, 401);
    assert.equal((await request('/api/properties', { method: 'POST' })).status, 401);
    const listing = await request('/');
    assert.match(listing.headers.get('content-security-policy'), /frame-ancestors \*/);
    const loginPage = await request('/login');
    assert.match(loginPage.headers.get('content-security-policy'), /frame-ancestors 'self'/);
    const before = await (await request('/api/session')).json();
    assert.equal((await request('/api/login', json('POST', { email: 'teste@exemplo.com', password: 'errada' }))).status, 403);
    assert.equal((await request('/api/login', json('POST', { email: 'teste@exemplo.com', password: 'errada' }, before.csrfToken))).status, 401);
    const oldCookie = cookie;
    assert.equal((await request('/api/login', json('POST', { email: 'teste@exemplo.com', password: 'senha-somente-para-testes' }, before.csrfToken))).status, 200);
    assert.notEqual(cookie, oldCookie);
    const session = await (await request('/api/session')).json();
    assert.equal(session.broker.email, 'teste@exemplo.com');
    assert.equal((await request('/dashboard')).status, 200);
    assert.equal((await request('/api/properties', json('POST', {}, before.csrfToken))).status, 403);
    assert.equal((await request('/api/properties', { method: 'POST', headers: { 'X-CSRF-Token': session.csrfToken } })).status, 400);
    assert.equal((await request('/api/properties', json('POST', {}, session.csrfToken))).status, 400);
    assert.equal((await request('/api/properties', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': session.csrfToken }, body: '{' })).status, 400);
    const placeholder = await request('/media/hero-placeholder.svg');
    assert.equal(placeholder.status, 200);
    assert.match(placeholder.headers.get('content-type'), /image\/svg\+xml/);
    const photo = await sharp({ create: { width: 20, height: 20, channels: 3, background: '#225c45' } }).png().toBuffer();
    function form(price = '350000.50', image = photo, city = 'Capão da Canoa') {
      const body = new FormData();
      body.set('title', 'Apartamento de teste');
      body.set('price', price);
      body.set('description', '<script>alert(1)</script> Uma descrição como texto.');
      body.set('type', 'Apartamento');
      body.set('city', city);
      body.set('neighborhood', 'Centro');
      body.set('condominium', 'Enseada');
      body.set('photo', new Blob([image], { type: 'image/png' }), 'foto.png');
      return { method: 'POST', headers: { 'X-CSRF-Token': session.csrfToken }, body };
    }
    assert.equal((await request('/api/properties', form('-5'))).status, 400);
    assert.equal((await request('/api/properties', form('350000', photo, 'Cidade inválida'))).status, 400);
    assert.equal((await request('/api/properties', form('0.001'))).status, 400);
    assert.equal((await request('/api/properties', form('100', Buffer.from('imagem falsa')))).status, 400);
    assert.equal((await request('/api/properties', form('100', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>')))).status, 400);
    assert.equal((await request('/api/properties', form('100', Buffer.alloc(5 * 1024 * 1024 + 1)))).status, 400);
    const created = await request('/api/properties', form());
    assert.equal(created.status, 201);
    const property = await created.json();
    assert.equal(property.price, 350000.5);
    assert.equal(property.type, 'Apartamento');
    assert.equal(property.city, 'Capão da Canoa');
    assert.equal(property.neighborhood, 'Centro');
    assert.equal(property.condominium, 'Enseada');
    assert.match(property.code, /^IMV-[0-9A-F]{12}$/);
    const imageResponse = await request(property.photo);
    assert.equal(imageResponse.headers.get('content-type'), 'image/jpeg');
    assert.equal(imageResponse.headers.get('cross-origin-resource-policy'), 'cross-origin');
    const publicResponse = await request('/api/properties', { headers: { Origin: 'https://www.exemplo.com' } });
    assert.equal(publicResponse.headers.get('access-control-allow-origin'), 'https://www.exemplo.com');
    assert.equal((await publicResponse.json()).length, 1);
    assert.equal((await request('/api/properties', { headers: { Origin: 'https://outro.com' } })).headers.get('access-control-allow-origin'), null);
    assert.equal(JSON.parse(fs.readFileSync(path.join(directory, 'properties.json'), 'utf8'))[0].id, property.id);
    assert.equal((await request(`/api/properties/${property.id}/status`, json('PATCH', { status: 'invalid' }, session.csrfToken))).status, 400);
    const restart = createApp({ DATA_DIR: directory, SESSION_SECRET: 'uma-chave-de-testes-com-pelo-menos-32-caracteres',
      BROKER_EMAIL: 'teste@exemplo.com', BROKER_PASSWORD: 'senha-somente-para-testes' });
    const secondServer = restart.listen(0, '127.0.0.1');
    await new Promise(resolve => secondServer.once('listening', resolve));
    try {
      const persisted = await fetch(`http://127.0.0.1:${secondServer.address().port}/api/properties`);
      assert.equal((await persisted.json())[0].id, property.id);
      const persistedSession = await fetch(`http://127.0.0.1:${secondServer.address().port}/api/admin/properties`, { headers: { Cookie: cookie } });
      assert.equal(persistedSession.status, 200);
    } finally { await new Promise(resolve => secondServer.close(resolve)); }
    assert.equal((await request(`/api/properties/${property.id}/status`, json('PATCH', { status: 'unavailable' }, session.csrfToken))).status, 200);
    assert.equal((await (await request('/api/properties')).json()).length, 0);
    assert.equal((await (await request('/api/admin/properties')).json()).length, 1);
    assert.equal((await request(`/api/properties/${property.id}/status`, json('PATCH', { status: 'available' }, session.csrfToken))).status, 200);
    assert.equal((await (await request('/api/properties')).json()).length, 1);
    assert.equal((await request(`/api/properties/${property.id}`, json('DELETE', undefined, session.csrfToken))).status, 200);
    assert.equal((await request(property.photo)).status, 404);
    assert.equal((await (await request('/api/admin/properties')).json()).length, 0);
    assert.equal((await request(`/api/properties/${property.id}`, json('DELETE', undefined, session.csrfToken))).status, 404);
    assert.equal((await request('/api/logout', json('POST', {}, session.csrfToken))).status, 200);
    assert.equal((await request('/api/admin/properties')).status, 401);
  } finally {
    await new Promise(resolve => server.close(resolve));
    // Limpeza restrita à pasta temporária exata criada por este teste.
    const target = path.resolve(directory);
    assert.equal(path.dirname(target), path.resolve(os.tmpdir()));
    assert.ok(path.basename(target).startsWith('imobiliaria-test-'));
    fs.rmSync(target, { recursive: true, force: true });
  }
});
