const fs=require('fs');
const html=fs.readFileSync('dist/index.html','utf8');
const decode=s=>s.replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g,' ').trim();
function matches(re){return [...html.matchAll(re)];}
console.log('=== TITLE ===');
console.log(decode((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)||[])[1]||''));
console.log('\n=== HEADINGS ===');
for(const m of matches(/<(h[1-3])\b([^>]*)>([\s\S]*?)<\/\1>/gi)) console.log(`${m[1].toUpperCase()} | ${decode(m[3])}`);
console.log('\n=== SECTIONS ===');
for(const m of matches(/<section\b([^>]*)>/gi)){
 const attrs=m[1]; const id=(attrs.match(/\bid=["']([^"']+)/i)||[])[1]||''; const cls=(attrs.match(/\bclass=["']([^"']+)/i)||[])[1]||'';
 console.log(`SECTION id=${id||'-'} class=${cls||'-'}`);
}
console.log('\n=== CTAS / LINKS ===');
for(const m of matches(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)){
 const attrs=m[1]; const text=decode(m[2]); if(!text) continue; const href=(attrs.match(/\bhref=["']([^"']+)/i)||[])[1]||''; const cls=(attrs.match(/\bclass=["']([^"']+)/i)||[])[1]||'';
 if(/btn|cta|calendar|analyse|termin|start/i.test(cls+' '+text+' '+href)) console.log(`${text} | ${href} | ${cls}`);
}
console.log('\n=== FORM LABELS / INPUTS ===');
for(const m of matches(/<(label|button)\b([^>]*)>([\s\S]*?)<\/\1>/gi)){ const t=decode(m[3]); if(t) console.log(`${m[1].toUpperCase()} | ${t}`); }
for(const m of matches(/<input\b([^>]*)>/gi)){ const a=m[1]; const n=(a.match(/\bname=["']([^"']+)/i)||[])[1]||''; const p=(a.match(/\bplaceholder=["']([^"']+)/i)||[])[1]||''; const ty=(a.match(/\btype=["']([^"']+)/i)||[])[1]||''; if(n||p) console.log(`INPUT | type=${ty} name=${n} placeholder=${p}`); }
console.log('\n=== FAQ QUESTIONS ===');
for(const m of matches(/<(summary|button)\b([^>]*)>([\s\S]*?)<\/\1>/gi)){ const t=decode(m[3]); if(/\?|kapital|risiko|zeit|start|invest|defi|analyse/i.test(t)) console.log(t); }
console.log('\n=== BODY TEXT SAMPLE ===');
let body=(html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)||[])[1]||''; body=body.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' '); console.log(decode(body).slice(0,16000));
