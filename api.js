const API_URL = "YOUR_WEB_APP_URL";

async function getBosses() {

    console.log("Fetching API...");

    const response = await fetch(API_URL);

    console.log(response);

    const data = await response.json();

    console.log(data);

    return data;

}
