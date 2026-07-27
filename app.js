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

    let html = `
        <div class="boss-table defeated-table">

            <div class="boss-head defeated-head">
                <div>Boss</div>
                <div>Defeated</div>
                <div>Next Spawn</div>
            </div>
    `;

            const storage = storageData;
            
            defeatedBosses.forEach(boss => {
                const data = storage[boss.ID];
                html += `
                  <div class="boss-row defeated-row">
                    
                        <div
                            class="favorite-name"
                            onclick="toggleFavorite(${boss.ID})">
                    
                            <span class="favorite-icon">
                                ${storageData[boss.ID]?.favorite ? "⭐" : "☆"}
                            </span>
                    
                            ${boss.Boss}
                    
                        </div>
                    
                        <div>
                            ${timeAgo(data.lastDefeated)}
                        </div>
                    
                        <div>
                            ${formatCountdown(boss.state.nextSpawnIn)}
                        </div>
                    
                    </div>
                `;
            });

    html += `
        </div>
    `;

    container.innerHTML = html;

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

    let html = `
        <div class="boss-table">
            <div class="upcoming-head">
                <div>Boss</div>
                <div>World</div>
                <div>Map</div>
                <div>Spawn In</div>
            </div>
    `;

    list.forEach(boss => {

        html += `
        <div class="upcoming-row">
            <div
                class="favorite-name"
                onclick="toggleFavorite(${boss.ID})">
                <span class="favorite-icon">
                    ${storageData[boss.ID]?.favorite ? "⭐" : "☆"}
                </span>
                ${boss.Boss}
            </div>
        
            <div>${boss.World}</div>
            <div>${boss.Map}</div>
               <div class="countdown upcoming-countdown">
                    ${formatCountdown(boss.state.nextSpawnIn)}
                </div>
        </div>
        `;

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
    const today = getTodayName();
    return boss[today];
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

    // DAILY BOSSES
    if (spawnType === "Daily") {
        return base;
    }

    // INTERVAL BOSSES
    const respawnMin = Number(boss["Respawn (Min)"]);
    const respawnMs = respawnMin * 60000;

    if (base > now) {
        base.setDate(base.getDate() - 1);
    }

    const elapsed = now - base;
    const cycles = Math.floor(elapsed / respawnMs);

    return new Date(base.getTime() + cycles * respawnMs);

}


function getNextSpawn(boss, spawn) {

    const spawnType = String(boss["Spawn Type"] || "Daily");

    if (spawnType === "Daily") {

        const next = new Date(spawn);
        next.setDate(next.getDate() + 1);

        return next;
    }

    return new Date(
        spawn.getTime() +
        Number(boss["Respawn (Min)"]) * 60000
    );

}

function getBossState(boss) {

    const now = new Date();

    const storage = storageData[boss.ID];

    const spawnType = String(boss["Spawn Type"] || "Daily");

    const aliveMinutes = Number(boss["Alive Duration (Min)"] || 30);

    // --------------------------
    // Today's scheduled spawn
    // --------------------------
    const [hour, minute] = String(boss["Spawn Time"])
        .split(":")
        .map(Number);

    let spawn = new Date(now);

    spawn.setHours(hour, minute, 0, 0);

    // ==========================
    // INTERVAL BOSSES
    // ==========================
    if (spawnType !== "Daily") {

        const respawnMin = Number(boss["Respawn (Min)"] || 0);

        const respawnMs = respawnMin * 60000;

        while (spawn > now) {
            spawn.setDate(spawn.getDate() - 1);
        }

        while (
            spawn.getTime() + respawnMs <= now.getTime()
        ) {
            spawn = new Date(spawn.getTime() + respawnMs);
        }

    }

    // --------------------------
    // Alive Until
    // --------------------------
    let aliveUntil = new Date(
        spawn.getTime() + aliveMinutes * 60000
    );

    // --------------------------
    // Next Spawn
    // --------------------------
    let nextSpawn;

    if (spawnType === "Daily") {

        if (now < spawn) {

            nextSpawn = new Date(spawn);

        } else {

            nextSpawn = new Date(spawn);
            nextSpawn.setDate(nextSpawn.getDate() + 1);

        }

    } else {

        nextSpawn = new Date(
            spawn.getTime() +
            Number(boss["Respawn (Min)"]) * 60000
        );

    }

    // ==========================
    // MANUAL DEFEAT
    // ==========================
    if (
        storage &&
        storage.nextSpawn &&
        now < new Date(storage.nextSpawn)
    ) {

        return {

            status: "DEFEATED",

            spawn,

            aliveUntil,

            nextSpawn: new Date(storage.nextSpawn),

            timeLeft: 0,

            nextSpawnIn:
                new Date(storage.nextSpawn).getTime() -
                now.getTime()

        };

    }

    // ==========================
    // DAILY BOSSES
    // ==========================
    if (spawnType === "Daily") {

        // Upcoming Today
        if (now < spawn) {

            return {

                status: "UPCOMING",

                spawn,

                aliveUntil,

                nextSpawn: spawn,

                timeLeft: 0,

                nextSpawnIn:
                    spawn.getTime() - now.getTime()

            };

        }

        // Live
        if (now < aliveUntil) {

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

    }

    // ==========================
    // INTERVAL LIVE
    // ==========================
    if (
        spawnType !== "Daily" &&
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

    // ==========================
    // AUTO FINISH
    // ==========================
    if (
        boss["Auto Finish"] === true &&
        now >= aliveUntil
    ) {

        const data = loadStorage();

        if (!data[boss.ID]) {
            data[boss.ID] = {};
        }

        if (!data[boss.ID].lastDefeated) {

            data[boss.ID].lastDefeated =
                aliveUntil.toISOString();

            data[boss.ID].nextSpawn =
                nextSpawn.toISOString();

            saveStorage(data);

            storageData = data;

        }

    }

    // ==========================
    // UPCOMING
    // ==========================
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

    bosses.forEach(boss=>{

        boss.state = getBossState(boss);

        switch(boss.state.status){

            case "LIVE":
                liveBosses.push(boss);
                break;

            case "DEFEATED":
                defeatedBosses.push(boss);
                upcomingBosses.push(boss);
                break;

          case "UPCOMING":

                if (boss.state.nextSpawnIn <= 3600000) {
                    liveSoonBosses.push(boss);
                } else {
                    upcomingBosses.push(boss);
                }
                break;

        }

    });

       // Recently Defeated (Newest First)
        const storage = storageData;
        
       defeatedBosses.sort((a,b)=>{

            const fav =
                (storageData[b.ID]?.favorite?1:0) -
                (storageData[a.ID]?.favorite?1:0);
        
            if(fav!==0) return fav;
        
            const da = new Date(storageData[a.ID]?.lastDefeated || 0);
            const db = new Date(storageData[b.ID]?.lastDefeated || 0);
        
            return db-da;
        
        });
        
        // Upcoming & Live Soon (Nearest Spawn First)
        upcomingBosses.sort(
            (a,b)=>a.state.nextSpawnIn-b.state.nextSpawnIn
        );
        
        liveSoonBosses.sort(
            (a,b)=>a.state.nextSpawnIn-b.state.nextSpawnIn
        );

        const favoriteSort = (a, b) => {
            
                const fa = storageData[a.ID]?.favorite ? 1 : 0;
                const fb = storageData[b.ID]?.favorite ? 1 : 0;
            
                return fb - fa;
            
            };
            
            liveBosses.sort(favoriteSort);
            liveSoonBosses.sort(favoriteSort);
            upcomingBosses.sort(favoriteSort);
            defeatedBosses.sort(favoriteSort);

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

            ${liveBosses.map(boss=>{

                return `

                <div class="boss-row">

                    <div>
                        <span class="status green"></span>
                    </div>

                   <div
                        class="boss-name favorite-name"
                        onclick="toggleFavorite(${boss.ID})">
                    
                        <span class="favorite-icon">
                            ${storageData[boss.ID]?.favorite ? "⭐" : "☆"}
                        </span>
                    
                        ${boss.Boss}
                    
                    </div>

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
            }).join("")}

                            ${liveSoonBosses.length > 0 ? `
                            
                                <div class="boss-divider">
                                    <div class="divider-title">
                                        🟡 SPAWNING SOON (Next 60 Minutes)
                                    </div>
                                </div>
                            
                                ${liveSoonBosses.map(boss=>`
                            
                                    <div class="boss-row soon-row">
                            
                                        <div>
                                            <span class="status soon"></span>
                                        </div>
                            
                                        <div
                                            class="boss-name favorite-name"
                                            onclick="toggleFavorite(${boss.ID})">
                                        
                                            <span class="favorite-icon">
                                                ${storageData[boss.ID]?.favorite ? "⭐" : "☆"}
                                            </span>
                                        
                                            ${boss.Boss}
                                        
                                        </div>
                            
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
                            
                                `).join("")}
                            
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
