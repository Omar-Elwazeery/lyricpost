// Renders assets/src/*.svg into the PNGs @capacitor/assets turns into Android icons.
import sharp from 'sharp';
const fg = await sharp('assets/src/foreground.svg').png().toBuffer();
const bg = await sharp('assets/src/background.svg').png().toBuffer();
await sharp(fg).toFile('assets/icon-foreground.png');
await sharp(bg).toFile('assets/icon-background.png');
await sharp(bg).composite([{ input: fg }]).png().toFile('assets/icon-only.png');
// Rounded preview, like a launcher would show it
const mask = Buffer.from('<svg width="1024" height="1024"><rect width="1024" height="1024" rx="230" fill="#fff"/></svg>');
await sharp('assets/icon-only.png').composite([{ input: mask, blend: 'dest-in' }]).png().toFile('assets/icon-preview.png');
console.log('icons rendered');
