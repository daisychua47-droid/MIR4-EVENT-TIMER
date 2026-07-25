document.getElementById("btnLoad")?.remove();

let bosses = [];
let liveBosses = [];
let liveSoonBosses = [];
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

            const storage = loadStorage();
            
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

function getBossState(boss) {
    const now = new Date();
    const storage = loadStorage();
    const defeated = storage[boss.ID];
    const parts = String(boss["Spawn Time"]).split(":");
    
    const hour = Number(parts[0]);
    const minute = Number(parts[1]);

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


    // Boss was manually/automatically defeated
    if (
        defeated &&
        defeated.nextSpawn &&
        now < new Date(defeated.nextSpawn)
    ) {
    
        return {
            status: "DEFEATED",
            color: "gray",
            spawn,
            aliveUntil,
            nextSpawn: new Date(defeated.nextSpawn),
            timeLeft: 0,
            nextSpawnIn:
                new Date(defeated.nextSpawn) - now
        };
    
    }
    
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
    renderBosses();
    setInterval(updateCountdowns, 1000);
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

                if(boss.state.nextSpawnIn <= 3600000){
                    liveSoonBosses.push(boss);
                }else{
                    upcomingBosses.push(boss);
                }

                break;

        }

    });

       // Recently Defeated (Newest First)
        const storage = loadStorage();
        
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
