# LyricPost for Android

> Turn song lyrics into beautiful, share-ready images — on your phone.

An Android app built with [Capacitor](https://capacitorjs.com/) from the
[LyricPost web app](https://github.com/palinkiewicz/lyricpost) by Adam Palinkiewicz.

## Features

- Search a song ([Last.fm](https://www.last.fm/)) and pick it with its album cover ([Cover Art Archive](https://coverartarchive.org/))
- Lyrics loaded from [LRCLIB](https://lrclib.net/), the free and open lyrics database, or type your own
- Select lines and style the card: colours, blur, fonts, spacing, corner radius, layout presets
- **Save to Gallery** (`Pictures/LyricPost`) in high resolution
- **Share directly** to Instagram (Feed / Stories / Chats), WhatsApp, Telegram, X, Snapchat, TikTok… or any installed app
- Light and dark theme, no account, no ads, no tracking

The app opens offline (all files are bundled), but finding songs and lyrics needs internet.

## Project layout

| Path | What it is |
|---|---|
| `www/` | The web app (HTML/CSS/vanilla JS) that runs inside the Android WebView |
| `www/classes/NativeExport.js`, `www/styles/export-sheet.css` | The Save / Share sheet shown after tapping Download |
| `android/` | The Android project (Capacitor 8) |
| `android/app/src/main/java/.../SocialSharePlugin.java` | Native code: Gallery save (MediaStore), listing apps that accept images, sharing to one directly |
| `scripts/vendor.mjs` | Copies html2canvas and the fonts from `node_modules` into `www/vendor/` (no CDNs) |
| `scripts/copy-web.mjs` | Copies `www/` into the Android project without the Capacitor CLI (used by F-Droid) |
| `assets/src/*.svg` | App icon source |
| `fastlane/` | Store listing (F-Droid reads it) |
| `fdroid/` | Draft F-Droid build recipe |

## Build

Requirements: Node 22+, Android Studio (its bundled JDK is fine; Gradle fetches a Java 21 toolchain on first build).

```bash
npm install
npm run sync                      # vendor libraries + copy www/ into android/
cd android && ./gradlew assembleDebug
```

APK: `android/app/build/outputs/apk/debug/app-debug.apk`. Or open `android/` in Android Studio and press Run.

After editing anything in `www/`, run `npm run sync` again.

### Changing the icon

Edit `assets/src/foreground.svg` / `background.svg`, then:

```bash
npm run icon
npx @capacitor/assets generate --android
```

and set `android:inset="0%"` in `android/app/src/main/res/mipmap-anydpi-v26/ic_launcher*.xml`
(the artwork already includes the adaptive-icon safe margin).

## Releasing

1. Bump `versionCode` / `versionName` in `android/app/build.gradle` and add `fastlane/metadata/android/en-US/changelogs/<versionCode>.txt`.
2. Tag the commit `v<versionName>` and push the tag. F-Droid picks up new tags automatically once the app is listed.

## Licence

MIT — see [LICENSE](LICENSE). Original work © 2024 Adam Palinkiewicz.

This project is not affiliated with or endorsed by Spotify or Apple. The Spotify and Apple Music
logos used by the layout presets are fetched from Wikimedia Commons and belong to their owners.
