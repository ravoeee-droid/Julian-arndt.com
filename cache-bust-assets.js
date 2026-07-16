const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = __dirname;
const dist = path.join(root, 'dist');
const zipPath = path.join(root, 'Julian-Arndt-Website-FINAL-MIT-BILDERN.zip');

if (!fs.existsSync(dist)) throw new Error('dist/ is missing. Run deploy-uploaded-site.js first.');
if (!fs.existsSync(zipPath)) throw new Error('Website ZIP is missing.');

const version = crypto.createHash('sha256').update(fs.readFileSync(zipPath)).digest('hex').slice(0, 12);
const assetPattern = /assets\/[A-Za-z0-9._/-]+\.(?:webp|png|jpe?g|ico)(?![?A-Za-z0-9._/-])/gi;
const textExtensions = new Set(['.html', '.css', '.js', '.json', '.webmanifest', '.xml']);
let updatedFiles = 0;
let updatedReferences = 0;

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
      continue;
    }
    if (!entry.isFile() || !textExtensions.has(path.extname(entry.name).toLowerCase())) continue;

    const before = fs.readFileSync(full, 'utf8');
    const after = before.replace(assetPattern, (match) => {
      updatedReferences += 1;
      return `${match}?v=${version}`;
    });

    if (after !== before) {
      fs.writeFileSync(full, after, 'utf8');
      updatedFiles += 1;
    }
  }
}

walk(dist);

const indexPath = path.join(dist, 'index.html');
const indexHtml = fs.readFileSync(indexPath, 'utf8');
const required = [
  `assets/hero-thumbnail.webp?v=${version}`,
  `assets/julian-portrait.webp?v=${version}`,
  `assets/julian-analysis.webp?v=${version}`,
  `assets/julian-brand.webp?v=${version}`,
  `assets/julian-handshake.webp?v=${version}`,
  `assets/julian-meeting.webp?v=${version}`,
  `assets/defi-premium-signet.webp?v=${version}`
];
for (const marker of required) {
  if (!indexHtml.includes(marker)) throw new Error(`Versioned asset reference missing: ${marker}`);
}

console.log(`Asset cache busted with version ${version}: ${updatedReferences} references in ${updatedFiles} files.`);
