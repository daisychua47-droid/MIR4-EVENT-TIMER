const API_URL = "https://script.google.com/macros/s/AKfycbwxJB8AX32wXqwVZq7l6RZXfGSUKqiGR0XbCjWFI6WTKQb12xInk3Ruf_u15wsLb_fQsQ/exec";

async function getBosses() {

    try {

        console.log("Fetching API...");

        const response = await fetch(API_URL);

        if (!response.ok) {
            throw new Error(`HTTP Error ${response.status}`);
        }

       const data = await response.json();
        // Save server time
        serverTime = new Date(data.serverTime);
        serverSyncTime = Date.now();
        
        console.log("Server Time:", serverTime);
        console.log("Bosses Loaded:", data.bosses);
        
        return data.bosses;

    } catch (err) {

        console.error("API Error:", err);

        return [];

    }

}
