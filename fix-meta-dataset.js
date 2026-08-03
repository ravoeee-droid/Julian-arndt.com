const fs = require('fs');
const path = require('path');

const OLD_PIXEL_ID = '1599406528431495';
const ACTIVE_PIXEL_ID = '1789508675795500';

const files = {
  html: path.join(__dirname, 'dist', 'index.html'),
  lead: path.join(__dirname, 'api', 'lead.js'),
  schedule: path.join(__dirname, 'api', 'schedule.js')
};

for (const [name, filePath] of Object.entries(files)) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Meta dataset fix could not find ${name}: ${filePath}`);
  }
}

function replacePixelId(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  const updated = source.split(OLD_PIXEL_ID).join(ACTIVE_PIXEL_ID);
  fs.writeFileSync(filePath, updated, 'utf8');
  return updated;
}

const html = replacePixelId(files.html);
let lead = replacePixelId(files.lead);
let schedule = replacePixelId(files.schedule);

// There is only one active Meta dataset for this ad account. Force CAPI to use it,
// even when an obsolete META_PIXEL_ID environment variable still exists in Vercel.
lead = lead.replace(
  "const pixelId = process.env.META_PIXEL_ID || DEFAULT_PIXEL_ID;",
  "const pixelId = DEFAULT_PIXEL_ID;"
);
schedule = schedule.replace(
  "const pixelId = cleanText(process.env.META_PIXEL_ID || DEFAULT_PIXEL_ID, 80);",
  "const pixelId = DEFAULT_PIXEL_ID;"
);

fs.writeFileSync(files.lead, lead, 'utf8');
fs.writeFileSync(files.schedule, schedule, 'utf8');

if (!html.includes(ACTIVE_PIXEL_ID) || html.includes(OLD_PIXEL_ID)) {
  throw new Error('Production HTML is not aligned with the active Meta dataset.');
}
if (!lead.includes(`const DEFAULT_PIXEL_ID = '${ACTIVE_PIXEL_ID}'`) ||
    !lead.includes('const pixelId = DEFAULT_PIXEL_ID;')) {
  throw new Error('Lead CAPI is not locked to the active Meta dataset.');
}
if (!schedule.includes(`const DEFAULT_PIXEL_ID = '${ACTIVE_PIXEL_ID}'`) ||
    !schedule.includes('const pixelId = DEFAULT_PIXEL_ID;')) {
  throw new Error('Schedule CAPI is not locked to the active Meta dataset.');
}

console.log(`Meta browser Pixel and CAPI aligned to dataset ${ACTIVE_PIXEL_ID}.`);
