// Uma única lista usada pelo cadastro, pela pesquisa e pela validação do servidor.
const propertyCatalog = {
  types: ['Apartamento', 'Casa', 'Casa em condomínio', 'Loft', 'Terreno'],
  cities: ['Capão da Canoa', 'Xangri-lá', 'Osório'],
  neighborhoods: ['Centro'],
  condominiums: ['Enseada']
};
if (typeof module !== 'undefined' && module.exports) module.exports = propertyCatalog;
else window.propertyCatalog = propertyCatalog;
