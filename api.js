// **************
// CHANGE THIS
// **************

const API_URL = "https://script.google.com/macros/s/AKfycbwxJB8AX32wXqwVZq7l6RZXfGSUKqiGR0XbCjWFI6WTKQb12xInk3Ruf_u15wsLb_fQsQ/exec";

async function getBosses() {

    const response = await fetch(API_URL);

    if (!response.ok) {
        throw new Error("Unable to connect to API.");
    }

    return await response.json();

}