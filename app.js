document.getElementById("btnLoad")?.remove();

let bosses = [];

function getTodayName() {
    return ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][new Date().getDay()];
}

function isBossAvailableToday(boss) {
    return boss[getTodayName()] === true;
}

async function loadBosses() {
    bosses = await getBosses();
    renderBosses();
    setInterval(updateCountdowns, 1000);
}

function getBossState(boss) {

    const now = new Date();

    const [hour, minute] = boss["Spawn Time"].split(":").map(Number);

    const spawn = new Date();
    spawn.setHours(hour, minute, 0, 0);

    // Today's spawn not reached
    if (now < spawn) {

        return {
            status: "Waiting",
            color: "orange",
            action: "Waiting",
            timer: getTimeLeft(boss["Spawn Time"])
        };

    }

    // Calculate when boss disappears
    const aliveUntil = new Date(spawn);

    aliveUntil.setMinutes(
        aliveUntil.getMinutes() +
        Number(boss["Alive Duration (Min)"])
    );

    // Boss is alive
    if (now < aliveUntil) {

        return {
            status: "Spawned",
            color: "green",
            action: "Defeat",
            timer: getAliveTime(spawn)
        };

    }

    // Boss already disappeared
    return {

        status: "Waiting",
        color: "orange",
        action: "Waiting",
        timer: getNextSpawn(spawn, Number(boss["Respawn (Min)"]))

    };

}

function renderBosses() {

    const tbody = document.querySelector("#bossTable tbody");

    tbody.innerHTML = "";

    document.getElementById("aliveCount").innerHTML =
        bosses.filter(isBossAvailableToday).length + " Alive";

    bosses
        .filter(isBossAvailableToday)
        .forEach(boss => {

            const state = getBossState(boss);

            tbody.innerHTML += `
            <tr>

                <td>
                    <span class="status ${state.color}"></span>
                    ${state.status}
                </td>

                <td>${boss.Boss}</td>

                <td>World ${boss.World}</td>

                <td>${boss.Map}</td>

                <td>${boss.Layer}</td>

                <td>${boss["Spawn Time"]}</td>

                <td>${state.timer}</td>

                <td>

                    <button
                        class="btn-defeat"
                        ${state.action === "Waiting" ? "disabled" : ""}
                    >
                        ${state.action}
                    </button>

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

function getAliveTime(spawn){

    const diff = new Date() - spawn;

    const h = Math.floor(diff / 3600000);

    const m = Math.floor((diff % 3600000) / 60000);

    const s = Math.floor((diff % 60000) / 1000);

    return (
        String(h).padStart(2,"0")+":"+
        String(m).padStart(2,"0")+":"+
        String(s).padStart(2,"0")
    );

}

function getNextSpawn(spawn, respawnMinutes){
    const next = new Date(spawn);
    next.setMinutes(next.getMinutes() + respawnMinutes);
    const diff = next - new Date();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return (
        String(Math.max(0,h)).padStart(2,"0")+":"+
        String(Math.max(0,m)).padStart(2,"0")+":"+
        String(Math.max(0,s)).padStart(2,"0")
    );
}


loadBosses();
