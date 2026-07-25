document.getElementById("btnLoad")?.remove();

let bosses = [];
const STORAGE_KEY = "mir4BossTracker";

function loadStorage() {
    return JSON.parse(
        localStorage.getItem(STORAGE_KEY) || "{}"
    );
}

function saveStorage(data) {
    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(data)
    );
}

function getBossData(id) {
    const data = loadStorage();

    if (!data[id]) {
        data[id] = {
            favorite: false,
            lastDefeated: null
        };
        saveStorage(data);
    }
    return data[id];
}

function defeatBoss(id) {
    const data = loadStorage();
    if (!data[id]) {
        data[id] = {};
    }
    data[id].lastDefeated = new Date().toISOString();
    saveStorage(data);
    renderBosses();
}

function getTodayName() {
    return ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][new Date().getDay()];
}

function isBossAvailableToday(boss) {
    return boss[getTodayName()] === true;
}

function getBossState(boss) {
    const now = new Date();
    const [hour, minute] = boss["Spawn Time"].split(":").map(Number);
    let spawn = new Date();
    spawn.setHours(hour, minute, 0, 0);

    // If today's spawn is still in the future,
    // use yesterday's spawn to determine the current cycle.
    while (spawn > now) {
        spawn.setMinutes(
            spawn.getMinutes() - Number(boss["Respawn (Min)"])
        );
    }
    // Move to the latest spawn before now.
    while (
        spawn.getTime() + Number(boss["Respawn (Min)"]) * 60000 <= now.getTime()
    ) {
        spawn.setMinutes(
            spawn.getMinutes() + Number(boss["Respawn (Min)"])
        );
    }
    const aliveUntil = new Date(
        spawn.getTime() +
        Number(boss["Alive Duration (Min)"]) * 60000
    );

    if (now < aliveUntil) {
        return {
            status: "Spawned",
            color: "green",
            action: "Defeat",
            timer: formatCountdown(aliveUntil - now)
        };
    }

    const nextSpawn = new Date(
        spawn.getTime() +
        Number(boss["Respawn (Min)"]) * 60000
    );

    return {
        status: "Waiting",
        color: "orange",
        action: "Waiting",
        timer: formatCountdown(nextSpawn - now)
    };

}

async function loadBosses() {
    bosses = await getBosses();
    renderBosses();
    setInterval(updateCountdowns, 1000);
}


function renderBosses() {
    const tbody = document.querySelector("#bossTable tbody");
    tbody.innerHTML = "";
    let aliveCount = 0;
    bosses
        .filter(isBossAvailableToday)
        .forEach(boss => {
            const state = getBossState(boss);

            if (state.status === "Spawned") {
                aliveCount++;
            }

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
    document.getElementById("aliveCount").innerHTML =
        aliveCount + " Alive";
}


function updateCountdowns() {
    renderBosses();
}

function formatCountdown(ms) {
    const total = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return (
        String(h).padStart(2, "0") + ":" +
        String(m).padStart(2, "0") + ":" +
        String(s).padStart(2, "0")
    );
}



loadBosses();
