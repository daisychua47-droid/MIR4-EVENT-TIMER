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
let spawnCache = {};

const STORAGE_KEY = "mir4BossTracker";

// ===========================
// Settings
// ===========================
const SETTINGS = {
    timezone: localStorage.getItem("bossTrackerTimezone") || "Asia/Manila"
};
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
            lastDefeated: null,
            finishedSpawn: null
        };
        saveStorage(data);
    }
    return data[id];
}

function defeatBoss(id) {

    const boss = bosses.find(
        b => String(b.ID) === String(id)
    );

    if (!boss) return;

    const data = loadStorage();

    if (!data[id]) {
        data[id] = {
            favorite: false,
            lastDefeated: null,
            finishedSpawn: null
        };
    }

    const now = getGameNow();

    // Current scheduled spawn
    const currentSpawn = getCurrentSpawn(
        boss,
        now
    );

    // Save actual defeat time
    data[id].lastDefeated = now.toISOString();

    // Save WHICH scheduled spawn was finished
    data[id].finishedSpawn = currentSpawn
        ? currentSpawn.toISOString()
        : null;

    saveStorage(data);

    renderBosses();

}


function toggleFavorite(id) {

    const data = loadStorage();

    if (!data[id]) {
           data[id] = {
                favorite: false,
                lastDefeated: null,
                finishedSpawn: null
            };
    }

    data[id].favorite = !data[id].favorite;

    saveStorage(data);

    storageData = data;

    categorizeBosses();

    renderLiveBosses();
    renderSoonBosses();
    renderUpcomingBosses();
    renderDefeatedBosses();

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
        Math.floor((getGameNow() - new Date(date)) / 1000);

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
        getGameNow().getDay()
    ];

    return (
        String(boss[today]).toLowerCase() === "true" ||
        boss[today] === true ||
        boss[today] == 1
    );
}

function getSpawnTimes(boss, date) {

    const spawns = [];

    const spawnType = String(boss["Spawn Type"] || "").toUpperCase();
    const respawn = Number(boss["Respawn (Min)"] || 0);

    let value = boss["Spawn Time"];

    if (!value) return spawns;

    let hour, minute;

    // Google Sheets DateTime
    if (typeof value === "string" && value.includes("T")) {

        const d = new Date(value);

        hour = d.getUTCHours();
        minute = d.getUTCMinutes();

    }
    else {

        const parts = String(value).trim().split(":");

        if (parts.length < 2) return spawns;

        hour = parseInt(parts[0], 10);
        minute = parseInt(parts[1], 10);

    }

    // First spawn
    let spawn = new Date(date);
    spawn.setHours(hour, minute, 0, 0);

    spawns.push(new Date(spawn));

    // Interval bosses
    if (spawnType === "INTERVAL" && respawn > 0) {

        while (true) {

            spawn = new Date(spawn.getTime() + respawn * 60000);

            if (spawn.getDate() !== date.getDate())
                break;

            spawns.push(new Date(spawn));

        }

    }

    return spawns;

}




function getCurrentSpawn(boss, now) {

    const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

    let latestSpawn = null;

    // Check today and previous 6 days
    for (let back = 0; back <= 6; back++) {

        const date = new Date(now);
        date.setDate(date.getDate() - back);

        const dayName = days[date.getDay()];

        // Boss not available on this day
        if (
            String(boss[dayName]).toUpperCase() !== "TRUE" &&
            boss[dayName] !== true &&
            boss[dayName] != 1
        ) {
            continue;
        }

        let spawns;

            // Use cache only for today
            if (back === 0 && spawnCache[boss.ID]) {
            
                spawns = spawnCache[boss.ID];
            
            } else {
            
                spawns = getSpawnTimes(boss, date);
            
            }

        for (const spawn of spawns) {

            if (spawn <= now) {

                if (!latestSpawn || spawn > latestSpawn) {
                    latestSpawn = spawn;
                }

            }

        }

    }

    return latestSpawn;

}


function getNextSpawn(boss) {

    const now = getGameNow();
    const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

    // Check today and next 6 days
    for (let forward = 0; forward <= 6; forward++) {

        const date = new Date(now);
        date.setDate(date.getDate() + forward);

        const dayName = days[date.getDay()];

        // Boss not available today
        if (
            String(boss[dayName]).toUpperCase() !== "TRUE" &&
            boss[dayName] !== true &&
            boss[dayName] != 1
        ) {
            continue;
        }

       let spawns;

            // Use cache for today
            if (forward === 0 && spawnCache[boss.ID]) {
            
                spawns = spawnCache[boss.ID];
            
            } else {
            
                spawns = getSpawnTimes(boss, date);
            
            }

        for (const spawn of spawns) {

            if (spawn > now) {
                return spawn;
            }

        }

    }

    return null;

}

function getServerNow() {

    if (!serverTime) {
        return new Date();
    }

    const elapsed = Date.now() - serverSyncTime;

    return new Date(serverTime.getTime() + elapsed);

}

// ===========================
// Game Time (Timezone Aware)
// ===========================

function getGameNow() {
    const now = getServerNow();
    return new Date(
        now.toLocaleString("en-US", {
            timeZone: SETTINGS.timezone
        })
    );
}

function setGameTimezone(timezone){
    SETTINGS.timezone = timezone;
    localStorage.setItem(
        "bossTrackerTimezone",
        timezone
    );
    rebuildSpawnCache();
    renderBosses();
}

function getBossState(boss) {

    const now = getGameNow();

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
        status: "UPCOMING",
        spawn,
        nextSpawn: null,
        timeLeft: 0,
        nextSpawnIn: 0
    };

}

 const aliveMinutes = Number(boss["Alive Duration (Min)"] || 0);
        const endTime = new Date(
    spawn.getTime() + aliveMinutes * 60000
);

const info = storageData[boss.ID];

// Manual finished already?
if (
    info &&
    info.finishedSpawn &&
    new Date(info.finishedSpawn).getTime() === spawn.getTime()
) {
    return {
        status: "UPCOMING",
        spawn,
        nextSpawn,
        timeLeft: 0,
        nextSpawnIn: nextSpawn
            ? nextSpawn - now
            : 0
    };
}

// Alive
if (now < endTime) {

    return {
        status: "LIVE",
        spawn,
        nextSpawn,
        timeLeft: endTime - now,
        nextSpawnIn: nextSpawn
            ? nextSpawn - now
            : 0
    };

}

// Alive duration finished
// Automatically mark this spawn as completed
if (
    !info ||
    info.finishedSpawn !== spawn.toISOString()
) {

    const data = loadStorage();

    if (!data[boss.ID]) {

        data[boss.ID] = {
            favorite: false
        };

    }

    data[boss.ID].finishedSpawn = spawn.toISOString();
    data[boss.ID].lastDefeated = now.toISOString();
    saveStorage(data);

}

return {
    status: "UPCOMING",
    spawn,
    nextSpawn,
    timeLeft: 0,
    nextSpawnIn: nextSpawn
        ? nextSpawn - now
        : 0
};
        
       
}

function updateBossTimeline(boss) {

    if (!boss.state) return;

    switch (boss.state.status) {

        case "LIVE":

            boss.state.timeLeft -= 1000;

            if (boss.state.timeLeft <= 0) {

                boss.state = getBossState(boss);

            }

            break;

        case "UPCOMING":

            boss.state.nextSpawnIn -= 1000;

            if (boss.state.nextSpawnIn <= 0) {

                boss.state = getBossState(boss);

            }

            break;

    }

}
 

async function loadBosses() {
    bosses = await getBosses();
    rebuildSpawnCache();
    renderBosses();

    if (countdownTimer) {
        clearInterval(countdownTimer);
    }
    countdownTimer = setInterval(updateCountdowns, 1000);
    // Re-sync server time and boss data every minute
    setInterval(async () => {
            bosses = await getBosses();
            rebuildSpawnCache();
            renderBosses();
        }, 60000);
}

function rebuildSpawnCache(){

    spawnCache = {};

    const today = getGameNow();

    bosses.forEach(boss=>{

        spawnCache[boss.ID]=getSpawnTimes(boss,today);

    });

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
    boss.state.nextSpawnIn = nextSpawn
    ? nextSpawn - getGameNow()
    : 0;

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
    
       <div class="action-buttons">

            <button
                class="btn-info"
                onclick="showBossDetails(${boss.ID})">
                ℹ
            </button>
        
           <button
                class="btn-defeat"
                onclick="defeatBoss(${boss.ID})">
                Finish
            </button>
        
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

// ==========================
// Boss Details Modal
// ==========================

function closeBossModal(){

    document.getElementById("bossModal").style.display = "none";

}

function showBossDetails(id){

    const boss = bosses.find(
        b => String(b.ID) === String(id)
    );

    if(!boss) return;

    const todaySpawns = getSpawnTimes(
        boss,
        getGameNow()
    );

    const nextSpawn = getNextSpawn(boss);

    document.getElementById("bossModalBody").innerHTML = `

        <div class="boss-title">
            ${boss.Boss}
        </div>

        <div class="boss-info">

            <strong>🌍 World</strong>
            <div>${boss.World}</div>

            <strong>📍 Map</strong>
            <div>${boss.Map}</div>

            <strong>Layer</strong>
            <div>${boss.Layer}</div>

            <strong>Respawn</strong>
            <div>${boss["Respawn (Min)"] || "-" } Minutes</div>

            <strong>Alive</strong>
            <div>${boss["Alive Duration (Min)"]} Minutes</div>

        </div>

        <h3>Today's Spawn</h3>

        <div class="spawn-list">

            ${
                todaySpawns.map(spawn=>`

                    <div class="spawn-time">
                        ${spawn.toLocaleTimeString([],{
                            hour:"2-digit",
                            minute:"2-digit",
                            hour12:false
                        })}
                    </div>

                `).join("")
            }

        </div>

          <div class="next-spawn">
    
                    Next Spawn
                
                    <br><br>
                
                    ${
                        nextSpawn
                        ? nextSpawn.toLocaleTimeString([],{
                            hour:"2-digit",
                            minute:"2-digit",
                            hour12:false
                        })
                        : "-"
                    }
                
                </div>
                
               <div style="text-align:center;margin-top:20px;">
                    <button
                        class="btn-defeat"
                        onclick="defeatBoss(${boss.ID}); closeBossModal();">
                        ✔ Finish Boss
                    </button>
                </div>

    `;

    document.getElementById("bossModal").style.display="flex";

}



loadBosses();
