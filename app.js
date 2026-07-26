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
    const nextSpawn = new Date(
        now.getTime() + Number(boss["Respawn (Min)"]) * 60000
    );

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
                        <div>${boss.Boss}</div>
                        <div>${timeAgo(data.lastDefeated)}</div>
                        <div>${formatCountdown(boss.state.nextSpawnIn)}</div>
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

    if (upcomingBosses.length === 0) {

        container.innerHTML = `
            <div class="empty-state">
                No upcoming bosses.
            </div>
        `;

        return;
    }

    let html = `
        <div class="boss-table">

            <div class="boss-head">

                <div>Boss</div>
                <div>World</div>
                <div>Map</div>
                <div>Spawn In</div>

            </div>
    `;

    upcomingBosses.forEach(boss => {

        html += `
            <div class="boss-row">

                <div>${boss.Boss}</div>

                <div>W${boss.World}</div>

                <div>${boss.Map}</div>

                <div class="countdown">
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

   const respawnMin =
    Number(boss["Respawn (Min)"]) || 1440;

    const respawnMs =
        respawnMin * 60000;

    let base = getBaseSpawn(boss, now);

    // If today's first spawn hasn't happened,
    // start from yesterday.
    if (base > now) {
        base.setDate(base.getDate() - 1);
    }

    const elapsed =
        now.getTime() - base.getTime();

    const cycles =
        Math.floor(elapsed / respawnMs);

    return new Date(
        base.getTime() + cycles * respawnMs
    );

}


function getNextSpawn(boss, spawn) {
    const respawnMin =
        Number(boss["Respawn (Min)"]) || 1440;

    return new Date(
        spawn.getTime() + respawnMin * 60000
    );
}

function getBossState(boss) {

    const now = new Date();

    const defeated = storageData[boss.ID];

    const spawn = getCurrentSpawn(boss, now);

    const nextSpawn = getNextSpawn(boss, spawn);

    const aliveUntil = new Date(
        spawn.getTime() +
        Number(boss["Alive Duration (Min)"]) * 60000
    );

    // Manual defeat
    if (
        defeated &&
        defeated.nextSpawn &&
        now < new Date(defeated.nextSpawn)
    ) {

        return {

            status: "DEFEATED",

            spawn,

            aliveUntil,

            nextSpawn: new Date(defeated.nextSpawn),

            timeLeft: 0,

           nextSpawnIn:
                new Date(defeated.nextSpawn).getTime() - now.getTime()

        };

    }

    // LIVE
    if (now >= spawn && now < aliveUntil) {

        return {

            status: "LIVE",

            spawn,

            aliveUntil,

            nextSpawn,

            timeLeft:
                aliveUntil - now,

            nextSpawnIn: 0

        };

    }

    // UPCOMING

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

            upcomingBosses.push(boss);
        
            break;

        }

    });

       // Recently Defeated (Newest First)
        const storage = storageData;
        
        defeatedBosses.sort((a,b)=>{
            const da = new Date(storage[a.ID]?.lastDefeated || 0);
            const db = new Date(storage[b.ID]?.lastDefeated || 0);
            return db - da;
        });
        
        // Upcoming & Live Soon (Nearest Spawn First)
        upcomingBosses.sort(
            (a,b)=>a.state.nextSpawnIn-b.state.nextSpawnIn
        );
        
        liveSoonBosses.sort(
            (a,b)=>a.state.nextSpawnIn-b.state.nextSpawnIn
        );

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
                      <div
                        class="favorite"
                        onclick="toggleFavorite(${boss.ID})">
                    
                        ${storageData[boss.ID]?.favorite ? "★" : "☆"}
                    </div>
                </div>
                `;
            }).join("")}
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
