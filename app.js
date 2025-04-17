const API_URL = "https://exfkspebx5gu3p2eoj6ennnz44.appsync-api.us-east-1.amazonaws.com/graphql";
const API_KEY = "da2-cpdeahpctjh2ramkcu3l6ouqwq";
const REALTIME_URL = "wss://exfkspebx5gu3p2eoj6ennnz44.appsync-realtime-api.us-east-1.amazonaws.com/graphql"; // WebSocket URL

let chartInstances = {}; 

async function fetchScores() {
    const query = `
        query ListMatches {
            listMatches {
                matchID
                teamA
                teamB
                scoreA
                scoreB
                updatedAt
            }
        }
    `;

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": API_KEY
            },
            body: JSON.stringify({ query })
        });

        const data = await response.json();
        displayCharts(data.data.listMatches);
    } catch (error) {
        console.error("Error fetching scores:", error);
    }
}

function displayCharts(matches) {
    const scoresDiv = document.getElementById("scores");
    scoresDiv.innerHTML = "<h2>Scores</h2>";
    
    matches.forEach(match => {
        let canvasId = `chart-${match.matchID}`;
        if (!document.getElementById(canvasId)) {
            let matchContainer = document.createElement("div");
            matchContainer.innerHTML = `
                <h3>${match.teamA} vs ${match.teamB}</h3>
                <canvas id="${canvasId}" width="300" height="300"></canvas>
            `;
            scoresDiv.appendChild(matchContainer);
        }
        
        createOrUpdateChart(canvasId, match);
    });
}

function createOrUpdateChart(canvasId, match) {
    let ctx = document.getElementById(canvasId).getContext("2d");
    
    if (chartInstances[canvasId]) {
        
        chartInstances[canvasId].data.datasets[0].data = [match.scoreA, match.scoreB];
        chartInstances[canvasId].update();
    } else {
        
        chartInstances[canvasId] = new Chart(ctx, {
            type: "pie",
            data: {
                labels: [match.teamA, match.teamB],
                datasets: [{
                    data: [match.scoreA, match.scoreB],
                    backgroundColor: ["#36A2EB", "#FF6384"]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: "bottom" }
                }
            }
        });
    }
}

function subscribeToScoreUpdates() {
    const subscriptionQuery = `
        subscription OnScoreUpdate {
            onScoreUpdate {
                matchID
                teamA
                teamB
                scoreA
                scoreB
                updatedAt
            }
        }
    `;

    const ws = new WebSocket(REALTIME_URL, "graphql-ws");

    ws.onopen = () => {
        console.log("WebSocket connected for real-time updates");
        ws.send(JSON.stringify({ type: "connection_init", payload: {} }));
        setTimeout(() => {
            ws.send(JSON.stringify({ id: "1", type: "start", payload: { query: subscriptionQuery } }));
        }, 500);
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "data") {
            console.log("Real-time update received:", data.payload.data.onScoreUpdate);
            displayCharts([data.payload.data.onScoreUpdate]);
        }
    };
}

fetchScores();
subscribeToScoreUpdates();