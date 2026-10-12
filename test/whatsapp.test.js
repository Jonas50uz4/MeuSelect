const { test } = require('node:test');
const assert = require('node:assert/strict');
const { makeWhatsappUrl } = require('../public/js/whatsapp');

test('WhatsApp Web recebe o número informado e a mensagem pronta', () => {
  const message = 'Olá, estou olhando o site e tem interesse em um imóvel';
  const url = new URL(makeWhatsappUrl('+55 (51) 99624-0974', message));
  assert.equal(url.origin, 'https://web.whatsapp.com');
  assert.equal(url.pathname, '/send');
  assert.equal(url.searchParams.get('phone'), '5551996240974');
  assert.equal(url.searchParams.get('text'), message);
});
test('mensagem editada preserva acentos, quebras de linha e caracteres especiais', () => {
  const message = 'Olá! Quero o Anúncio 101 & 202.\nPreço? #interesse';
  const url = new URL(makeWhatsappUrl('+5551996240974', message));
  assert.equal(url.searchParams.get('text'), message);
  assert.equal([...url.searchParams.keys()].length, 2);
});
test('mensagem vazia, longa ou número inválido não gera link', () => {
  assert.throws(() => makeWhatsappUrl('+5551996240974', '   '), /Escreva uma mensagem/);
  assert.throws(() => makeWhatsappUrl('+5551996240974', 'x'.repeat(2001)), /2.000/);
  assert.throws(() => makeWhatsappUrl('', 'Olá'), /número/);
  assert.throws(() => makeWhatsappUrl('javascript:123456789', 'Olá'), /número/);
});
