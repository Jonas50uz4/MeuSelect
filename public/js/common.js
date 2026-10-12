// Funções compartilhadas pelas três telas. Sem framework e sem HTML inserido pelos usuários.
window.appUI = {
  fillSelect(select, values, placeholder) {
    const options = [new Option(placeholder, ''), ...values.map(value => new Option(value, value))];
    select.replaceChildren(...options);
  },
  async request(url, options = {}) {
    let response;
    try { response = await fetch(url, options); }
    catch { throw new Error('Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.'); }
    let data;
    try { data = await response.json(); }
    catch { data = null; }
    if (!response.ok) {
      const error = new Error(typeof data?.error === 'string' ? data.error : 'Não foi possível concluir a solicitação. Tente novamente.');
      error.status = response.status;
      throw error;
    }
    if (data === null) throw new Error('O servidor retornou uma resposta inválida. Tente novamente.');
    return data;
  },
  card(property) {
    const article = document.createElement('article');
    article.className = 'card';
    const photo = document.createElement('img');
    photo.src = property.photo;
    photo.alt = property.title;
    photo.loading = 'lazy';
    const body = document.createElement('div');
    body.className = 'card-body';
    const title = document.createElement('h3');
    title.textContent = property.title;
    const price = document.createElement('p');
    price.className = 'price';
    price.textContent = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(property.price);
    const description = document.createElement('p');
    description.className = 'description';
    description.textContent = property.description;
    const details = document.createElement('p');
    details.className = 'property-details';
    details.textContent = [property.type, property.city, property.neighborhood || 'Centro', property.condominium].filter(Boolean).join(' • ');
    const code = document.createElement('small');
    code.textContent = `Código: ${property.code || property.id}`;
    body.append(title, details, price, description, code);
    article.append(photo, body);
    return { article, body };
  }
};
