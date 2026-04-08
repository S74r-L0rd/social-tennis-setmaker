function shuffle(array) {
  return [...array].sort(() => Math.random() - 0.5);
}

function makePairKey(a, b) {
  return [a, b].sort((x, y) => x - y).join("-");
}

function scoreGrouping(group, history) {
  const [A, B, C, D] = group;

  // All possible splits of 4 players into 2 doubles teams
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

    // Penalise skill imbalance. Smaller difference is better.
    score -= Math.abs(team1Rating - team2Rating);

    // Penalise repeated partner combinations.
    // This has more weightage because partner variety is important in social tennis.
    for (const [p1, p2] of [team1, team2]) {
      const key = makePairKey(p1.id, p2.id);
      score -= (history.partner[key] || 0) * 5;
    }

    // Penalise repeated opponent combinations.
    // This still matters, but has less weightage than partner repetition.
    for (const p1 of team1) {
      for (const p2 of team2) {
        const key = makePairKey(p1.id, p2.id);
        score -= (history.opponent[key] || 0) * 2;
      }
    }

    // For keeping the arrangement with the highest score.
    if (!best || score > best.score) {
      best = { score, teams: [team1, team2] };
    }
  }

  return best;
}

function generateRound(players, courts, history, config = {}) {
  // Maximum number of players that can be scheduled this round.
  // Each court supports exactly one doubles match = 4 players.
  const maxPlayers = courts.length * 4;

  // Players with fewer sit-outs are lower priority to play this round.
  // Players who have already sat out more often should be given preference.
  const sortedPlayers = [...players].sort(
    (a, b) => a.sitOutCount - b.sitOutCount
  );

  // Players within capacity are selected to play this round.
  const selectedPlayers = sortedPlayers.slice(0, maxPlayers);

  // Any remaining players must sit out.
  const sitOuts = sortedPlayers.slice(maxPlayers);

  // Shuffle selected players before grouping so that the same order
  // does not always generate the same match blocks.
  const shuffledPlayers = shuffle(selectedPlayers);
  const groups = [];

  // Create groups of exactly 4 players.
  for (let i = 0; i < shuffledPlayers.length; i += 4) {
    const group = shuffledPlayers.slice(i, i + 4);
    if (group.length === 4) {
      groups.push(group);
    }
  }

  // For each group, find the best doubles split and assign a court.
  const matches = groups.map((group, index) => {
    const best = scoreGrouping(group, history);

    return {
      court: courts[index],
      teams: best.teams,
    };
  });

  return {
    matches,
    sitOuts,
  };
}