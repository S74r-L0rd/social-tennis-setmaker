// ============================================================
// 此檔案從 server/src/algorithm/scheduler.js 複製而來
// 僅將 CommonJS (module.exports) 改為 ES Module (export)
// 邏輯完全不變，方便後續組員切換到後端 API 時對照
// ============================================================

function shuffle(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function makePairKey(a, b) {
  return [a, b].sort((x, y) => x - y).join("-");
}

function scoreGrouping(group, history) {
  const [A, B, C, D] = group;
  const splits = [
    [[A, B], [C, D]],
    [[A, C], [B, D]],
    [[A, D], [B, C]],
  ];

  let best = null;

  for (const [team1, team2] of splits) {
    let score = 0;
    const team1Rating = team1[0].rating + team1[1].rating;
    const team2Rating = team2[0].rating + team2[1].rating;
    score -= Math.abs(team1Rating - team2Rating);

    for (const [p1, p2] of [team1, team2]) {
      const key = makePairKey(p1.id, p2.id);
      score -= (history.partner[key] || 0) * 5;
    }

    for (const p1 of team1) {
      for (const p2 of team2) {
        const key = makePairKey(p1.id, p2.id);
        score -= (history.opponent[key] || 0) * 2;
      }
    }

    if (!best || score > best.score || (score === best.score && Math.random() < 0.5)) {
      best = { score, teams: [team1, team2] };
    }
  }

  return best;
}

function validateGenerateRoundInput(players, courts, history) {
  if (!Array.isArray(players)) throw new Error("Invalid input: players must be an array.");
  if (!Array.isArray(courts)) throw new Error("Invalid input: courts must be an array.");
  if (!history || typeof history !== "object") throw new Error("Invalid input: history must be an object.");
  if (!history.partner || typeof history.partner !== "object") throw new Error("Invalid input: history.partner must be an object.");
  if (!history.opponent || typeof history.opponent !== "object") throw new Error("Invalid input: history.opponent must be an object.");
  if (courts.length === 0) throw new Error("Invalid input: at least one court is required.");
  if (players.length < 4) throw new Error("Invalid input: at least 4 players are required to form a doubles match.");

  for (const player of players) {
    if (typeof player.id !== "number") throw new Error("Invalid input: each player must have a numeric id.");
    if (typeof player.rating !== "number" || Number.isNaN(player.rating) || player.rating < 0)
      throw new Error(`Invalid input: player ${player.id} has an invalid rating.`);
    if (typeof player.sitOutCount !== "number" || Number.isNaN(player.sitOutCount) || player.sitOutCount < 0)
      throw new Error(`Invalid input: player ${player.id} has an invalid sitOutCount.`);
  }
}

export function generateRound(players, courts, history, config = {}) {
  validateGenerateRoundInput(players, courts, history);

  const maxPlayers = courts.length * 4;

  const sortedPlayers = [...players].sort((a, b) => {
    if (b.sitOutCount !== a.sitOutCount) return b.sitOutCount - a.sitOutCount;
    return Math.random() - 0.5;
  });

  const selectedPlayers = sortedPlayers.slice(0, maxPlayers);
  const sitOuts = sortedPlayers.slice(maxPlayers);
  const shuffledPlayers = shuffle(selectedPlayers);
  const groups = [];

  for (let i = 0; i < shuffledPlayers.length; i += 4) {
    const group = shuffledPlayers.slice(i, i + 4);
    if (group.length === 4) groups.push(group);
  }

  const matches = groups.map((group, index) => {
    const best = scoreGrouping(group, history);
    return { court: courts[index], teams: best.teams };
  });

  return { matches, sitOuts };
}

export function applyRoundResults(result, history) {
  for (const match of result.matches) {
    const [team1, team2] = match.teams;
    for (const team of [team1, team2]) {
      const key = makePairKey(team[0].id, team[1].id);
      history.partner[key] = (history.partner[key] || 0) + 1;
    }
    for (const p1 of team1) {
      for (const p2 of team2) {
        const key = makePairKey(p1.id, p2.id);
        history.opponent[key] = (history.opponent[key] || 0) + 1;
      }
    }
  }
  for (const player of result.sitOuts) {
    player.sitOutCount += 1;
  }
}
