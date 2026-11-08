// Copies www/ into the Android project, like `cap copy android` but without
// needing the Capacitor CLI (which requires Node 22). Used by the F-Droid build.
// Run after `node scripts/vendor.mjs`.
import { cpSync, rmSync } from 'node:fs';

const target = 'android/app/src/main/assets/public';
rmSync(target, { recursive: true, force: true });
cpSync('www', target, { recursive: true });
console.log(`Copied www/ to ${target}`);
