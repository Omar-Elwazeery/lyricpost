/**
 * Saves / shares the finished lyrics image.
 *
 * In the Android app the PNG is written to the app's cache, then an in-app
 * sheet offers "Save to Gallery" and one tile per installed app that accepts
 * images (social apps first), plus "More" for the system share sheet.
 * The native side lives in android/.../SocialSharePlugin.java.
 *
 * In a normal browser it falls back to a regular download.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {string} fileName
 */
async function exportImage(canvas, fileName) {
    const cap = window.Capacitor;
    const dataUrl = canvas.toDataURL('image/png');

    if (!cap?.isNativePlatform?.()) {
        const link = document.createElement('a');
        link.download = fileName;
        link.href = dataUrl;
        link.click();
        return;
    }

    const { Filesystem, SocialShare } = cap.Plugins;
    const safeName = fileName.replace(/[\\/:*?"<>|]+/g, '_');

    const { uri } = await Filesystem.writeFile({
        path: `exports/${safeName}`,
        data: dataUrl.split(',')[1],
        directory: 'CACHE',
        recursive: true,
    });

    const { targets } = await SocialShare.listTargets().catch(() => ({ targets: [] }));
    ExportSheet.open({ uri, fileName: safeName, dataUrl, targets });
}

const ExportSheet = {
    el: null,

    open({ uri, fileName, dataUrl, targets }) {
        this.close(true);
        const cap = window.Capacitor;
        const { SocialShare, Share } = cap.Plugins;

        const sheet = document.createElement('div');
        sheet.className = 'export-sheet';
        sheet.innerHTML = `
            <div class="export-sheet__backdrop"></div>
            <div class="export-sheet__panel" role="dialog" aria-label="Save or share">
                <div class="export-sheet__handle"></div>
                <img class="export-sheet__preview" alt="Your lyrics image" />
                <button class="export-sheet__save primary">
                    <span class="material-symbols-outlined">download</span>
                    <span class="export-sheet__save-text">Save to Gallery</span>
                </button>
                <h3 class="export-sheet__title">Share to</h3>
                <div class="export-sheet__grid"></div>
            </div>`;
        sheet.querySelector('.export-sheet__preview').src = dataUrl;

        const grid = sheet.querySelector('.export-sheet__grid');
        const social = targets.filter((t) => t.social);
        // No known social app installed: show whatever accepts images instead.
        const shown = social.length ? social : targets.slice(0, 7);
        const sameApp = (t) => shown.filter((o) => o.packageName === t.packageName).length > 1;

        for (const target of shown) {
            const tile = document.createElement('button');
            tile.className = 'export-sheet__tile';
            const sub = sameApp(target) && target.label !== target.appName ? target.label : '';
            tile.innerHTML = `<img alt="" /><span class="name"></span><span class="sub"></span>`;
            tile.querySelector('img').src = target.icon;
            tile.querySelector('.name').textContent = target.appName;
            tile.querySelector('.sub').textContent = sub;
            tile.addEventListener('click', async () => {
                try {
                    await SocialShare.shareTo({
                        path: uri,
                        packageName: target.packageName,
                        activityName: target.activityName,
                    });
                    this.close();
                } catch (err) {
                    this.toast(err?.message ?? 'Could not open that app');
                }
            });
            grid.appendChild(tile);
        }

        const more = document.createElement('button');
        more.className = 'export-sheet__tile';
        more.innerHTML = `<span class="more material-symbols-outlined">more_horiz</span><span class="name">More</span><span class="sub"></span>`;
        more.addEventListener('click', async () => {
            try {
                await Share.share({ files: [uri], dialogTitle: 'Share your lyrics image' });
            } catch (err) {
                if (!/cancel/i.test(err?.message ?? '')) this.toast(err?.message ?? 'Could not share');
            }
        });
        grid.appendChild(more);

        const saveButton = sheet.querySelector('.export-sheet__save');
        saveButton.addEventListener('click', async () => {
            saveButton.disabled = true;
            try {
                await SocialShare.saveToGallery({ path: uri, fileName });
                saveButton.classList.add('done');
                saveButton.querySelector('.material-symbols-outlined').textContent = 'check';
                saveButton.querySelector('.export-sheet__save-text').textContent = 'Saved to Gallery';
                this.toast('Saved to Pictures/LyricPost');
            } catch (err) {
                saveButton.disabled = false;
                this.toast(err?.message ?? 'Could not save the image');
            }
        });

        sheet.querySelector('.export-sheet__backdrop').addEventListener('click', () => this.close());

        document.body.appendChild(sheet);
        this.el = sheet;
        requestAnimationFrame(() => sheet.classList.add('open'));

        // Android back button closes the sheet instead of leaving the screen.
        history.pushState({ exportSheet: true }, '');
        this.onPop = () => this.close(true);
        window.addEventListener('popstate', this.onPop, { once: true });
    },

    /** @param {boolean} fromHistory - already popped, don't go back again */
    close(fromHistory = false) {
        const sheet = this.el;
        if (!sheet) return;
        this.el = null;
        if (!fromHistory) {
            window.removeEventListener('popstate', this.onPop);
            history.back();
        }
        sheet.classList.remove('open');
        setTimeout(() => sheet.remove(), 250);
    },

    toast(message) {
        const toast = document.createElement('div');
        toast.className = 'export-toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('show'));
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 2200);
    },
};
