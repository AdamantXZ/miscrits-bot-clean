// parse_miscrits.js
// Uso: node parse_miscrits.js
// Lê miscrits_raw.txt e gera data/miscrits.json

const fs = require('fs');
const path = require('path');

const rawPath = path.join(__dirname, 'miscrits_raw.txt');
const outPath = path.join(__dirname, 'data', 'miscrits.json');

if (!fs.existsSync(rawPath)) {
  console.error('Arquivo miscrits_raw.txt não encontrado em', rawPath);
  process.exit(1);
}

const raw = fs.readFileSync(rawPath, 'utf8').trim();

// quebra em linhas, descartando linhas vazias
const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);

const result = {};

lines.forEach((line, idx) => {
  // tenta dividir por tab ou por sequências de 2+ espaços
  // mantém possíveis urls que contenham espaços codificados (raros)
  const cols = line.split(/\t+| {2,}/).map(c => c.trim());

  // Se sobrou menos de 8 colunas, tenta separar por tab único ainda
  while (cols.length < 9 && line.includes('\t')) {
    // forca split por tab simples
    const c2 = line.split('\t').map(c => c.trim());
    if (c2.length >= cols.length) {
      cols.length = 0;
      c2.forEach(v => cols.push(v));
      break;
    } else break;
  }

  // Normaliza tamanho: esperamos 9 colunas (nome, img1, region, spawn_loc, spawn_img, day, type, rarity, pvp)
  // Se houver mais colunas, juntamos as extras no último campo
  if (cols.length < 9) {
    // preenche com strings vazias se faltar
    while (cols.length < 9) cols.push('');
  } else if (cols.length > 9) {
    // junta colunas extras a partir da 9ª (caso tenham tabs extras)
    const first8 = cols.slice(0, 8);
    const rest = cols.slice(8).join(' ');
    cols.length = 0;
    first8.forEach(v => cols.push(v));
    cols.push(rest);
  }

  const [
    rawName,
    mainImage,
    region,
    spawnLocation,
    spawnImage,
    spawnDays,
    tipo,
    rarity,
    pvpStatus
  ] = cols;

  const name = rawName.trim();
  if (!name) return;

  // chave pra lookup (lowercase sem acentos simples e espaços -> snake)
  const key = name.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');

  const entry = {
    name: name,
    mainImage: mainImage || '',
    spawn_image: spawnImage || '',
    spawn_days: spawnDays || '',
    type: tipo || '',
    rarity: rarity || '',
    pvp_status: pvpStatus || '',
    region: region || '',
    spawn_location: spawnLocation || ''
  };

  // Se a coluna region for exatamente "Shop" (ou "Shop\t..."), interpretamos como shop:
  if (/^shop$/i.test(region.trim())) {
    entry.region = '';
    entry.spawn_location = '';
    entry.spawn_image = '';
    entry.location = 'Shop'; // campo extra para facilitar o embed "Location: Shop"
  }

  result[key] = entry;
});

// escreve JSON formatado
fs.writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf8');
console.log(`Gerado ${outPath} com ${Object.keys(result).length} entradas.`);
