const API_URL = "https://script.google.com/macros/s/AKfycbwxJB8AX32wXqwVZq7l6RZXfGSUKqiGR0XbCjWFI6WTKQb12xInk3Ruf_u15wsLb_fQsQ/exec";
const BOSS_CACHE_KEY = "mir4BossCache";

async function getBosses() {

    try {

        console.time("API Total");

        console.log("Fetching API...");

        const response = await fetch(API_URL);

        console.timeLog("API Total", "Response received");

        if (!response.ok) {
            throw new Error(`HTTP Error ${response.status}`);
        }

        const data = await response.json();
        localStorage.setItem(
            BOSS_CACHE_KEY,
            JSON.stringify(data)
        );

        console.timeLog("API Total", "JSON parsed");

        // Save server time
        serverTime = new Date(data.serverTime);
        serverSyncTime = Date.now();

        console.timeEnd("API Total");

        console.log("Server Time:", serverTime);
        console.log("Bosses Loaded:", data.bosses.length);

        return data.bosses;

    } catch (err) {

        console.error("API Error:", err);

        return [];

    }

}
