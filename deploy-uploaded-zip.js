const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const root = __dirname;
const zipPath = path.join(root, 'Julian-Arndt-Website-FINAL-MIT-BILDERN.zip');

if (!fs.existsSync(zipPath)) {
  throw new Error(`Uploaded website ZIP is missing: ${path.basename(zipPath)}`);
}

const buffer = fs.readFileSync(zipPath);

function findEndOfCentralDirectory(buf) {
  const min = Math.max(0, buf.length - 65557);
  for (let i = buf.length - 22; i >= min; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) return i;
  }
  throw new Error('ZIP central directory could not be found.');
}

const eocd = findEndOfCentralDirectory(buffer);
const entryCount = buffer.readUInt16LE(eocd + 10);
const centralOffset = buffer.readUInt32LE(eocd + 16);
let cursor = centralOffset;
const extracted = [];

for (let index = 0; index < entryCount; index++) {
  if (buffer.readUInt32LE(cursor) !== 0x02014b50) {
    throw new Error(`Invalid ZIP central directory entry at ${cursor}.`);
  }

  const compression = buffer.readUInt16LE(cursor + 10);
  const compressedSize = buffer.readUInt32LE(cursor + 20);
  const uncompressedSize = buffer.readUInt32LE(cursor + 24);
  const nameLength = buffer.readUInt16LE(cursor + 28);
  const extraLength = buffer.readUInt16LE(cursor + 30);
  const commentLength = buffer.readUInt16LE(cursor + 32);
  const localOffset = buffer.readUInt32LE(cursor + 42);
  const name = buffer.subarray(cursor + 46, cursor + 46 + nameLength).toString('utf8');

  cursor += 46 + nameLength + extraLength + commentLength;

  if (!name || name.endsWith('/')) continue;

  const normalized = path.posix.normalize(name).replace(/^\/+/, '');
  if (normalized.startsWith('../') || normalized.includes('/../')) {
    throw new Error(`Unsafe ZIP path: ${name}`);
  }

  if (buffer.readUInt32LE(localOffset) !== 0x04034b50) {
    throw new Error(`Invalid ZIP local header for ${name}.`);
  }

  const localNameLength = buffer.readUInt16LE(localOffset + 26);
  const localExtraLength = buffer.readUInt16LE(localOffset + 28);
  const dataStart = localOffset + 30 + localNameLength + localExtraLength;
  const compressed = buffer.subarray(dataStart, dataStart + compressedSize);

  let data;
  if (compression === 0) data = compressed;
  else if (compression === 8) data = zlib.inflateRawSync(compressed);
  else throw new Error(`Unsupported ZIP compression method ${compression} for ${name}.`);

  if (data.length !== uncompressedSize) {
    throw new Error(`Size mismatch while extracting ${name}.`);
  }

  const destination = path.join(root, normalized);
  const resolved = path.resolve(destination);
  if (!resolved.startsWith(path.resolve(root) + path.sep)) {
    throw new Error(`ZIP path escaped project root: ${name}`);
  }

  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, data);
  extracted.push(normalized);
}

const requiredFiles = [
  'index.html',
  'impressum.html',
  'datenschutz.html',
  'agb.html',
  'assets/hero-thumbnail.webp',
  'assets/julian-portrait.webp',
  'assets/julian-brand.webp'
];

for (const file of requiredFiles) {
  const fullPath = path.join(root, file);
  if (!fs.existsSync(fullPath) || fs.statSync(fullPath).size === 0) {
    throw new Error(`Required extracted file is missing or empty: ${file}`);
  }
}

const imageExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp', '.ico']);
const imageFiles = extracted.filter((file) => imageExtensions.has(path.extname(file).toLowerCase()));
if (imageFiles.length < 12) {
  throw new Error(`Too few images extracted: ${imageFiles.length}.`);
}

const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const requiredMarkers = [
  'Ronny Butzke',
  'id="video-bootstrap"',
  'Microsoft Clarity',
  '1599406528431495',
  'calendar.app.google/sDXSGovL4Bjy41RB8'
];
for (const marker of requiredMarkers) {
  if (!html.includes(marker)) throw new Error(`Required website marker is missing: ${marker}`);
}

console.log(`Website ZIP extracted successfully: ${extracted.length} files, ${imageFiles.length} images.`);
