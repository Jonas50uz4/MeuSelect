// Armazenamento simples para aprender: um processo Node e arquivos em disco.
const fs = require('node:fs');
const path = require('node:path');

function createStore(directory) {
  fs.mkdirSync(directory, { recursive: true });
  const file = path.join(directory, 'properties.json');
  if (!fs.existsSync(file)) fs.writeFileSync(file, '[]');

  function read() {
    const properties = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!Array.isArray(properties)) throw new Error('Arquivo de imóveis inválido.');
    return properties;
  }

  function write(properties) {
    // Primeiro escreve outro arquivo; depois substitui o arquivo principal.
    // As operações síncronas evitam gravações concorrentes neste único processo.
    fs.writeFileSync(`${file}.tmp`, JSON.stringify(properties, null, 2));
    fs.renameSync(`${file}.tmp`, file);
  }

  return { read, write };
}

module.exports = { createStore };
