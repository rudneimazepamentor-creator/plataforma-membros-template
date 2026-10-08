import sharp from 'sharp';
import fs from 'fs';

const svg = `<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="96" fill="#0f172a"/>
  <rect x="40" y="40" width="432" height="432" rx="72" fill="#dc2626"/>
  <text x="256" y="310" text-anchor="middle" font-family="Arial,sans-serif" font-weight="800" font-size="260" fill="white">M</text>
</svg>`;

const sizes = [192, 512];

for (const size of sizes) {
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(`client/public/icon-${size}.png`);
  console.log(`✓ icon-${size}.png`);
}

// Apple touch icon
await sharp(Buffer.from(svg))
  .resize(180, 180)
  .png()
  .toFile('client/public/apple-touch-icon.png');
console.log('✓ apple-touch-icon.png');

console.log('Done!');
