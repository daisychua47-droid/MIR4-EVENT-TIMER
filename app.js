document.getElementById("btnLoad")?.remove();
let bosses = [];
let liveBosses = [];
let liveSoonBosses = [];
let upcomingBosses = [];
let defeatedBosses = [];

let countdownTimer = null;
let storageData = {};

let serverTime = null;
let serverSyncTime = null;
let lastBossState = "";

const STORAGE_KEY = "mir4BossTracker";

// 60 minutes
const SOON_WINDOW = 60 * 60 * 1000;

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

    const boss = bosses.find(b => String(b.ID) === String(id));

    if (!boss) return;

    const data = loadStorage();

    if (!data[id]) {
        data[id] = {};
    }

    const now = getServerNow();
    const nextSpawn = getNextSpawn(boss);
    
    data[id].lastDefeated = now.toISOString();

    saveStorage(data);
    renderBosses();
}


function toggleFavorite(id) {
    const data = loadStorage();
    if (!data[id]) {
        data[id] = {
            favorite: false,
            lastDefeated: null,
            nextSpawn: null
        };
    }

    data[id].favorite = !data[id].favorite;
    saveStorage(data);
    renderBosses();
}

function renderFavoriteBoss(boss) {
    return `
        <div
            class="favorite-name"
            onclick="toggleFavorite(${boss.ID})">
            <span class="favorite-icon">
                ${storageData[boss.ID]?.favorite ? "⭐" : "☆"}
            </span>
            ${boss.Boss}
        </div>
    `;
}

function renderSoonHeader() {
    return `
        <div class="boss-table">
            <div class="boss-head">
                <div>Status</div>
                <div>Boss</div>
                <div>World</div>
                <div>Map</div>
                <div>Layer</div>
                <div>Spawn In</div>
                <div>Action</div>
            </div>
    `;
}

function renderDefeatedHeader() {
    return `
        <div class="boss-table defeated-table">
            <div class="boss-head defeated-head">
                <div>Boss</div>
                <div>Defeated</div>
                <div>Next Spawn</div>
            </div>
    `;
}

function renderDefeatedRow(boss) {
    const data = storageData[boss.ID];
    return `
        <div class="boss-row defeated-row">
           ${renderFavoriteBoss(boss)}
            <div>
                ${timeAgo(data.lastDefeated)}
            </div>
            <div>
                ${formatCountdown(boss.state.nextSpawnIn)}
            </div>
        </div>
    `;
}

function renderDefeatedBosses() {

    const container = document.getElementById("defeatedList");

    if (defeatedBosses.length === 0) {

        container.innerHTML = `
            <div class="empty-state">
                No recently defeated bosses.
            </div>
        `;

        return;
    }

     let html = renderDefeatedHeader();
        defeatedBosses.forEach(boss => {
            html += renderDefeatedRow(boss);
        });
    html += `
        </div>
    `;
    container.innerHTML = html;
}

function renderUpcomingHeader() {
    return `
        <div class="boss-table">
            <div class="upcoming-head">
                <div>Boss</div>
                <div>World</div>
                <div>Map</div>
                <div>Spawn In</div>
            </div>
    `;
}

function renderUpcomingRow(boss) {

    return `
        <div class="upcoming-row">
                ${renderFavoriteBoss(boss)}
            <div>${boss.World}</div>
            <div>${boss.Map}</div>
            <div class="countdown upcoming-countdown">
                ${formatCountdown(boss.state.nextSpawnIn)}
            </div>

        </div>
    `;

}

function renderUpcomingBosses() {

    const container = document.getElementById("upcomingList");

    const list = upcomingBosses.filter(
        boss => !liveSoonBosses.some(x => x.ID == boss.ID)
    );

    if (list.length === 0) {

        container.innerHTML = `
            <div class="empty-state">
                No upcoming bosses.
            </div>
        `;

        return;
    }

   let html = renderUpcomingHeader();
         list.forEach(boss => {
            html += renderUpcomingRow(boss);
        });

    html += `</div>`;
    container.innerHTML = html;
}



function timeAgo(date) {
    const seconds =
        Math.floor((getServerNow() - new Date(date)) / 1000);

    if (seconds < 60)
        return seconds + " sec ago";

    if (seconds < 3600)
        return Math.floor(seconds / 60) + " min ago";

    if (seconds < 86400)
        return Math.floor(seconds / 3600) + " hr ago";

    return Math.floor(seconds / 86400) + " day ago";

}

function getTodayName() {
    return ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][new Date().getDay()];
}

function isBossAvailableToday(boss) {
    const today = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][
        getServerNow().getDay()
    ];

    return (
        String(boss[today]).toLowerCase() === "true" ||
        boss[today] === true ||
        boss[today] == 1
    );
}

function getSpawnTimes(boss, now) {

    const times = [];

    for (let i = 1; i <= 10; i++) {

        const value = boss[`Spawn Time ${i}`];

        // Stop once a blank is found
        if (!value || String(value).trim() === "") {
            break;
        }

        const [hour, minute] = String(value)
            .split(":")
            .map(Number);

        const spawn = new Date(now);

        spawn.setHours(hour, minute, 0, 0);

        times.push(spawn);

    }

    return times;

}



function getCurrentSpawn(boss, now) {

    const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

    for (let back = 0; back < 7; back++) {

        const date = new Date(now);
        date.setDate(date.getDate() - back);

        const dayName = days[date.getDay()];

        if (
            String(boss[dayName]).toLowerCase() !== "true" &&
            boss[dayName] !== true &&
            boss[dayName] != 1
        ) {
            continue;
        }

        const spawns = getSpawnTimes(boss, date);

        let current = null;

        for (const spawn of spawns) {

            if (back > 0 || spawn <= now) {
                current = spawn;
            } else {
                break;
            }

        }

        if (current) {
            return current;
        }

    }

    return null;

}


function getNextSpawn(boss) {

    const now = getServerNow();
    const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

    for (let forward = 0; forward < 7; forward++) {

        const date = new Date(now);
        date.setDate(date.getDate() + forward);

        const dayName = days[date.getDay()];

        if (
            String(boss[dayName]).toLowerCase() !== "true" &&
            boss[dayName] !== true &&
            boss[dayName] != 1
        ) {
            continue;
        }

        const spawns = getSpawnTimes(boss, date);

        for (const spawn of spawns) {

            if (spawn > now) {
                return spawn;
            }

        }

    }

    console.log(
    boss.Boss,
    "No next spawn found",
    getServerNow()
);
    return null;

}

function getServerNow() {

    if (!serverTime) {
        return new Date();
    }

    const elapsed = Date.now() - serverSyncTime;

    return new Date(serverTime.getTime() + elapsed);

}

function getBossState(boss) {

    const now = getServerNow();

    if (!isBossAvailableToday(boss)) {
        return {
            status: "INACTIVE",
            spawn: null,
            nextSpawn: null,
            timeLeft: 0,
            nextSpawnIn: 0
        };
    }

   const spawn = getCurrentSpawn(boss, now);

    if (!spawn) {
        return {
            status: "INACTIVE",
            spawn: null,
            nextSpawn: null,
            timeLeft: 0,
            nextSpawnIn: 0
        };
    }

const nextSpawn = getNextSpawn(boss);

if (!nextSpawn) {
    return {
        status: "INACTIVE",
        spawn,
        nextSpawn: null,
        timeLeft: 0,
        nextSpawnIn: 0
    };
}

 const aliveMinutes = Number(boss["Alive Duration (Min)"] || 0);

        const autoFinish =
            String(boss["Auto Finish"]).toLowerCase() === "true" ||
            boss["Auto Finish"] === true ||
            boss["Auto Finish"] == 1;
        
        const endTime = new Date(
            spawn.getTime() + aliveMinutes * 60000
        );
        
        // Manual finish boss
        if (!autoFinish) {
        
            const info = storageData[boss.ID];
        
            if (
                info &&
                info.lastDefeated &&
                new Date(info.lastDefeated) >= spawn
            ) {
        
                return {
                    status: "UPCOMING",
                    spawn,
                    nextSpawn,
                    timeLeft: 0,
                    nextSpawnIn: nextSpawn - now
                };
        
            }
        
            return {
                status: "LIVE",
                spawn,
                nextSpawn: null,
                timeLeft: 0,
                nextSpawnIn: 0
            };
        
        }
        
        // Auto finish boss
        if (now < endTime) {
        
            return {
                status: "LIVE",
                spawn,
                nextSpawn: getNextSpawn(boss),
                timeLeft: endTime - now,
                nextSpawnIn: 0
            };
        
        }

    return {
        status: "UPCOMING",
        spawn,
        nextSpawn,
        timeLeft: 0,
        nextSpawnIn: nextSpawn - now
    };

}

function updateBossTimeline(boss) {

    boss.state = getBossState(boss);

    if (boss.state.status === "LIVE") {

        boss.state.timeLeft -= 1000;

        if (boss.state.timeLeft <= 0) {
            boss.state = getBossState(boss);
        }

    }
    else if (boss.state.status === "UPCOMING") {

       boss.state.nextSpawnIn -= 1000;

        if (boss.state.nextSpawnIn <= 0) {
            boss.state = getBossState(boss);
        }

    }

}
 

async function loadBosses() {
    bosses = await getBosses();
    renderBosses();

    if (countdownTimer) {
        clearInterval(countdownTimer);
    }
    countdownTimer = setInterval(updateCountdowns, 1000);
    // Re-sync server time and boss data every minute
      setInterval(async () => {
        bosses = await getBosses();
        renderBosses();
        }, 60000);
}

function categorizeBosses(){
    liveBosses = [];
    liveSoonBosses = [];
    upcomingBosses = [];
    defeatedBosses = [];
    storageData = loadStorage();

   bosses.forEach(boss => {

    boss.state = getBossState(boss);

    if (boss.state.status === "LIVE") {

        liveBosses.push(boss);

    }
    else if (boss.state.status === "UPCOMING") {

        if (
            boss.state.nextSpawnIn > 0 &&
            boss.state.nextSpawnIn <= SOON_WINDOW
        ) {

            liveSoonBosses.push(boss);

        } else {

            upcomingBosses.push(boss);

        }

    }

});

// ==========================================
// Recently Defeated
// ==========================================

Object.keys(storageData).forEach(id => {

    const info = storageData[id];

    if (!info.lastDefeated) return;

    const boss = bosses.find(
        b => String(b.ID) === String(id)
    );

    if (!boss) return;

    // Don't show if boss is currently alive
    if (liveBosses.some(x => x.ID == boss.ID)) {
        return;
    }

    boss.state = boss.state || {};

    const nextSpawn = getNextSpawn(boss);

    boss.state.nextSpawn = nextSpawn;
    boss.state.nextSpawnIn = nextSpawn - getServerNow();

    defeatedBosses.push(boss);

});

    // ==========================
    // SORT FUNCTION
    // Favorites first
    // Then nearest countdown
    // ==========================

    const sortByFavoriteThenCountdown = (a, b) => {

        const fa = storageData[a.ID]?.favorite ? 1 : 0;
        const fb = storageData[b.ID]?.favorite ? 1 : 0;

        if (fa !== fb) {
            return fb - fa;
        }

        return a.state.nextSpawnIn - b.state.nextSpawnIn;

    };

   // ==========================
    // LIVE
    // ==========================
    
    liveBosses.sort((a, b) => {
    
        // ⭐ Favorites first
        const fa = storageData[a.ID]?.favorite ? 1 : 0;
        const fb = storageData[b.ID]?.favorite ? 1 : 0;
    
        if (fa !== fb) {
            return fb - fa;
        }
    
        // 🌍 Sort by World
        const wa = parseInt(String(a.World).replace(/\D/g, "")) || 999;
        const wb = parseInt(String(b.World).replace(/\D/g, "")) || 999;
    
        if (wa !== wb) {
            return wa - wb;
        }
    
        // 🆕 Newest spawned boss first
        if (a.state.spawn.getTime() !== b.state.spawn.getTime()) {
            return b.state.spawn.getTime() - a.state.spawn.getTime();
        }
    
        // 🔤 Boss name
        return a.Boss.localeCompare(b.Boss);
    
    });

    // ==========================
    // LIVE SOON
    // ==========================

    liveSoonBosses.sort(sortByFavoriteThenCountdown);

    // ==========================
    // UPCOMING
    // ==========================

    upcomingBosses.sort(sortByFavoriteThenCountdown);

    // ==========================
    // RECENTLY DEFEATED
    // ==========================

    defeatedBosses.sort((a, b) => {

        const fa = storageData[a.ID]?.favorite ? 1 : 0;
        const fb = storageData[b.ID]?.favorite ? 1 : 0;

        if (fa !== fb) {
            return fb - fa;
        }

        const da = new Date(storageData[a.ID]?.lastDefeated || 0);
        const db = new Date(storageData[b.ID]?.lastDefeated || 0);

        return db - da;

    });

}

function renderLiveHeader() {

    return `
        <div class="boss-table">

            <div class="boss-head">

                <div>Status</div>
                <div>Boss</div>
                <div>World</div>
                <div>Map</div>
                <div>Layer</div>
                <div>Time Left</div>
                <div>Action</div>

            </div>
    `;

}

function renderWorldHeader(world) {
    return `
        <div class="world-divider">
            🌍 ${world}
        </div>
    `;
}

function renderLiveRow(boss) {
    return `
       <div class="boss-row">
        <div>
            <span class="status green"></span>
        </div>
    
        ${renderFavoriteBoss(boss)}
    
        <div>${boss.World}</div>
        <div>${boss.Map}</div>
        <div>${boss.Layer}</div>
        <div class="countdown">
            ${formatCountdown(boss.state.timeLeft)}
        </div>
    
       <div>
            ${
                String(boss["Auto Finish"]).toLowerCase() === "true"
                ? ""
                : `
                <button
                    class="btn-defeat"
                    onclick="defeatBoss(${boss.ID})">
                    Finish
                </button>
                `
            }
        </div>
    </div>
    `;
}

function renderSoonRow(boss) {
    return `
        <div class="boss-row soon-row">
            <div>
                <span class="status soon"></span>
            </div>
             ${renderFavoriteBoss(boss)}
            <div>
                ${boss.World}
            </div>
            <div>
                ${boss.Map}
            </div>
            <div>
                ${boss.Layer}
            </div>
            <div class="countdown">
                ${formatCountdown(boss.state.nextSpawnIn)}
            </div>
            <div>
                <span class="soon-text">
                    Spawn In
                </span>
            </div>
        </div>
    `;
}

function renderSoonBosses() {
    const container = document.getElementById("soonBossList");
    if (liveSoonBosses.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                No bosses spawning soon.
            </div>
        `;
        document.getElementById("soonCount").textContent = "0 Bosses";
        return;
    }

    container.innerHTML = `
        ${renderSoonHeader()}
        ${liveSoonBosses.map(renderSoonRow).join("")}
        </div>
    `;
    document.getElementById("soonCount").textContent =
        `${liveSoonBosses.length} Bosses`;

}

function renderSoonDivider() {

    return `
        <div class="boss-divider">
            <div class="divider-title">
                🟡 SPAWNING SOON (Next 60 Minutes)
            </div>
        </div>
    `;

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

    let html = renderLiveHeader();
    let currentWorld = "";
    
    liveBosses.forEach(boss => {
    
        if (boss.World !== currentWorld) {
    
            currentWorld = boss.World;
    
            html += renderWorldHeader(currentWorld);
    
        }
    
        html += renderLiveRow(boss);
    
    });
    
    html += "</div>";
    
    container.innerHTML = html;
}

function renderBosses() {
    storageData = loadStorage();
    categorizeBosses();
    renderLiveBosses();
    renderSoonBosses();
    renderDefeatedBosses();
    renderUpcomingBosses();
    document.getElementById("aliveCount").textContent =
        `${liveBosses.length} Bosses`;

    lastBossState =
    liveBosses.length + "|" +
    liveSoonBosses.length + "|" +
    upcomingBosses.length + "|" +
    defeatedBosses.length;
}




function updateCountdowns() {

   bosses.forEach(updateBossTimeline);
    
    renderVisibleCountdowns();

    // Re-render automatically when a boss changes state
    const needRefresh =
        liveBosses.some(b => b.state.timeLeft <= 0) ||
        liveSoonBosses.some(b => b.state.nextSpawnIn <= 0) ||
        upcomingBosses.some(b => b.state.nextSpawnIn <= SOON_WINDOW);
    
    if (needRefresh) {
        renderBosses();
    }

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

function renderVisibleCountdowns() {

    document.querySelectorAll("#liveBossList .countdown")
        .forEach((el,i)=>{

            if(liveBosses[i]){

                el.textContent =
                    formatCountdown(
                        liveBosses[i].state.timeLeft
                    );

            }

        });

    document.querySelectorAll("#soonBossList .countdown")
        .forEach((el,i)=>{

            if(liveSoonBosses[i]){

                el.textContent =
                    formatCountdown(
                        liveSoonBosses[i].state.nextSpawnIn
                    );

            }

        });

    document.querySelectorAll("#upcomingList .upcoming-countdown")
        .forEach((el,i)=>{

            if(upcomingBosses[i]){

                el.textContent =
                    formatCountdown(
                        upcomingBosses[i].state.nextSpawnIn
                    );

            }

        });

}



loadBosses();
