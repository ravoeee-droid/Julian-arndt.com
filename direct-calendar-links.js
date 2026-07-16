const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, 'dist', 'index.html');
const calendarUrl = 'https://calendar.app.google/sDXSGovL4Bjy41RB8';

if (!fs.existsSync(indexPath)) {
  throw new Error('dist/index.html is missing before the direct calendar-link step.');
}

let html = fs.readFileSync(indexPath, 'utf8');
let changed = 0;

function setAttribute(tag, name, value) {
  const attr = new RegExp(`\\s${name}=("[^"]*"|'[^']*')`, 'i');
  if (attr.test(tag)) return tag.replace(attr, ` ${name}="${value}"`);
  return tag.replace(/>$/, ` ${name}="${value}">`);
}

function addClass(tag, className) {
  const classAttr = /\sclass=("([^"]*)"|'([^']*)')/i;
  const match = tag.match(classAttr);
  if (!match) return tag.replace(/>$/, ` class="${className}">`);
  const classes = (match[2] || match[3] || '').split(/\s+/).filter(Boolean);
  if (!classes.includes(className)) classes.push(className);
  return tag.replace(classAttr, ` class="${classes.join(' ')}"`);
}

html = html.replace(/<a\b[^>]*>/gi, (tag) => {
  const isCalendarTrack = /\bclass=("[^"]*\bcalendar-track\b[^"]*"|'[^']*\bcalendar-track\b[^']*')/i.test(tag);
  const isGoogleCalendar = /\bhref=("[^"#]*calendar\.app\.google[^"#]*"|'[^'#]*calendar\.app\.google[^'#]*')/i.test(tag);
  if (!isCalendarTrack && !isGoogleCalendar) return tag;

  let updated = tag;
  updated = setAttribute(updated, 'href', calendarUrl);
  updated = setAttribute(updated, 'target', '_blank');
  updated = setAttribute(updated, 'rel', 'noopener noreferrer');
  updated = addClass(updated, 'no-unlock');
  if (updated !== tag) changed += 1;
  return updated;
});

const calendarTags = html.match(/<a\b[^>]*\bcalendar-track\b[^>]*>/gi) || [];
if (!calendarTags.length) throw new Error('No calendar CTA links were found.');

for (const tag of calendarTags) {
  if (!tag.includes(`href="${calendarUrl}"`)) throw new Error(`Calendar CTA is not direct: ${tag}`);
  if (!/\btarget="_blank"/i.test(tag)) throw new Error(`Calendar CTA does not open separately: ${tag}`);
  if (!/\bno-unlock\b/i.test(tag)) throw new Error(`Calendar CTA is still eligible for the animation popup: ${tag}`);
}

const unsafeGoogleLinks = (html.match(/<a\b[^>]*href=("[^"]*calendar\.app\.google[^"]*"|'[^']*calendar\.app\.google[^']*')[^>]*>/gi) || [])
  .filter((tag) => !/\bno-unlock\b/i.test(tag) && !/\bwidget-cta\b/i.test(tag));
if (unsafeGoogleLinks.length) {
  throw new Error(`Google Calendar links could still trigger the popup: ${unsafeGoogleLinks.join(' | ')}`);
}

fs.writeFileSync(indexPath, html, 'utf8');
console.log(`Direct calendar links applied: ${calendarTags.length} CTAs validated, ${changed} link tags updated.`);
