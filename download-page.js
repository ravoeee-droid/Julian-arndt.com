const fs = require('fs');
const page = `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Julian Arndt Website herunterladen</title>
<style>
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:#070707;color:#f2eee5;font-family:Arial,sans-serif}main{width:min(680px,100%);padding:42px;border:1px solid rgba(198,162,42,.35);border-radius:24px;background:#111;text-align:center;box-shadow:0 24px 90px rgba(0,0,0,.45)}h1{margin:0 0 14px;font-size:clamp(30px,5vw,48px)}p{color:rgba(242,238,229,.72);line-height:1.65}.btn{display:block;margin-top:24px;padding:18px 24px;border-radius:14px;background:#c6a22a;color:#070707;font-weight:800;text-decoration:none}.hint{margin-top:18px;font-size:.84rem;color:rgba(242,238,229,.5)}
</style>
</head>
<body><main><h1>Website herunterladen</h1><p>Die ZIP enthält die komplette Website inklusive aller Bilder, Unterseiten und technischen Dateien.</p><a class="btn" href="/Julian-Arndt-Website-FINAL.zip" download>Komplette Website als ZIP herunterladen</a><div class="hint">Datei: Julian-Arndt-Website-FINAL.zip</div></main></body>
</html>`;
fs.writeFileSync('download.html', page, 'utf8');
console.log('Direct download page created.');
