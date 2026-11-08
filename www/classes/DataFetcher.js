class DataFetcher {
    constructor() {
    }

    /**
     * Searches for songs on Last.fm
     *
     * @private
     * @param {string} name
     * @param {number} limit
     * @returns {Song[]} an array of Song objects
     */
    async getSongInfos(name, limit = 1) {
        const query = name;

        // Last.fm API key registered for LyricPost for Android (only public read methods are used).
        const apiKey = '7bb2f2576460f59676fbfd2333d97440';
        const searchUrl = `https://ws.audioscrobbler.com/2.0/?method=track.search&track=${encodeURIComponent(query)}&api_key=${apiKey}&format=json&limit=${limit}`;

        const response = await fetch(searchUrl);

        const result = await response.json();
        const tracks = result?.results?.trackmatches?.track || [];

        const songs = await Promise.all(tracks.map(async (searchTrack) => {
            try {
                const infoUrl = `https://ws.audioscrobbler.com/2.0/?method=track.getInfo&api_key=${apiKey}&artist=${encodeURIComponent(searchTrack.artist)}&track=${encodeURIComponent(searchTrack.name)}&format=json`;
                const infoResponse = await fetch(infoUrl, {
                    headers: {
                        'User-Agent': 'LyricPost-Android/1.0.1 (+https://github.com/Omar-Elwazeery/lyricpost)',
                    },
                });
                const infoResult = await infoResponse.json();

                if (infoResult.track) {
                    return new Song(infoResult.track);
                }
            } catch (err) {
                console.error('Failed to fetch track info for', searchTrack.name, err);
            }
            return null;
        }));

        return songs.filter(song => song !== null);
    }

    /**
     * Searches for song lyrics on lrclib
     *
     * @private
     * @param {string} artistName
     * @param {string} trackName
     * @returns {object} song lyrics object
     */
    async getSongLyrics(artistName, trackName) {
        const response = await fetch(
            `https://lrclib.net/api/search?q=${artistName} ${trackName}`,
            {
                method: 'GET',
            }
        );

        const result = await response.json();

        const filteredResult = result.filter(
            (data) =>
                data.trackName.toLowerCase().trim() ===
                trackName.toLowerCase().trim()
        );

        return filteredResult[0] ?? result[0] ?? null;
    }
}
