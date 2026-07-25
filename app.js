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

function getDefeatedBosses() {
    const storage = loadStorage();
    return bosses
        .filter(boss => storage[boss.ID]?.lastDefeated)
        .sort((a, b) => {
            return new Date(storage[b.ID].lastDefeated)
                 - new Date(storage[a.ID].lastDefeated);
        });
}

function renderDefeatedBosses() {
    const container = document.getElementById("defeatedList");
    container.innerHTML = "";
    const defeated = getDefeatedBosses();

    if (defeated.length === 0) {
        container.innerHTML =
            '<div class="empty-state">No defeated bosses</div>';
        return;
    }

    defeated.forEach(boss => {
        const defeatedTime =
            loadStorage()[boss.ID].lastDefeated;
        container.innerHTML += `

        <div class="defeated-item">
            <div>
                <div class="boss-name">
                    ${boss.Boss}
                </div>
                <small>
                    ${new Date(defeatedTime).toLocaleString()}
                </small>
            </div>
        </div>
        `;
    });
}


function getTodayName() {
    return ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][new Date().getDay()];
}

function isBossAvailableToday(boss) {
    const today = getTodayName();
    console.log(
        boss.Boss,
        today,
        boss[today],
        typeof boss[today]
    );
    return boss[today];
}

function getBossState(boss) {

    console.log(
    boss.Boss,
    boss["Spawn Time"],
    boss["Respawn (Min)"],
    boss["Alive Duration (Min)"]
);

    
    const now = new Date();
    const parts = String(boss["Spawn Time"]).split(":");
    
    const hour = Number(parts[0]);
    const minute = Number(parts[1]);

    let spawn = new Date();
    spawn.setHours(hour, minute, 0, 0);
    
    const respawnMs =
        Number(boss["Respawn (Min)"]) * 60000;

    const aliveMs =
        Number(boss["Alive Duration (Min)"]) * 60000;

    console.log({
        boss: boss.Boss,
        hour,
        minute,
        respawnMs,
        aliveMs
    });

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

    console.clear();

    bosses
        .filter(isBossAvailableToday)
        .forEach(boss => {

            const state = getBossState(boss);

            boss.state = state;

            console.log({
                boss: boss.Boss,
                status: state.status,
                timeLeft: state.timeLeft,
                nextSpawnIn: state.nextSpawnIn
            });

            if (state.status === "LIVE") {
                liveBosses.push(boss);
            } else {
                upcomingBosses.push(boss);
            }

        });

    console.log("LIVE:", liveBosses.length);
    console.log("UPCOMING:", upcomingBosses.length);

}

function renderLiveBosses() {

    const container = document.getElementById("liveBossList");

    container.innerHTML = "";

    if (liveBosses.length === 0) {

        container.innerHTML = `
            <div class="empty-state">
                No bosses are currently alive.
            </div>
        `;

        return;
    }

    container.innerHTML = `
        <div class="boss-table">

            <div class="boss-head">

                <div>Status</div>
                <div>Boss</div>
                <div>World</div>
                <div>Map</div>
                <div>Layer</div>
                <div>Time Left</div>
                <div>Action</div>
                <div>★</div>

            </div>

            ${liveBosses.map(boss=>{

                return `

                <div class="boss-row">

                    <div>
                        <span class="status green"></span>
                    </div>

                    <div class="boss-name">
                        ${boss.Boss}
                    </div>

                    <div>
                        W${boss.World}
                    </div>

                    <div>
                        ${boss.Map}
                    </div>

                    <div>
                        ${boss.Layer}
                    </div>

                    <div class="countdown">
                        ${formatCountdown(boss.state.timeLeft)}
                    </div>
                    <div>
                        <button
                            class="btn-defeat"
                            onclick="defeatBoss(${boss.ID})">
                            Finish
                        </button>
                    </div>
                    <div>
                        ☆
                    </div>
                </div>
                `;
            }).join("")}
        </div>
    `;
}

function renderBosses() {
    categorizeBosses();
    renderLiveBosses();
    renderDefeatedBosses();
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
