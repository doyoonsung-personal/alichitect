// usage: require('./rep.cjs')(file, [[a,b],...]) : exact unique replacements, EOL-preserving
const fs = require('fs');
module.exports = (f, pairs) => {
  let s = fs.readFileSync(f, 'utf8');
  const crlf = s.includes('\r\n');
  if (crlf) s = s.replace(/\r\n/g, '\n');
  for (const [a, b] of pairs) {
    const n = s.split(a).length - 1;
    if (n !== 1) throw new Error(`${f}: ${n} matches for: ${a.slice(0, 70)}`);
    s = s.replace(a, () => b);
  }
  if (crlf) s = s.replace(/\n/g, '\r\n');
  fs.writeFileSync(f, s);
};
