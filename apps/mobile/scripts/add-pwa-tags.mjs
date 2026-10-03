// Adds the "install on your phone" tags to a web export built as a single-page app
// (EXPO_BASE_URL builds use Expo's own HTML template, which skips app/+html.tsx).
// Usage: node scripts/add-pwa-tags.mjs <export dir> [base path, e.g. /KS1J/app]
import fs from 'node:fs';
import path from 'node:path';

const [dir, baseArg = ''] = process.argv.slice(2);
if (!dir) throw new Error('Usage: node scripts/add-pwa-tags.mjs <export dir> [base path]');
const base = baseArg.replace(/\/$/, '');
const tags = [
  `<link rel="manifest" href="${base}/manifest.json"/>`,
  '<meta name="theme-color" content="#0B4D3A"/>',
  `<link rel="apple-touch-icon" href="${base}/icons/apple-touch-icon.png"/>`,
  '<meta name="apple-mobile-web-app-capable" content="yes"/>',
  '<meta name="apple-mobile-web-app-title" content="KS1J"/>',
  '<meta name="mobile-web-app-capable" content="yes"/>',
].join('');

for (const name of fs.readdirSync(dir).filter((f) => f.endsWith('.html'))) {
  const file = path.join(dir, name);
  const html = fs.readFileSync(file, 'utf8');
  if (html.includes('rel="manifest"')) continue;
  fs.writeFileSync(file, html.replace('</head>', `${tags}</head>`));
  console.log('install tags added to', name);
}
