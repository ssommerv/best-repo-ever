// Builds docs/audio/manifest.json: { clips: { key: [file, speechStartSec, speechEndSec] } }.
// Decodes every recorded clip in Chromium and finds where the speech starts and
// ends, so the game can trim the silence when it joins a line and a price.
// Needs Playwright (NODE_PATH=$(npm root -g) node tools/voice/manifest.js).
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');

const AUDIO = path.join(__dirname, '../../docs/audio');
const lines = JSON.parse(execFileSync('node', [path.join(__dirname, 'list-lines.js')]));

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent('<html></html>');
  const clips = {};
  let missing = 0;
  for (const key of Object.keys(lines)) {
    const file = path.join(AUDIO, `${key}.mp3`);
    if (!fs.existsSync(file)) { missing++; continue; }
    const [start, end] = await page.evaluate(async (b64) => {
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const buf = await new OfflineAudioContext(1, 1, 44100).decodeAudioData(bytes.buffer);
      const ch = buf.getChannelData(0), rate = buf.sampleRate, th = 0.015, pad = 0.015;
      let s = 0, e = ch.length - 1;
      while (s < e && Math.abs(ch[s]) < th) s++;
      while (e > s && Math.abs(ch[e]) < th) e--;
      const r = (x) => Math.round(x * 1000) / 1000;
      return [r(Math.max(0, s / rate - pad)), r(Math.min(buf.duration, e / rate + pad))];
    }, fs.readFileSync(file).toString('base64'));
    clips[key] = [`audio/${key}.mp3`, start, end];
  }
  await browser.close();
  fs.writeFileSync(path.join(AUDIO, 'manifest.json'), JSON.stringify({ clips }));
  console.log(`manifest: ${Object.keys(clips).length} clips, ${missing} not recorded yet`);
})();
