// Prints every recorded-voice line as JSON: { key: { text, prev?, next?, speed? } }.
// Lines come from tools/voice/lines.js plus the spelling list and cheers in docs/app.js.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const docs = path.join(__dirname, '../../docs');
const sandbox = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'lines.js'), 'utf8'), sandbox);
const lines = { ...sandbox.PVB_VOICE.lines };

// Read an array literal such as `const CHEERS = [...]` out of app.js.
const app = fs.readFileSync(path.join(docs, 'app.js'), 'utf8');
function arrayLiteral(name) {
  const at = app.indexOf(`const ${name} = [`);
  if (at < 0) throw new Error(`${name} not found in app.js`);
  const start = app.indexOf('[', at);
  let depth = 0, end = start;
  for (; end < app.length; end++) {
    if (app[end] === '[') depth++;
    else if (app[end] === ']' && --depth === 0) break;
  }
  return vm.runInNewContext(`(${app.slice(start, end + 1)})`);
}

for (const [marked, sentence] of arrayLiteral('SPELL_DEFAULT')) {
  const word = marked.replace(/[[\]]/g, ''), key = word.toLowerCase();
  lines[`spell/${key}`] = { text: `${word}. ${sentence} ${word}.` };
  lines[`slow/${key}`] = { text: `${word}.`, speed: 0.75 };
}
arrayLiteral('CHEERS').forEach((cheer, i) => { lines[`cheer/${i}`] = { text: cheer }; });

process.stdout.write(JSON.stringify(lines, null, 1));
