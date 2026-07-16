const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');

const payloadDir = path.join(__dirname, 'static-payload');
const payloadFiles = fs.readdirSync(payloadDir)
  .filter((name) => /^payload-\d{3}\.txt$/.test(name))
  .sort();

if (payloadFiles.length !== 8) {
  throw new Error(`Expected 8 payload chunks, found ${payloadFiles.length}.`);
}

const encodedPayload = payloadFiles
  .map((name) => fs.readFileSync(path.join(payloadDir, name), 'utf8').trim())
  .join('');

const indexBuffer = zlib.brotliDecompressSync(Buffer.from(encodedPayload, 'base64'));
const sha256 = crypto.createHash('sha256').update(indexBuffer).digest('hex');
const expectedSha256 = '33eff936c7b37ce8b332933b986ffec9564d46b70195a42d17ba47769a328f10';

if (sha256 !== expectedSha256) {
  throw new Error(`Static site payload mismatch: ${sha256}`);
}

const indexHtml = indexBuffer.toString('utf8');
const requiredMarkers = [
  'id="video-bootstrap"',
  'zoAF6ZmVsOM',
  'data-video-id="-IjwKAos27M"',
  'data-video-id="_p1g88NG4Ho"',
  'data-video-id="diTTCbliMpI"',
  '90 Tagen',
  'Microsoft Clarity',
  'calendar.app.google/sDXSGovL4Bjy41RB8'
];

for (const marker of requiredMarkers) {
  if (!indexHtml.includes(marker)) {
    throw new Error(`Required website marker is missing: ${marker}`);
  }
}

fs.writeFileSync(path.join(__dirname, 'index.html'), indexBuffer);
console.log(`Static website ready: ${indexBuffer.length} bytes, SHA-256 ${sha256}`);
