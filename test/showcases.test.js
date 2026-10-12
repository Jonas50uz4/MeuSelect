const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildShowcases, visibleAds, createRotation } = require('../public/js/showcases');

test('cinco vitrines seguem a ordem solicitada com números de três dígitos', () => {
  const groups = buildShowcases();
  assert.deepEqual(groups.map(group => group.title), ['Lançamento', 'Ofertas', 'Novidades', 'Casas em condomínios', 'Empreendimentos']);
  const names = groups.flatMap(group => group.ads.map(ad => ad.title));
  assert.equal(new Set(names).size, 40);
  assert.ok(names.every(name => /^Anúncio \d{3}$/.test(name)));
  groups.forEach(group => assert.equal(visibleAds(group.ads, 0, 4).length, 4));
});
test('quatro anúncios permanecem visíveis ao passar do último para o primeiro', () => {
  const ads = buildShowcases()[0].ads;
  assert.deepEqual(visibleAds(ads, 7, 4).map(ad => ad.title), ['Anúncio 108', 'Anúncio 101', 'Anúncio 102', 'Anúncio 103']);
});
test('troca automática ocorre a cada quatro segundos e setas percorrem circularmente', () => {
  let tick;
  let delay;
  let current;
  let manual;
  const rotation = createRotation({ total: 8, onChange: (index, isManual) => { current = index; manual = isManual; },
    setTimer(callback, milliseconds) { tick = callback; delay = milliseconds; return 1; }, clearTimer() {} });
  assert.equal(delay, 4000);
  tick(); assert.equal(current, 1); assert.equal(manual, false);
  rotation.previous(); assert.equal(current, 0); assert.equal(manual, true);
  rotation.previous(); assert.equal(current, 7);
  rotation.next(); assert.equal(current, 0);
  rotation.destroy();
});
test('pausa por foco, mouse ou usuário só retoma quando todas as pausas terminam', () => {
  const active = new Set();
  let id = 0;
  const rotation = createRotation({ total: 8, onChange() {},
    setTimer() { active.add(++id); return id; }, clearTimer(timer) { active.delete(timer); } });
  assert.equal(active.size, 1);
  rotation.pause('hover', true); assert.equal(active.size, 0);
  rotation.pause('manual', true);
  rotation.pause('hover', false); assert.equal(active.size, 0);
  rotation.pause('manual', false); assert.equal(active.size, 1);
  rotation.pause('focus', true); assert.equal(active.size, 0);
  rotation.pause('focus', false); assert.equal(active.size, 1);
  rotation.destroy(); assert.equal(active.size, 0);
});
