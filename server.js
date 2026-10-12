require('dotenv').config({ quiet: true });
const express = require('express');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const { rateLimit } = require('express-rate-limit');
const helmet = require('helmet');
const multer = require('multer');
const sharp = require('sharp');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID, randomBytes, scryptSync, timingSafeEqual } = require('node:crypto');
const { createStore } = require('./src/store');
const propertyCatalog = require('./public/js/property-catalog');

function createApp(config = process.env) {
  const { SESSION_SECRET, BROKER_EMAIL, BROKER_PASSWORD } = config;
  if (!SESSION_SECRET || SESSION_SECRET.length < 32 || SESSION_SECRET.startsWith('SUBSTITUA') ||
      !BROKER_EMAIL || !BROKER_PASSWORD || BROKER_PASSWORD.length < 12 || BROKER_PASSWORD.length > 256 || BROKER_PASSWORD.startsWith('SUBSTITUA')) {
    throw new Error('Configure SESSION_SECRET, BROKER_EMAIL e BROKER_PASSWORD no .env. Veja o README.');
  }
  const production = config.NODE_ENV === 'production';
  const directory = path.resolve(config.DATA_DIR || path.join(__dirname, 'storage'));
  const uploads = path.join(directory, 'uploads');
  fs.mkdirSync(uploads, { recursive: true });
  const store = createStore(directory);
  const previousProperties = store.read();
  if (previousProperties.some(property => !property.neighborhood || !property.code)) {
    store.write(previousProperties.map(property => ({ ...property,
      neighborhood: property.neighborhood || 'Centro',
      code: property.code || `IMV-${property.id.replaceAll('-', '').slice(0, 12).toUpperCase()}` })));
  }
  const salt = randomBytes(16);
  const passwordHash = scryptSync(BROKER_PASSWORD, salt, 64);
  const app = express();
  app.disable('x-powered-by');
  if (production) app.set('trust proxy', 1); // Render termina o HTTPS antes do Node.
  app.use(helmet({
    // Só a listagem pública será embutida no Wix.
    frameguard: false,
    contentSecurityPolicy: { directives: {
      'frame-ancestors': ['*'],
      'upgrade-insecure-requests': production ? [] : null
    } },
    strictTransportSecurity: production ? undefined : false
  }));
  app.use(express.json({ limit: '16kb' }));
  app.use('/api', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  // CORS é liberado apenas para leitura dos imóveis disponíveis.
  app.use('/api/properties', (req, res, next) => {
    if (req.method === 'GET' && config.WIX_ORIGIN && req.headers.origin === config.WIX_ORIGIN) {
      res.set('Access-Control-Allow-Origin', config.WIX_ORIGIN);
    }
    res.vary('Origin');
    next();
  });
  app.get('/api/properties', (req, res) => {
    res.json(store.read().filter(property => property.status === 'available'));
  });
  app.get('/health', (req, res) => res.json({ status: 'ok' }));
  app.use('/uploads', (req, res, next) => {
    // Fotos públicas também podem aparecer em elementos de imagem do Wix.
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
  }, express.static(uploads, { dotfiles: 'deny' }));
  app.use('/css', express.static(path.join(__dirname, 'public/css')));
  app.use('/media', express.static(path.join(__dirname, 'public/media'), { dotfiles: 'deny' }));
  app.use('/js', express.static(path.join(__dirname, 'public/js')));
  app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public/index.html')));

  const sessionStore = new FileStore({ path: path.join(directory, 'sessions'), ttl: 8 * 60 * 60, retries: 0, logFn: () => {} });
  // Sessão com duração fixa: leituras não regravam o arquivo nem prorrogam o login.
  // Evita gravações simultâneas de touch em disco, especialmente no Windows.
  sessionStore.touch = undefined;
  app.use(session({
    name: 'imobiliaria.sid', secret: SESSION_SECRET,
    resave: false, saveUninitialized: false,
    store: sessionStore,
    cookie: { httpOnly: true, secure: production, sameSite: 'lax', maxAge: 8 * 60 * 60 * 1000 }
  }));
  app.use((req, res, next) => {
    res.set('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'self'; form-action 'self'; base-uri 'self'; object-src 'none'");
    res.set('X-Frame-Options', 'SAMEORIGIN');
    next();
  });
  app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public/login.html')));
  function authenticated(req, res, next) {
    if (!req.session.broker) return res.status(401).json({ error: 'Faça login para continuar.' });
    next();
  }
  function csrf(req, res, next) {
    if (!req.session.csrf || req.get('X-CSRF-Token') !== req.session.csrf) {
      return res.status(403).json({ error: 'Sessão inválida. Recarregue a página.' });
    }
    next();
  }
  app.get('/dashboard', (req, res) => {
    if (!req.session.broker) return res.redirect('/login');
    res.set('Cache-Control', 'no-store');
    res.sendFile(path.join(__dirname, 'public/dashboard.html'));
  });
  app.get('/api/session', (req, res) => {
    req.session.csrf ||= randomBytes(32).toString('hex');
    res.json({ broker: req.session.broker || null, csrfToken: req.session.csrf });
  });
  const loginLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10,
    standardHeaders: 'draft-8', legacyHeaders: false,
    message: { error: 'Muitas tentativas de login. Aguarde 15 minutos.' } });
  app.post('/api/login', loginLimit, csrf, (req, res, next) => {
    const { email, password } = req.body || {};
    if (typeof email !== 'string' || typeof password !== 'string' || password.length > 256) {
      return res.status(400).json({ error: 'Informe e-mail e senha válidos.' });
    }
    const validPassword = timingSafeEqual(scryptSync(password, salt, 64), passwordHash);
    if (email.trim().toLowerCase() !== BROKER_EMAIL.trim().toLowerCase() || !validPassword) {
      return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
    }
    req.session.regenerate(error => {
      if (error) return next(error);
      req.session.broker = { email: BROKER_EMAIL };
      req.session.csrf = randomBytes(32).toString('hex');
      req.session.save(error => error ? next(error) : res.json({ message: 'Login realizado.' }));
    });
  });
  app.post('/api/logout', authenticated, csrf, (req, res, next) => {
    req.session.destroy(error => {
      if (error) return next(error);
      res.clearCookie('imobiliaria.sid', { httpOnly: true, secure: production, sameSite: 'lax' });
      res.json({ message: 'Você saiu.' });
    });
  });
  app.get('/api/admin/properties', authenticated, (req, res) => res.json(store.read()));
  const upload = multer({ storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 7, parts: 8 },
    fileFilter: (req, file, callback) => {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
        const error = new Error('Envie uma foto JPG, PNG ou WebP.');
        error.status = 400;
        return callback(error);
      }
      callback(null, true);
    }
  });
  app.post('/api/properties', authenticated, csrf, upload.single('photo'), async (req, res) => {
    const { title, description, price } = req.body || {};
    const { type, city, neighborhood = 'Centro', condominium = '' } = req.body || {};
    const numericPrice = Number(price);
    if (typeof title !== 'string' || title.trim().length < 3 || title.trim().length > 120 ||
        typeof description !== 'string' || !description.trim() || description.length > 5000 ||
        !Number.isFinite(numericPrice) || numericPrice < 0.01 || numericPrice > 1e12 || !req.file) {
      return res.status(400).json({ error: 'Informe título (3–120 caracteres), preço positivo, descrição (até 5.000 caracteres) e foto.' });
    }
    if (!propertyCatalog.types.includes(type) || !propertyCatalog.cities.includes(city) ||
        !propertyCatalog.neighborhoods.includes(neighborhood) ||
        (condominium !== '' && !propertyCatalog.condominiums.includes(condominium))) {
      return res.status(400).json({ error: 'Selecione um tipo de imóvel, cidade, bairro e condomínio válidos.' });
    }
    const id = randomUUID();
    const photoPath = path.join(uploads, `${id}.jpg`);
    let image;
    try {
      // Decodificar e converter verifica o conteúdo real e remove metadados da foto.
      const decoder = sharp(req.file.buffer, { limitInputPixels: 25_000_000 });
      const metadata = await decoder.metadata();
      if (!['jpeg', 'png', 'webp'].includes(metadata.format)) throw new Error('Formato de imagem inválido.');
      image = await decoder
        .rotate().resize({ width: 1600, height: 1200, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 }).toBuffer();
    } catch {
      return res.status(400).json({ error: 'Foto inválida ou grande demais. Use JPG, PNG ou WebP de até 5 MB e 25 megapixels.' });
    }
    const property = { id, title: title.trim(), price: Math.round(numericPrice * 100) / 100,
      type, city, neighborhood, condominium, code: `IMV-${id.replaceAll('-', '').slice(0, 12).toUpperCase()}`,
      description: description.trim(), photo: `/uploads/${id}.jpg`, status: 'available', createdAt: new Date().toISOString() };
    fs.writeFileSync(photoPath, image);
    try { store.write([property, ...store.read()]); }
    catch (error) { fs.unlinkSync(photoPath); throw error; }
    res.status(201).json(property);
  });
  app.patch('/api/properties/:id/status', authenticated, csrf, (req, res) => {
    if (!['available', 'unavailable'].includes(req.body?.status)) {
      return res.status(400).json({ error: 'Status inválido.' });
    }
    const properties = store.read();
    const property = properties.find(item => item.id === req.params.id);
    if (!property) return res.status(404).json({ error: 'Imóvel não encontrado.' });
    property.status = req.body.status;
    store.write(properties);
    res.json(property);
  });
  app.delete('/api/properties/:id', authenticated, csrf, (req, res) => {
    const properties = store.read();
    const property = properties.find(item => item.id === req.params.id);
    if (!property) return res.status(404).json({ error: 'Imóvel não encontrado.' });
    store.write(properties.filter(item => item.id !== property.id));
    const photoPath = path.join(uploads, `${property.id}.jpg`);
    try { fs.unlinkSync(photoPath); } catch (error) { if (error.code !== 'ENOENT') console.error('Não foi possível remover a foto:', error.message); }
    res.json({ message: 'Imóvel excluído.' });
  });
  app.use((req, res) => res.status(404).json({ error: 'Página ou recurso não encontrado.' }));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error instanceof multer.MulterError) return res.status(400).json({ error: 'Envie apenas uma foto de até 5 MB e os campos do formulário.' });
    const status = error.status >= 400 && error.status < 500 ? error.status : 500;
    if (status === 500) console.error(error);
    res.status(status).json({ error: status === 500 ? 'Não foi possível concluir. Tente novamente.' : error.message });
  });
  return app;
}

if (require.main === module) {
  try {
    const app = createApp();
    const port = Number(process.env.PORT || 3000);
    app.listen(port, () => console.log(`Imobiliária disponível em http://localhost:${port}`));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { createApp };
