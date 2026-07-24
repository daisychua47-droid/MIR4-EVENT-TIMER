document.getElementById("btnLoad")?.remove();

let bosses = [];

async function loadBosses() {
    bosses = await getBosses();
    renderBosses();
    setInterval(updateCountdowns, 1000);
}

async function loadBosses(){
    const bosses = await getBosses();
    const tbody = document.querySelector("#bossTable tbody");
    tbody.innerHTML = "";
    document.getElementById("aliveCount").innerHTML =
        bosses.length + " Alive";
    bosses.forEach(boss=>{
        tbody.innerHTML += `
        <tr>
            <td>🟢</td>
            <td>${boss.Boss}</td>
            <td>World ${boss.World}</td>
            <td>${boss.Map}</td>
            <td>${boss.Layer}</td>
            <td>${boss["Spawn Time"]}</td>
            <td>--:--:--</td>
            <td>
                <button>Defeated</button>
            </td>
        </tr>
        `;
    });
}

function updateCountdowns() {
    renderBosses();
}

function getTimeLeft(spawnTime) {
    const now = new Date();
    const [hour, minute] = spawnTime.split(":");
    const next = new Date();

    next.setHours(hour);
    next.setMinutes(minute);
    next.setSeconds(0);

    if (next <= now) {
        next.setDate(next.getDate() + 1);
    }
    const diff = next - now;
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return (
        String(h).padStart(2, "0") + ":" +
        String(m).padStart(2, "0") + ":" +
        String(s).padStart(2, "0")
    );
}
