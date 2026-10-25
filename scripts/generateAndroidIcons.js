import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const RES_DIR = path.resolve('android/app/src/main/res');

// SVG Definitions for 108x108 Adaptive Icon Layers
const foregroundSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108" width="108" height="108">
  <defs>
    <!-- Pink to Orange Flame Gradient -->
    <linearGradient id="flameGrad" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#E11D48" />
      <stop offset="35%" stop-color="#F43F5E" />
      <stop offset="70%" stop-color="#FB7185" />
      <stop offset="100%" stop-color="#FB923C" />
    </linearGradient>

    <!-- Inner Core Flame Glow -->
    <linearGradient id="innerFlameGlow" x1="0%" y1="100%" x2="0%" y2="0%">
      <stop offset="0%" stop-color="#FDA4AF" stop-opacity="0.75" />
      <stop offset="50%" stop-color="#FED7AA" stop-opacity="0.45" />
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0.1" />
    </linearGradient>

    <!-- Subtle White Heart Glow Filter -->
    <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="0.8" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Main Flame Body (strictly inside safe zone: x from 31 to 77, y from 28 to 80; margin > 25%) -->
  <path d="M 54 28 
           C 56.5 36.5, 61 42.5, 68.5 46.5 
           C 74.5 49.5, 77 56, 77 62.5 
           C 77 72.5, 67.5 80, 54 80 
           C 40.5 80, 31 72.5, 31 62.5 
           C 31 52, 38 44.5, 43.5 39.5 
           C 46.5 44, 51 46.5, 55.5 46.5 
           C 51 39.5, 52.8 33.5, 54 28 Z" 
        fill="url(#flameGrad)" />

  <!-- Inner Soft Flame Core Accent -->
  <path d="M 54 38 
           C 55.5 43, 58.5 47, 63.5 49.5 
           C 68 51.5, 70.5 56, 70.5 61.5 
           C 70.5 68.5, 63 75, 54 75 
           C 45 75, 37.5 68.5, 37.5 61.5 
           C 37.5 54.5, 43 48, 47 45 
           C 49 47.5, 52 49.5, 55.5 49.5 
           C 53 44, 53 40.5, 54 38 Z" 
        fill="url(#innerFlameGlow)" />

  <!-- White Heart centered inside the lower flame body at (54, 64) -->
  <path d="M 54 58.8
           C 52.8 55.8, 47.5 54.2, 44.8 57.5 
           C 41.8 61.2, 43.8 66.5, 54 73.5 
           C 64.2 66.5, 66.2 61.2, 63.2 57.5 
           C 60.5 54.2, 55.2 55.8, 54 58.8 Z" 
        fill="#FFFFFF"
        filter="url(#softGlow)" />
</svg>
`.trim();

const backgroundSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108" width="108" height="108">
  <defs>
    <!-- Dark, near-black premium gradient -->
    <linearGradient id="bgDark" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#08070D" />
      <stop offset="50%" stop-color="#0E0B18" />
      <stop offset="100%" stop-color="#151026" />
    </linearGradient>

    <!-- Subtle Rose Ambient Glow behind center flame -->
    <radialGradient id="roseGlow" cx="54%" cy="56%" r="48%">
      <stop offset="0%" stop-color="#E11D48" stop-opacity="0.32" />
      <stop offset="40%" stop-color="#9F1239" stop-opacity="0.16" />
      <stop offset="70%" stop-color="#831843" stop-opacity="0.05" />
      <stop offset="100%" stop-color="#08070D" stop-opacity="0.0" />
    </radialGradient>

    <!-- Subtle Top-Left Ambient Sheen -->
    <linearGradient id="roseSheen" x1="0%" y1="0%" x2="70%" y2="70%">
      <stop offset="0%" stop-color="#FB7185" stop-opacity="0.14" />
      <stop offset="45%" stop-color="#E11D48" stop-opacity="0.03" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0.0" />
    </linearGradient>
  </defs>

  <!-- Deep Obsidian Base -->
  <rect width="108" height="108" fill="url(#bgDark)" />

  <!-- Rose Ambient Core Glow -->
  <circle cx="54" cy="56" r="50" fill="url(#roseGlow)" />

  <!-- Subtle Elegant Radial Accent Ring (Safe border preview) -->
  <circle cx="54" cy="54" r="46" fill="none" stroke="#E11D48" stroke-width="0.7" stroke-opacity="0.18" />
  <circle cx="54" cy="54" r="50" fill="none" stroke="#FB7185" stroke-width="0.3" stroke-opacity="0.09" />

  <!-- Diagonal Rose Sheen -->
  <rect width="108" height="108" fill="url(#roseSheen)" />
</svg>
`.trim();

// Legacy Square Icon (with rounded corners and luxury border)
const legacySquareSvg = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108" width="${size}" height="${size}">
  <defs>
    <linearGradient id="sqBgDark" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#08070D" />
      <stop offset="50%" stop-color="#0E0B18" />
      <stop offset="100%" stop-color="#151026" />
    </linearGradient>
    <radialGradient id="sqRoseGlow" cx="54%" cy="56%" r="48%">
      <stop offset="0%" stop-color="#E11D48" stop-opacity="0.38" />
      <stop offset="45%" stop-color="#9F1239" stop-opacity="0.18" />
      <stop offset="80%" stop-color="#08070D" stop-opacity="0.0" />
    </radialGradient>
    <linearGradient id="sqBorderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FB7185" stop-opacity="0.45" />
      <stop offset="50%" stop-color="#E11D48" stop-opacity="0.15" />
      <stop offset="100%" stop-color="#831843" stop-opacity="0.35" />
    </linearGradient>
    <linearGradient id="flameGrad" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#E11D48" />
      <stop offset="35%" stop-color="#F43F5E" />
      <stop offset="70%" stop-color="#FB7185" />
      <stop offset="100%" stop-color="#FB923C" />
    </linearGradient>
    <linearGradient id="innerFlameGlow" x1="0%" y1="100%" x2="0%" y2="0%">
      <stop offset="0%" stop-color="#FDA4AF" stop-opacity="0.75" />
      <stop offset="50%" stop-color="#FED7AA" stop-opacity="0.45" />
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0.1" />
    </linearGradient>
  </defs>

  <!-- Rounded Squircle / Square background with rx=22 -->
  <rect x="2" y="2" width="104" height="104" rx="22" fill="url(#sqBgDark)" />
  <rect x="2" y="2" width="104" height="104" rx="22" fill="url(#sqRoseGlow)" />
  <rect x="2" y="2" width="104" height="104" rx="22" fill="none" stroke="url(#sqBorderGrad)" stroke-width="1.5" />

  <!-- Flame Body -->
  <path d="M 54 28 
           C 56.5 36.5, 61 42.5, 68.5 46.5 
           C 74.5 49.5, 77 56, 77 62.5 
           C 77 72.5, 67.5 80, 54 80 
           C 40.5 80, 31 72.5, 31 62.5 
           C 31 52, 38 44.5, 43.5 39.5 
           C 46.5 44, 51 46.5, 55.5 46.5 
           C 51 39.5, 52.8 33.5, 54 28 Z" 
        fill="url(#flameGrad)" />

  <!-- Inner Soft Flame Core Accent -->
  <path d="M 54 38 
           C 55.5 43, 58.5 47, 63.5 49.5 
           C 68 51.5, 70.5 56, 70.5 61.5 
           C 70.5 68.5, 63 75, 54 75 
           C 45 75, 37.5 68.5, 37.5 61.5 
           C 37.5 54.5, 43 48, 47 45 
           C 49 47.5, 52 49.5, 55.5 49.5 
           C 53 44, 53 40.5, 54 38 Z" 
        fill="url(#innerFlameGlow)" />

  <!-- White Heart -->
  <path d="M 54 58.8
           C 52.8 55.8, 47.5 54.2, 44.8 57.5 
           C 41.8 61.2, 43.8 66.5, 54 73.5 
           C 64.2 66.5, 66.2 61.2, 63.2 57.5 
           C 60.5 54.2, 55.2 55.8, 54 58.8 Z" 
        fill="#FFFFFF" />
</svg>
`.trim();

// Legacy Round Icon (Circle clip)
const legacyRoundSvg = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108" width="${size}" height="${size}">
  <defs>
    <linearGradient id="rdBgDark" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#08070D" />
      <stop offset="50%" stop-color="#0E0B18" />
      <stop offset="100%" stop-color="#151026" />
    </linearGradient>
    <radialGradient id="rdRoseGlow" cx="54%" cy="56%" r="48%">
      <stop offset="0%" stop-color="#E11D48" stop-opacity="0.4" />
      <stop offset="45%" stop-color="#9F1239" stop-opacity="0.2" />
      <stop offset="80%" stop-color="#08070D" stop-opacity="0.0" />
    </radialGradient>
    <linearGradient id="rdBorderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FB7185" stop-opacity="0.45" />
      <stop offset="50%" stop-color="#E11D48" stop-opacity="0.15" />
      <stop offset="100%" stop-color="#831843" stop-opacity="0.35" />
    </linearGradient>
    <linearGradient id="flameGrad" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#E11D48" />
      <stop offset="35%" stop-color="#F43F5E" />
      <stop offset="70%" stop-color="#FB7185" />
      <stop offset="100%" stop-color="#FB923C" />
    </linearGradient>
    <linearGradient id="innerFlameGlow" x1="0%" y1="100%" x2="0%" y2="0%">
      <stop offset="0%" stop-color="#FDA4AF" stop-opacity="0.75" />
      <stop offset="50%" stop-color="#FED7AA" stop-opacity="0.45" />
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0.1" />
    </linearGradient>
  </defs>

  <!-- Circular background -->
  <circle cx="54" cy="54" r="52" fill="url(#rdBgDark)" />
  <circle cx="54" cy="54" r="52" fill="url(#rdRoseGlow)" />
  <circle cx="54" cy="54" r="51.5" fill="none" stroke="url(#rdBorderGrad)" stroke-width="1.5" />

  <!-- Flame Body -->
  <path d="M 54 28 
           C 56.5 36.5, 61 42.5, 68.5 46.5 
           C 74.5 49.5, 77 56, 77 62.5 
           C 77 72.5, 67.5 80, 54 80 
           C 40.5 80, 31 72.5, 31 62.5 
           C 31 52, 38 44.5, 43.5 39.5 
           C 46.5 44, 51 46.5, 55.5 46.5 
           C 51 39.5, 52.8 33.5, 54 28 Z" 
        fill="url(#flameGrad)" />

  <!-- Inner Soft Flame Core Accent -->
  <path d="M 54 38 
           C 55.5 43, 58.5 47, 63.5 49.5 
           C 68 51.5, 70.5 56, 70.5 61.5 
           C 70.5 68.5, 63 75, 54 75 
           C 45 75, 37.5 68.5, 37.5 61.5 
           C 37.5 54.5, 43 48, 47 45 
           C 49 47.5, 52 49.5, 55.5 49.5 
           C 53 44, 53 40.5, 54 38 Z" 
        fill="url(#innerFlameGlow)" />

  <!-- White Heart -->
  <path d="M 54 58.8
           C 52.8 55.8, 47.5 54.2, 44.8 57.5 
           C 41.8 61.2, 43.8 66.5, 54 73.5 
           C 64.2 66.5, 66.2 61.2, 63.2 57.5 
           C 60.5 54.2, 55.2 55.8, 54 58.8 Z" 
        fill="#FFFFFF" />
</svg>
`.trim();

// Density configurations
const densities = [
  { name: 'mipmap-mdpi', launcherSize: 48, foregroundSize: 108 },
  { name: 'mipmap-hdpi', launcherSize: 72, foregroundSize: 162 },
  { name: 'mipmap-xhdpi', launcherSize: 96, foregroundSize: 216 },
  { name: 'mipmap-xxhdpi', launcherSize: 144, foregroundSize: 324 },
  { name: 'mipmap-xxxhdpi', launcherSize: 192, foregroundSize: 432 },
];

async function generateAll() {
  console.log('Generating Android Adaptive & Legacy Icons for JOBS...');

  for (const density of densities) {
    const dir = path.join(RES_DIR, density.name);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // 1. ic_launcher.png (Legacy Square)
    const squareBuffer = Buffer.from(legacySquareSvg(density.launcherSize));
    await sharp(squareBuffer)
      .resize(density.launcherSize, density.launcherSize)
      .png()
      .toFile(path.join(dir, 'ic_launcher.png'));

    // 2. ic_launcher_round.png (Legacy Round)
    const roundBuffer = Buffer.from(legacyRoundSvg(density.launcherSize));
    await sharp(roundBuffer)
      .resize(density.launcherSize, density.launcherSize)
      .png()
      .toFile(path.join(dir, 'ic_launcher_round.png'));

    // 3. ic_launcher_foreground.png (Adaptive Foreground Raster)
    const fgBuffer = Buffer.from(foregroundSvg);
    await sharp(fgBuffer)
      .resize(density.foregroundSize, density.foregroundSize)
      .png()
      .toFile(path.join(dir, 'ic_launcher_foreground.png'));

    console.log(`✓ ${density.name} generated:`);
    console.log(`   - ic_launcher.png (${density.launcherSize}x${density.launcherSize})`);
    console.log(`   - ic_launcher_round.png (${density.launcherSize}x${density.launcherSize})`);
    console.log(`   - ic_launcher_foreground.png (${density.foregroundSize}x${density.foregroundSize})`);
  }

  console.log('All density PNGs generated successfully!');
}

generateAll().catch(err => {
  console.error('Failed generating icons:', err);
  process.exit(1);
});
