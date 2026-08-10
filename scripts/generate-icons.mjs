import sharp from 'sharp';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = join(__dirname, '..', 'public', 'icons');
mkdirSync(iconsDir, { recursive: true });

const sizes = [16, 32, 48, 128];

const svgIcon = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 128 128">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1a1a2e"/>
      <stop offset="100%" style="stop-color:#0a0a0f"/>
    </linearGradient>
  </defs>
  <rect width="128" height="128" rx="24" fill="url(#bg)"/>
  <circle cx="52" cy="52" r="28" fill="none" stroke="#e63946" stroke-width="6"/>
  <line x1="72" y1="72" x2="96" y2="96" stroke="#e63946" stroke-width="6" stroke-linecap="round"/>
  <circle cx="90" cy="38" r="6" fill="#e63946" opacity="0.8"/>
  <text x="64" y="118" text-anchor="middle" fill="#e63946" font-family="system-ui" font-size="14" font-weight="bold" opacity="0.6">IT</text>
</svg>`;

for (const size of sizes) {
  const svg = Buffer.from(svgIcon(size));
  const png = await sharp(svg).resize(size, size).png().toBuffer();
  writeFileSync(join(iconsDir, `icon-${size}.png`), png);
  console.log(`Generated icon-${size}.png`);
}

console.log('All icons generated.');
