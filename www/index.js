const fetcher = new DataFetcher();
const appState = new AppState();
const appShell = new AppShell();

const songImageController = new SongImageController(appState, appShell);
const presetsController = new PresetsController(songImageController);
const lyricsController = new LyricsController(
    appState,
    fetcher,
    appShell,
    songImageController
);
const searchController = new SearchController(
    appState,
    fetcher,
    appShell,
    lyricsController
);
const navigationController = new NavigationController(
    appState,
    appShell,
    lyricsController,
    songImageController
);

// No service worker: inside the Android app every file is already bundled.
