// Script to generate PWA icons as PNG
// Run with: node scripts/generate-icons.js

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// SVG template for MI Printers logo
const createSvgIcon = (size) => `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#16A34A" rx="${size * 0.15}"/>
  <text x="50%" y="55%" 
        font-family="Arial, Helvetica, sans-serif" 
        font-size="${size * 0.35}px" 
        font-weight="bold" 
        fill="white" 
        text-anchor="middle" 
        dominant-baseline="middle">MI</text>
</svg>`;

// Maskable icon (with padding for safe area)
const createMaskableSvgIcon = (size) => {
  const padding = size * 0.1;
  const innerSize = size - (padding * 2);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#16A34A"/>
  <text x="50%" y="55%" 
        font-family="Arial, Helvetica, sans-serif" 
        font-size="${innerSize * 0.35}px" 
        font-weight="bold" 
        fill="white" 
        text-anchor="middle" 
        dominant-baseline="middle">MI</text>
</svg>`;
};

async function generateIcons() {
  // Create icons directory if it doesn't exist
  const iconsDir = path.join(__dirname, '..', 'public', 'icons');
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  // Generate PNG icons at different sizes
  const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

  for (const size of sizes) {
    const svgBuffer = Buffer.from(createSvgIcon(size));
    const pngPath = path.join(iconsDir, `icon-${size}x${size}.png`);
    
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(pngPath);
    
    console.log(`Created: icon-${size}x${size}.png`);
  }

  // Create maskable versions
  for (const size of [192, 512]) {
    const svgBuffer = Buffer.from(createMaskableSvgIcon(size));
    const pngPath = path.join(iconsDir, `icon-maskable-${size}x${size}.png`);
    
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(pngPath);
    
    console.log(`Created: icon-maskable-${size}x${size}.png`);
  }

  // Create screenshot placeholders (for richer install UI)
  const wideScreenshot = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1280" height="720" viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
  <rect width="1280" height="720" fill="#f9fafb"/>
  <rect x="0" y="0" width="256" height="720" fill="#ffffff"/>
  <rect x="256" y="0" width="1024" height="60" fill="#ffffff"/>
  <text x="640" y="360" font-family="Arial" font-size="48" fill="#16A34A" text-anchor="middle" font-weight="bold">MI Printers Dashboard</text>
  <text x="640" y="420" font-family="Arial" font-size="24" fill="#6b7280" text-anchor="middle">Business Management System</text>
</svg>`;

  const mobileScreenshot = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="750" height="1334" viewBox="0 0 750 1334" xmlns="http://www.w3.org/2000/svg">
  <rect width="750" height="1334" fill="#f9fafb"/>
  <rect x="0" y="0" width="750" height="60" fill="#ffffff"/>
  <rect x="0" y="1270" width="750" height="64" fill="#ffffff"/>
  <text x="375" y="667" font-family="Arial" font-size="48" fill="#16A34A" text-anchor="middle" font-weight="bold">MI Printers</text>
  <text x="375" y="727" font-family="Arial" font-size="24" fill="#6b7280" text-anchor="middle">Mobile App</text>
</svg>`;

  await sharp(Buffer.from(wideScreenshot))
    .resize(1280, 720)
    .png()
    .toFile(path.join(iconsDir, 'screenshot-wide.png'));
  console.log('Created: screenshot-wide.png');

  await sharp(Buffer.from(mobileScreenshot))
    .resize(750, 1334)
    .png()
    .toFile(path.join(iconsDir, 'screenshot-mobile.png'));
  console.log('Created: screenshot-mobile.png');

  console.log('\n✅ All icons generated successfully!');
}

generateIcons().catch(console.error);
