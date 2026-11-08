// Copies the libraries and fonts the web app used to load from CDNs into
// www/vendor, so the Android app does not depend on those hosts.
// Run with: npm run vendor
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const nm = 'node_modules';
const out = join('www', 'vendor');

rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, 'fonts', 'poppins'), { recursive: true });

// html2canvas (replaces html2canvas.hertzen.com)
cpSync(join(nm, 'html2canvas', 'dist', 'html2canvas.min.js'), join(out, 'html2canvas.min.js'));

// Material Symbols Outlined (replaces fonts.googleapis.com)
cpSync(join(nm, 'material-symbols', 'outlined.css'), join(out, 'fonts', 'material-symbols-outlined.css'));
cpSync(
    join(nm, 'material-symbols', 'material-symbols-outlined.woff2'),
    join(out, 'fonts', 'material-symbols-outlined.woff2')
);

// Poppins (replaces fonts.googleapis.com) — weights the styles actually use.
const poppins = join(nm, '@fontsource', 'poppins');
const sheets = ['300', '400', '500', '600', '700', '400-italic'];
const css = sheets
    .map((s) => readFileSync(join(poppins, `${s}.css`), 'utf8'))
    .join('\n')
    .replaceAll('./files/', './poppins/');
writeFileSync(join(out, 'fonts', 'poppins.css'), css);

for (const [, file] of css.matchAll(/\.\/poppins\/([\w.-]+\.woff2?)/g)) {
    cpSync(join(poppins, 'files', file), join(out, 'fonts', 'poppins', file));
}

// MIT requires the licence to travel with the app.
cpSync('LICENSE', join('www', 'LICENSE.txt'));

console.log('Vendored html2canvas, Material Symbols and Poppins into www/vendor');
