document.getElementById("btnLoad")?.remove();

loadBosses();

async function loadBosses(){

    const bosses = await getBosses();

    const tbody = document.querySelector("#bossTable tbody");

    tbody.innerHTML = "";

    document.getElementById("aliveCount").innerHTML =
        bosses.length + " Alive";

    bosses.forEach(boss=>{

        tbody.innerHTML += `

        <tr>

            <td>🟢</td>

            <td>${boss.Boss}</td>

            <td>World ${boss.World}</td>

            <td>${boss.Map}</td>

            <td>${boss.Layer}</td>

            <td>${boss["Spawn Time"]}</td>

            <td>--:--:--</td>

            <td>

                <button>Defeated</button>

            </td>

        </tr>

        `;

    });

}
