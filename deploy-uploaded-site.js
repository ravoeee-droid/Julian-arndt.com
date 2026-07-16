const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const root = __dirname;
const zipPath = path.join(root, 'Julian-Arndt-Website-FINAL-MIT-BILDERN.zip');
const outputDir = path.join(root, 'dist');

if (!fs.existsSync(zipPath)) {
  throw new Error(`Uploaded website ZIP is missing: ${path.basename(zipPath)}`);
}

const zip = fs.readFileSync(zipPath);

function findEndOfCentralDirectory(buffer) {
  const signature = 0x06054b50;
  const min = Math.max(0, buffer.length - 0xffff - 22);
  for (let offset = buffer.length - 22; offset >= min; offset--) {
    if (buffer.readUInt32LE(offset) === signature) return offset;
  }
  throw new Error('ZIP end-of-central-directory record was not found.');
}

function safeRelativePath(name) {
  const normalized = name.replace(/\\/g, '/').replace(/^\/+/, '');
  if (!normalized || normalized.endsWith('/')) return null;
  const parts = normalized.split('/');
  if (parts.some((part) => part === '..' || part === '')) {
    throw new Error(`Unsafe ZIP entry path: ${name}`);
  }
  return normalized;
}

function extractZip(buffer, destination) {
  const eocd = findEndOfCentralDirectory(buffer);
  const entryCount = buffer.readUInt16LE(eocd + 10);
  const centralOffset = buffer.readUInt32LE(eocd + 16);
  let cursor = centralOffset;
  const extracted = [];

  fs.rmSync(destination, { recursive: true, force: true });
  fs.mkdirSync(destination, { recursive: true });

  for (let index = 0; index < entryCount; index++) {
    if (buffer.readUInt32LE(cursor) !== 0x02014b50) {
      throw new Error(`Invalid central-directory entry at offset ${cursor}.`);
    }

    const compressionMethod = buffer.readUInt16LE(cursor + 10);
    const compressedSize = buffer.readUInt32LE(cursor + 20);
    const uncompressedSize = buffer.readUInt32LE(cursor + 24);
    const nameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const localOffset = buffer.readUInt32LE(cursor + 42);
    const entryName = buffer.subarray(cursor + 46, cursor + 46 + nameLength).toString('utf8');
    cursor += 46 + nameLength + extraLength + commentLength;

    const relative = safeRelativePath(entryName);
    if (!relative) continue;

    if (buffer.readUInt32LE(localOffset) !== 0x04034b50) {
      throw new Error(`Invalid local ZIP header for ${entryName}.`);
    }

    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = buffer.subarray(dataStart, dataStart + compressedSize);

    let data;
    if (compressionMethod === 0) {
      data = Buffer.from(compressed);
    } else if (compressionMethod === 8) {
      data = zlib.inflateRawSync(compressed);
    } else {
      throw new Error(`Unsupported ZIP compression method ${compressionMethod} for ${entryName}.`);
    }

    if (data.length !== uncompressedSize) {
      throw new Error(`Extracted size mismatch for ${entryName}: ${data.length} !== ${uncompressedSize}.`);
    }

    const outputPath = path.join(destination, relative);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, data);
    extracted.push(relative);
  }

  return extracted;
}

function assertFile(relative, minimumBytes = 1) {
  const filePath = path.join(outputDir, relative);
  if (!fs.existsSync(filePath)) throw new Error(`Required deployed file is missing: ${relative}`);
  const size = fs.statSync(filePath).size;
  if (size < minimumBytes) throw new Error(`Required deployed file is too small: ${relative} (${size} bytes)`);
  return fs.readFileSync(filePath);
}

function assertImageSignature(relative, type) {
  const data = assertFile(relative, 100);
  let valid = false;
  if (type === 'webp') valid = data.subarray(0, 4).toString('ascii') === 'RIFF' && data.subarray(8, 12).toString('ascii') === 'WEBP';
  if (type === 'png') valid = data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (type === 'jpg') valid = data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
  if (type === 'ico') valid = data.subarray(0, 4).equals(Buffer.from([0x00, 0x00, 0x01, 0x00]));
  if (!valid) throw new Error(`Invalid ${type.toUpperCase()} image signature: ${relative}`);
}

const extracted = extractZip(zip, outputDir);

const requiredImages = [
  ['assets/hero-thumbnail.webp', 'webp'],
  ['assets/julian-analysis.webp', 'webp'],
  ['assets/julian-handshake.webp', 'webp'],
  ['assets/julian-meeting.webp', 'webp'],
  ['assets/julian-portrait.webp', 'webp'],
  ['assets/julian-brand.webp', 'webp'],
  ['assets/defi-premium-signet.webp', 'webp'],
  ['assets/og-image.jpg', 'jpg'],
  ['assets/apple-touch-icon.png', 'png'],
  ['assets/android-chrome-192x192.png', 'png'],
  ['assets/android-chrome-512x512.png', 'png'],
  ['assets/favicon-16.png', 'png'],
  ['assets/favicon-32.png', 'png'],
  ['assets/favicon.ico', 'ico']
];

for (const [relative, type] of requiredImages) assertImageSignature(relative, type);

const indexHtml = assertFile('index.html', 100000).toString('utf8');
const requiredMarkers = [
  'Ronny Butzke',
  'id="video-bootstrap"',
  'MOBILE HERO VIDEO WIDTH FIX',
  'CASE VIDEO LABEL POSITION FIX',
  'Microsoft Clarity',
  '1599406528431495',
  'calendar.app.google/sDXSGovL4Bjy41RB8'
];
for (const marker of requiredMarkers) {
  if (!indexHtml.includes(marker)) throw new Error(`Required website marker missing after extraction: ${marker}`);
}

console.log(`Website ready in dist/: ${extracted.length} files extracted, ${requiredImages.length} image files validated.`);
