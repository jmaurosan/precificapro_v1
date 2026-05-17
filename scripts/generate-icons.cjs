const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

const generateSVG = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0d9488;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0f766e;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.22)}" fill="url(#bg)"/>
  <text x="${size/2}" y="${Math.round(size * 0.68)}"
    font-family="Arial Black, Arial, sans-serif"
    font-weight="900"
    font-size="${Math.round(size * 0.52)}"
    fill="white"
    text-anchor="middle">P</text>
  <rect x="${Math.round(size * 0.25)}" y="${Math.round(size * 0.72)}" width="${Math.round(size * 0.5)}" height="${Math.round(size * 0.06)}" rx="${Math.round(size * 0.03)}" fill="rgba(255,255,255,0.35)"/>
</svg>`;

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

async function run() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch (e) {
    console.log('sharp nao encontrado, gerando SVGs...');
    sharp = null;
  }

  for (const size of sizes) {
    const svg = generateSVG(size);
    if (sharp) {
      await sharp(Buffer.from(svg)).png().toFile(path.join(publicDir, `icon-${size}.png`));
      console.log(`ok icon-${size}.png`);
    } else {
      fs.writeFileSync(path.join(publicDir, `icon-${size}.svg`), svg);
      console.log(`ok icon-${size}.svg`);
    }
  }

  // favicon
  if (sharp) {
    await sharp(Buffer.from(generateSVG(32))).png().toFile(path.join(publicDir, '..', 'favicon.png'));
    console.log('ok favicon.png');
  }

  console.log('\nIcones gerados em: ' + publicDir);
}

run().catch(console.error);
