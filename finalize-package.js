const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const root = __dirname;
const indexPath = path.join(root, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

const ronnyOld = '<li><strong>Ronny:</strong> Fachmann für Decentralized Finance und Blockchaintechnologie</li>';
const ronnyNew = '<li><strong>Ronny Butzke:</strong> Fachmann für Decentralized Finance und Blockchaintechnologie</li>';
if (html.includes(ronnyOld)) html = html.replace(ronnyOld, ronnyNew);
if (!html.includes(ronnyNew)) throw new Error('Ronny Butzke team entry is missing.');

const feedbackCss = `
/* CASE VIDEO LABEL POSITION FIX */
.case-video .vid-label{
  position:static!important;
  display:block!important;
  left:auto!important;
  top:auto!important;
  border:0!important;
  border-bottom:1px solid rgba(198,162,42,.12)!important;
  border-radius:0!important;
  background:transparent!important;
  backdrop-filter:none!important;
}
`;
if (!html.includes('/* CASE VIDEO LABEL POSITION FIX */')) {
  html = html.replace('</style>', `${feedbackCss}\n</style>`);
}

const requiredWebsiteMarkers = [
  '<strong>Ronny Butzke:</strong>',
  '/* CASE VIDEO LABEL POSITION FIX */',
  'id="video-bootstrap"',
  '1599406528431495',
  'Microsoft Clarity',
  'calendar.app.google/sDXSGovL4Bjy41RB8'
];
for (const marker of requiredWebsiteMarkers) {
  if (!html.includes(marker)) throw new Error(`Final website marker missing: ${marker}`);
}

fs.writeFileSync(indexPath, html, 'utf8');
console.log('Final text and feedback-label corrections applied.');

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date = new Date()) {
  const year = Math.max(1980, date.getFullYear());
  const dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const dosDate = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { dosTime, dosDate };
}

function collectFiles(dir, prefix = '') {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const name of fs.readdirSync(dir).sort()) {
    const full = path.join(dir, name);
    const rel = prefix ? `${prefix}/${name}` : name;
    const stat = fs.statSync(full);
    if (stat.isDirectory()) out.push(...collectFiles(full, rel));
    else if (stat.isFile()) out.push({ full, rel: rel.replace(/\\/g, '/') });
  }
  return out;
}

function createZip(entries, outputPath) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  const { dosTime, dosDate } = dosDateTime();

  for (const entry of entries) {
    const name = Buffer.from(entry.rel, 'utf8');
    const data = fs.readFileSync(entry.full);
    const compressed = zlib.deflateRawSync(data, { level: 9 });
    const crc = crc32(data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt16LE(dosTime, 10);
    local.writeUInt16LE(dosDate, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    localParts.push(local, name, compressed);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(dosTime, 12);
    central.writeUInt16LE(dosDate, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, name);

    offset += local.length + name.length + compressed.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  fs.writeFileSync(outputPath, Buffer.concat([...localParts, centralDirectory, end]));
}

const rootFiles = [
  'index.html',
  'datenschutz.html',
  'impressum.html',
  'agb.html',
  'robots.txt',
  'sitemap.xml',
  'site.webmanifest'
].filter((name) => fs.existsSync(path.join(root, name)))
 .map((name) => ({ full: path.join(root, name), rel: name }));

const assetFiles = collectFiles(path.join(root, 'assets'), 'assets');
if (!assetFiles.length) throw new Error('No website images were found in assets/.');

const zipPath = path.join(root, 'Julian-Arndt-Website-FINAL.zip');
createZip([...rootFiles, ...assetFiles], zipPath);

const zipSize = fs.statSync(zipPath).size;
if (!zipSize) throw new Error('The generated website ZIP is empty.');
console.log(`Final website packaged: ${path.basename(zipPath)} (${zipSize} bytes, ${rootFiles.length + assetFiles.length} files).`);
