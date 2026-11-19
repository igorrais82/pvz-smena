/* Восстановление UTF-8 файла после ошибочного чтения как cp1251 */
const fs = require('fs');
const path = process.argv[2];
const s = fs.readFileSync(path, 'utf8');
const dec = new TextDecoder('windows-1251');
const map = new Map();
for (let b = 0; b < 256; b++) {
  const ch = dec.decode(Uint8Array.from([b]));
  if (!map.has(ch)) map.set(ch, b);
}
const out = Buffer.alloc(s.length);
let ok = 0, bad = 0;
for (let i = 0; i < s.length; i++) {
  const ch = s[i];
  if (map.has(ch)) { out[i] = map.get(ch); ok++; }
  else { out[i] = 0x3f; bad++; }
}
const restored = out.toString('utf8');
fs.writeFileSync(path, restored, 'utf8');
console.log('restored', path, 'chars', s.length, 'mapped', ok, 'unmapped', bad);
