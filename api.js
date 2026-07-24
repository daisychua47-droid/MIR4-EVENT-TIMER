const API_URL = "https://script.google.com/macros/s/AKfycbwxJB8AX32wXqwVZq7l6RZXfGSUKqiGR0XbCjWFI6WTKQb12xInk3Ruf_u15wsLb_fQsQ/exec";

async function getBosses() {

    console.log("Fetching API...");

    const response = await fetch(API_URL);

    console.log(response);

    const data = await response.json();

    console.log(data);

    return data;

}
