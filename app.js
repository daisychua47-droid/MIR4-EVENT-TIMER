document.getElementById("btnLoad")?.remove();

let bosses = [];
let liveBosses = [];
let upcomingBosses = [];
let defeatedBosses = [];

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
    const [hour, minute] = boss["Spawn Time"]
        .split(":")
        .map(Number);

    let spawn = new Date();
    spawn.setHours(hour, minute, 0, 0);
    
    const respawnMs =
        Number(boss["Respawn (Min)"]) * 60000;

    const aliveMs =
        Number(boss["Alive Duration (Min)"]) * 60000;

    while (spawn > now) {
        spawn = new Date(spawn.getTime() - respawnMs);
    }
    while (spawn.getTime() + respawnMs <= now.getTime()) {
        spawn = new Date(spawn.getTime() + respawnMs);
    }
    const aliveUntil =
        new Date(spawn.getTime() + aliveMs);
    const nextSpawn =
        new Date(spawn.getTime() + respawnMs);

    if (now < aliveUntil) {
        return {
            status: "LIVE",
            color: "green",
            spawn,
            aliveUntil,
            nextSpawn,
            timeLeft: aliveUntil - now,
            nextSpawnIn: 0
        };
    }
    return {
        status: "UPCOMING",
        color: "orange",
        spawn,
        aliveUntil,
        nextSpawn,
        timeLeft: 0,
        nextSpawnIn: nextSpawn - now
    };
}

async function loadBosses() {
   bosses = await getBosses();
   console.table(bosses);
   renderBosses();
   setInterval(updateCountdowns, 1000);
}

function categorizeBosses() {
    liveBosses = [];
    upcomingBosses = [];
    defeatedBosses = [];

    bosses
        .filter(isBossAvailableToday)
        .forEach(boss => {
            const state = getBossState(boss);
            boss.state = state;
            if (state.status === "LIVE") {
                liveBosses.push(boss);
            } else {
                upcomingBosses.push(boss);
            }
        });
}

function renderLiveBosses() {
    const container = document.getElementById("liveBossList");
    container.innerHTML = "";

    liveBosses.forEach(boss => {
        const state = boss.state;
        container.innerHTML += `
            <div class="boss-card">
                <div class="boss-info">
                    <div class="boss-name">
                        ${boss.Boss}
                    </div>
                    <div class="boss-location">
                        World ${boss.World} • ${boss.Map} • Layer ${boss.Layer}
                    </div>
                </div>

                <div class="boss-right">
                    <div class="boss-time">
                        ${formatCountdown(state.timeLeft)}
                    </div>

                    <button
                        class="btn-defeat"
                        onclick="defeatBoss(${boss.ID})"
                    >
                        Finish
                    </button>
                </div>
            </div>
        `;
    });
}

function renderBosses() {
    categorizeBosses();
    renderLiveBosses();
    document.getElementById("aliveCount").textContent =
        liveBosses.length + " Bosses";
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
