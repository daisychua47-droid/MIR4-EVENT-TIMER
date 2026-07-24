document.getElementById("btnLoad").addEventListener("click", loadBosses);

async function loadBosses() {

    console.log("Button clicked");

    try {

        const bosses = await getBosses();

        console.log(bosses);

        document.getElementById("output").textContent =
            JSON.stringify(bosses, null, 2);

    } catch (err) {

        console.error(err);

        alert(err.message);

    }

}
