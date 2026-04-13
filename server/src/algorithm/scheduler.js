/**
 * Randomly reorders the input array and returns a new shuffled copy.
 * This helps avoid producing the same groups repeatedly when players
 * have identical sit-out priority.
 *
 * @param {Array<any>} array - The array to shuffle.
 * @returns {Array<any>} A new shuffled array.
 */
function shuffle(array) {
  const shuffled = [...array];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

/**
 * Creates a consistent key for storing player-pair history.
 * The player IDs are sorted first so that:
 * makePairKey(2, 7) === makePairKey(7, 2)
 *
 * This is important for tracking partner and opponent relationships
 * without duplicating entries for reversed order.
 *
 * @param {number} a - First player ID.
 * @param {number} b - Second player ID.
 * @returns {string} A normalised string key for the pair.
 */
function makePairKey(a, b) {
  return [a, b].sort((x, y) => x - y).join("-");
}

/**
 * Evaluates all valid doubles splits for a group of 4 players
 * and returns the best-scoring arrangement.
 *
 * For four players A, B, C, D, there are exactly 3 possible ways
 * to form two doubles teams:
 * 1. AB vs CD
 * 2. AC vs BD
 * 3. AD vs BC
 *
 * Scoring criteria:
 * - Lower skill imbalance between teams is preferred
 * - Repeated partners are penalised more heavily
 * - Repeated opponents are penalised as well
 *
 * Higher score = better arrangement
 *
 * @param {Array<Object>} group - A group of exactly 4 player objects.
 * @param {number} group[].id - Unique player ID.
 * @param {number} group[].rating - Skill rating of the player.
 * @param {Object} history - Historical match relationship data.
 * @param {Object.<string, number>} history.partner - Map of partner pair frequencies.
 * @param {Object.<string, number>} history.opponent - Map of opponent pair frequencies.
 * @returns {{score: number, teams: Array<Array<Object>>}} Best split and its score.
 */
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

/**
 * Validates the scheduler input before round generation.
 *
 * @param {Array<Object>} players - Players available for the round.
 * @param {Array<string>} courts - Available courts.
 * @param {Object} history - Historical partner and opponent data.
 * @throws {Error} If any input is invalid.
 */
function validateGenerateRoundInput(players, courts, history) {
  if (!Array.isArray(players)) {
    throw new Error("Invalid input: players must be an array.");
  }

  if (!Array.isArray(courts)) {
    throw new Error("Invalid input: courts must be an array.");
  }

  if (!history || typeof history !== "object") {
    throw new Error("Invalid input: history must be an object.");
  }

  if (!history.partner || typeof history.partner !== "object") {
    throw new Error("Invalid input: history.partner must be an object.");
  }

  if (!history.opponent || typeof history.opponent !== "object") {
    throw new Error("Invalid input: history.opponent must be an object.");
  }

  if (courts.length === 0) {
    throw new Error("Invalid input: at least one court is required.");
  }

  if (players.length < 4) {
    throw new Error("Invalid input: at least 4 players are required to form a doubles match.");
  }

  for (const player of players) {
    if (typeof player.id !== "number") {
      throw new Error("Invalid input: each player must have a numeric id.");
    }

    if (typeof player.rating !== "number" || Number.isNaN(player.rating) || player.rating < 0) {
      throw new Error(`Invalid input: player ${player.id} has an invalid rating.`);
    }

    if (
      typeof player.sitOutCount !== "number" ||
      Number.isNaN(player.sitOutCount) ||
      player.sitOutCount < 0
    ) {
      throw new Error(`Invalid input: player ${player.id} has an invalid sitOutCount.`);
    }
  }
}

/**
 * Generates one round of doubles matches for the available courts.
 *
 * Workflow:
 * 1. Determine maximum player capacity from court count
 * 2. Sort players by sit-out count to prioritise fairness
 * 3. Select the players who can play this round
 * 4. Mark the remaining players as sit-outs
 * 5. Shuffle selected players to reduce deterministic grouping
 * 6. Divide selected players into groups of 4
 * 7. For each group, choose the best team split
 * 8. Assign each match to a court
 *
 * Notes:
 * - This function assumes one doubles match per court
 * - Each court requires exactly 4 players
 * - The config parameter is reserved for future enhancements
 *
 * @param {Array<Object>} players - List of players available for this round.
 * @param {number} players[].id - Unique player ID.
 * @param {number} players[].rating - Skill rating of the player.
 * @param {number} players[].sitOutCount - Number of previous sit-outs.
 * @param {Array<string>} courts - List of available court names or IDs.
 * @param {Object} history - Historical partner and opponent frequency data.
 * @param {Object.<string, number>} history.partner - Map of partner pair frequencies.
 * @param {Object.<string, number>} history.opponent - Map of opponent pair frequencies.
 * @param {Object} [config={}] - Optional scheduler configuration.
 * @returns {{
 *   matches: Array<{
 *     court: string,
 *     teams: Array<Array<Object>>
 *   }>,
 *   sitOuts: Array<Object>
 * }} Generated round result.
 */
function generateRound(players, courts, history, config = {}) {
  validateGenerateRoundInput(players, courts, history);

  // Maximum number of players that can be scheduled this round.
  // Each court supports exactly one doubles match = 4 players.
  const maxPlayers = courts.length * 4;

  // Players with fewer sit-outs are lower priority to play this round.
  // Players who have already sat out more often should be given preference.
  // Sort players so that those who have sat out more often are prioritised to play this round.
  const sortedPlayers = [...players].sort(
    (a, b) => b.sitOutCount - a.sitOutCount
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

/**
 * Applies the results of a generated round to the history object.
 *
 * This updates:
 * - partner frequencies for players on the same team
 * - opponent frequencies for players on opposite teams
 * - sit-out counts for players who did not play
 *
 * This updated history should be persisted after each round so that
 * future scheduling decisions can account for earlier matches.
 *
 * @param {{
 *   matches: Array<{
 *     court: string,
 *     teams: Array<Array<Object>>
 *   }>,
 *   sitOuts: Array<Object>
 * }} result - The generated round result.
 * @param {Object} history - Historical partner and opponent frequency data.
 * @param {Object.<string, number>} history.partner - Map of partner pair frequencies.
 * @param {Object.<string, number>} history.opponent - Map of opponent pair frequencies.
 * @returns {void}
 */
function applyRoundResults(result, history) {
  for (const match of result.matches) {
    const [team1, team2] = match.teams;

    // Record partner relationships for both teams.
    for (const team of [team1, team2]) {
      const key = makePairKey(team[0].id, team[1].id);
      history.partner[key] = (history.partner[key] || 0) + 1;
    }

    // Record opponent relationships across both teams.
    for (const p1 of team1) {
      for (const p2 of team2) {
        const key = makePairKey(p1.id, p2.id);
        history.opponent[key] = (history.opponent[key] || 0) + 1;
      }
    }
  }

  // Increase sit-out count for all players who did not get a match this round.
  for (const player of result.sitOuts) {
    player.sitOutCount += 1;
  }
}

// Export public functions for use in tests or such folders
module.exports = {
  generateRound,
  applyRoundResults,
};