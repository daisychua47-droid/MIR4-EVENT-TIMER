document.getElementById("btnLoad")?.remove();

let bosses = [];
let liveBosses = [];
let liveSoonBosses = [];
let upcomingBosses = [];

let defeatedBosses = [];

let countdownTimer = null;
let storageData = {};

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

function defeatBoss(id){
    const boss = bosses.find(b => String(b.ID) === String(id));

    if(!boss) return;
    const data = loadStorage();

    if(!data[id]){
        data[id] = {};
    }

    const now = new Date();
    
     const spawnType = String(boss["Spawn Type"] || "Daily");

            let nextSpawn;
            
            if (spawnType === "Daily") {
            
                nextSpawn = getNextSpawn(
                    boss,
                    getCurrentSpawn(boss, now)
                );
            
            } else {
            
                nextSpawn = new Date(
                    now.getTime() +
                    Number(boss["Respawn (Min)"]) * 60000
                );
            
            }
     
    data[id].lastDefeated = now.toISOString();
    data[id].nextSpawn = nextSpawn.toISOString();

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
        Math.floor((Date.now() - new Date(date)) / 1000);

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

    const spawnType = String(boss["Spawn Type"] || "Daily");

    // Daily & Interval are always available
    if (spawnType === "Daily" || spawnType === "Interval") {
        return true;
    }

    // Weekly depends on checked weekday
    const today = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][new Date().getDay()];

    return (
        String(boss[today]).toLowerCase() === "true" ||
        boss[today] === true ||
        boss[today] == 1
    );

}


function getBaseSpawn(boss, now) {

    const [hour, minute] = String(boss["Spawn Time"])
        .split(":")
        .map(Number);

    const base = new Date(now);

    base.setHours(hour, minute, 0, 0);

    return base;

}

function getCurrentSpawn(boss, now) {

    const spawnType = String(boss["Spawn Type"] || "Daily");

    let base = getBaseSpawn(boss, now);

      // ==========================
    // DAILY
    // ==========================
    if (spawnType === "Daily") {
    
        // Today's spawn
        if (base <= now) {
            return base;
        }
    
        // Not yet spawned today
        const yesterday = new Date(base);
        yesterday.setDate(yesterday.getDate() - 1);
    
        return yesterday;
    
    }

    // ==========================
    // WEEKLY
    // ==========================
    if (spawnType === "Weekly") {

        for (let i = 0; i < 7; i++) {

            const check = new Date(base);
            check.setDate(base.getDate() - i);

            const dayName =
                ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][check.getDay()];

            const enabled =
                String(boss[dayName]).toLowerCase() === "true" ||
                boss[dayName] === true ||
                boss[dayName] == 1;

            if (enabled && check <= now) {
                return check;
            }

        }

        // fallback
        return base;

    }

    // ==========================
    // INTERVAL
    // ==========================
    const respawnMin = Number(boss["Respawn (Min)"] || 0);
    const respawnMs = respawnMin * 60000;

    while (base > now) {
        base.setDate(base.getDate() - 1);
    }

    const elapsed = now - base;
    const cycles = Math.floor(elapsed / respawnMs);

    return new Date(
        base.getTime() + cycles * respawnMs
    );

}


function getNextSpawn(boss, spawn) {

    const spawnType = String(boss["Spawn Type"] || "Daily");

    // ==========================
    // DAILY
    // ==========================
    if (spawnType === "Daily") {

        const now = new Date();

        const next = new Date(now);

        const [hour, minute] =
            String(boss["Spawn Time"])
            .split(":")
            .map(Number);

        next.setHours(hour, minute, 0, 0);

        if (next <= now) {
            next.setDate(next.getDate() + 1);
        }

        return next;
    }

    // ==========================
    // WEEKLY
    // ==========================
    if (spawnType === "Weekly") {

        const now = new Date();

        for (let i = 0; i <= 7; i++) {

            const check = new Date(now);
            check.setDate(now.getDate() + i);

            const dayName =
                ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][check.getDay()];

            const enabled =
                String(boss[dayName]).toLowerCase() === "true" ||
                boss[dayName] === true ||
                boss[dayName] == 1;

            if (!enabled) continue;

            const [hour, minute] =
                String(boss["Spawn Time"])
                .split(":")
                .map(Number);

            check.setHours(hour, minute, 0, 0);

            if (check > now) {
                return check;
            }

        }

        const next = new Date(now);
        next.setDate(next.getDate() + 7);

        return next;
    }

    // ==========================
    // INTERVAL
    // ==========================
    return new Date(
        spawn.getTime() +
        Number(boss["Respawn (Min)"] || 0) * 60000
    );

}

function getBossState(boss) {

    const now = new Date();
    const storage = storageData[boss.ID];

    // Remove expired manual defeat
    if (
        storage &&
        storage.nextSpawn &&
        new Date(storage.nextSpawn) <= now
    ) {

        const data = loadStorage();

        delete data[boss.ID].lastDefeated;
        delete data[boss.ID].nextSpawn;

        saveStorage(data);

        storageData = data;

    }

    const spawn = getCurrentSpawn(boss, now);

    if (boss.Boss === "sample") {
        console.log({
            now,
            spawn,
            spawnTime: boss["Spawn Time"]
        });
    }

    const nextSpawn = getNextSpawn(boss, spawn);

    if (boss.Boss === "Bulhu") {

    console.log({
        boss: boss.Boss,
        spawn: spawn,
        nextSpawn: nextSpawn,
        nextSpawnIn: Math.floor((nextSpawn - now) / 60000)
    });

}

    const aliveUntil = new Date(
        spawn.getTime() +
        Number(boss["Alive Duration (Min)"]) * 60000
    );

    // -------------------------
    // MANUAL FINISH
    // -------------------------
    const latestStorage = storageData[boss.ID];

    if (
        latestStorage &&
        latestStorage.nextSpawn &&
        now < new Date(latestStorage.nextSpawn)
    ) {

        return {

            status: "DEFEATED",

            spawn,

            aliveUntil,

            nextSpawn: new Date(latestStorage.nextSpawn),

            timeLeft: 0,

            nextSpawnIn:
                new Date(latestStorage.nextSpawn).getTime() -
                now.getTime()

        };

    }

    // -------------------------
    // LIVE
    // -------------------------
    if (
        now >= spawn &&
        now < aliveUntil
    ) {

        return {

            status: "LIVE",

            spawn,

            aliveUntil,

            nextSpawn,

            timeLeft:
                aliveUntil.getTime() - now.getTime(),

            nextSpawnIn: 0

        };

    }

    // -------------------------
    // AUTO FINISH
    // -------------------------
    if (
        boss["Auto Finish"] === true &&
        now >= aliveUntil
    ) {

        const data = loadStorage();

        if (!data[boss.ID]) {
            data[boss.ID] = {};
        }

        if (!data[boss.ID].nextSpawn) {

            data[boss.ID].lastDefeated =
                aliveUntil.toISOString();

            data[boss.ID].nextSpawn =
                nextSpawn.toISOString();

            saveStorage(data);

            storageData = data;

        }

    }

    // -------------------------
    // UPCOMING
    // -------------------------
    return {

        status: "UPCOMING",

        spawn,

        aliveUntil,

        nextSpawn,

        timeLeft: 0,

        nextSpawnIn:
            nextSpawn.getTime() - now.getTime()

    };

}
 

async function loadBosses() {
    bosses = await getBosses();
    renderBosses();
    if (countdownTimer) {
        clearInterval(countdownTimer);
    }
    countdownTimer = setInterval(updateCountdowns, 1000);
}

function categorizeBosses(){

    liveBosses = [];
    liveSoonBosses = [];
    upcomingBosses = [];
    defeatedBosses = [];

    storageData = loadStorage();

    

    bosses.forEach(boss => {

        boss.state = getBossState(boss);

        if (boss.Boss === "Bulhu") {

    console.log({
        status: boss.state.status,
        nextSpawnIn: boss.state.nextSpawnIn / 60000
    });

}

        switch (boss.state.status) {

            case "LIVE":
                liveBosses.push(boss);
                break;

            case "DEFEATED":
                defeatedBosses.push(boss);
                upcomingBosses.push(boss);
                break;

            case "UPCOMING":

                if (
                    boss.state.nextSpawnIn > 0 &&
                    boss.state.nextSpawnIn <= 60 * 60 * 1000
                ) {

                    liveSoonBosses.push(boss);

                } else {

                    upcomingBosses.push(boss);

                }

                break;
        }

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

        const fa = storageData[a.ID]?.favorite ? 1 : 0;
        const fb = storageData[b.ID]?.favorite ? 1 : 0;

        if (fa !== fb) {
            return fb - fa;
        }

        return a.state.timeLeft - b.state.timeLeft;

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

    if (liveBosses.length === 0 && liveSoonBosses.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                No bosses are currently alive.
            </div>
        `;
        return;
    }

    container.innerHTML = `
         ${renderLiveHeader()}
         ${liveBosses.map(renderLiveRow).join("")}

            ${liveSoonBosses.length > 0 ? `
                ${renderSoonDivider()}
                ${liveSoonBosses.map(renderSoonRow).join("")}
            ` : ""}
        </div>
    `;
}

function renderBosses() {
    storageData = loadStorage();
    categorizeBosses();
    renderLiveBosses();
    renderDefeatedBosses();
    renderUpcomingBosses();
    document.getElementById("aliveCount").textContent =
        `${liveBosses.length} Bosses`;
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
