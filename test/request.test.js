const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function requestWith(fetch) {
  const context = { window: {}, fetch };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../public/js/common.js'), 'utf8'), context);
  return context.window.appUI.request;
}

test('a interface explica falhas de conexão em português', async () => {
  const request = requestWith(async () => { throw new TypeError('Failed to fetch'); });
  await assert.rejects(request('/api/properties'), /Não foi possível conectar ao servidor/);
});
test('a interface preserva o status de sessão expirada para redirecionar ao login', async () => {
  const request = requestWith(async () => ({ ok: false, status: 401, json: async () => ({ error: 'Faça login para continuar.' }) }));
  await assert.rejects(request('/api/admin/properties'), error => error.status === 401 && error.message === 'Faça login para continuar.');
});
test('a interface trata um erro de hospedagem que retorna HTML', async () => {
  const request = requestWith(async () => ({ ok: false, status: 502, json: async () => { throw new SyntaxError(); } }));
  await assert.rejects(request('/api/properties'), error => error.status === 502 && error.message.includes('Tente novamente'));
});
test('a interface recusa uma resposta de sucesso que não contém JSON válido', async () => {
  const request = requestWith(async () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError(); } }));
  await assert.rejects(request('/api/properties'), /resposta inválida/);
});
