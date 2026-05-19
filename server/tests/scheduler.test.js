const assert = require("assert");
const {
  generateRound,
  applyRoundResults,
} = require("../src/algorithm/scheduler");

/**
 * Creates a list of mock players for testing.
 * Ratings are assigned in a repeating pattern: 5, 6, 7.
 * All players start with a sitOutCount of 0 unless modified in a test.
 *
 * @param {number} n - Number of players to generate.
 * @returns {Array<Object>} Array of player objects.
 */
function createPlayers(n) {
  return Array.from({ length: n }, (_, i) => ({
    id: i + 1,
    rating: 5 + (i % 3),
    sitOutCount: 0,
  }));
}

/**
 * Creates a fresh empty history object for testing.
 * This ensures each test starts with no previous partner or opponent history.
 *
 * @returns {{partner: Object.<string, number>, opponent: Object.<string, number>}}
 */
function emptyHistory() {
  return { partner: {}, opponent: {} };
}

/**
 * Test 1:
 * Verifies that the scheduler generates the correct number of matches
 * when the number of players exactly fits the available courts.
 *
 * Scenario:
 * - 8 players
 * - 2 courts
 * - Each court supports 1 doubles match (4 players)
 *
 * Expected:
 * - 2 matches should be generated
 */
(function testBasicGeneration() {
  const players = createPlayers(8);
  const courts = ["Court 1", "Court 2"];
  const history = emptyHistory();

  const result = generateRound(players, courts, history);

  assert.strictEqual(result.matches.length, 2);
  console.log("Test 1 passed: basic generation");
})();

/**
 * Test 2:
 * Verifies sit-out fairness behaviour.
 *
 * Scenario:
 * - 10 players
 * - 2 courts, so only 8 players can play
 * - Player 1 is given a higher sitOutCount than the others
 *
 * Expected:
 * - Player 1 should not be selected as a sit-out,
 *   because the scheduler prioritises players who have already
 *   missed more rounds.
 */
(function testSitOutFairness() {
  const players = createPlayers(10);
  players[0].sitOutCount = 3;

  const courts = ["Court 1", "Court 2"];
  const history = emptyHistory();

  const result = generateRound(players, courts, history);
  const sitOutIds = result.sitOuts.map((p) => p.id);

  assert(!sitOutIds.includes(players[0].id));
  console.log("Test 2 passed: sit-out fairness");
})();

/**
 * Test 3:
 * Verifies that the scheduler respects court capacity.
 *
 * Scenario:
 * - 20 players available
 * - Only 3 courts available
 * - 3 courts allow a maximum of 12 scheduled players
 *
 * Expected:
 * - No more than 3 matches should be generated
 */
(function testCourtCapacity() {
  const players = createPlayers(20);
  const courts = ["Court 1", "Court 2", "Court 3"];
  const history = emptyHistory();

  const result = generateRound(players, courts, history);

  assert(result.matches.length <= 3);
  console.log("Test 3 passed: respects court capacity");
})();

/**
 * Test 4:
 * Verifies that match history is updated after a round is applied.
 *
 * Scenario:
 * - Generate a valid round
 * - Apply the results using applyRoundResults()
 *
 * Expected:
 * - Partner history should contain entries
 * - Opponent history should contain entries
 */
(function testHistoryTracking() {
  const players = createPlayers(8);
  const courts = ["Court 1", "Court 2"];
  const history = emptyHistory();

  const result = generateRound(players, courts, history);
  applyRoundResults(result, history);

  assert(Object.keys(history.partner).length > 0);
  assert(Object.keys(history.opponent).length > 0);
  console.log("Test 4 passed: history tracking");
})();

/**
 * Test 5:
 * Verifies that the scheduler avoids repeated partner pairings
 * when there is already strong history against a specific pair.
 *
 * Scenario:
 * - Penalise players 1 and 2 heavily in partner history
 *
 * Expected:
 * - Players 1 and 2 should not appear on the same team
 *   in the generated matches.
 */
(function testAvoidRepeatedPartners() {
  const players = createPlayers(8);
  const courts = ["Court 1", "Court 2"];
  const history = emptyHistory();

  // Simulate a strong repetition penalty for pairing players 1 and 2 together
  history.partner["1-2"] = 5;

  const result = generateRound(players, courts, history);

  let repeated = false;

  for (const match of result.matches) {
    for (const team of match.teams) {
      const ids = [team[0].id, team[1].id].sort((a, b) => a - b);
      if (ids[0] === 1 && ids[1] === 2) {
        repeated = true;
      }
    }
  }

  assert(!repeated);
  console.log("Test 5 passed: avoids repeated partners");
})();

/**
 * Test 6:
 * Verifies that the scheduler avoids repeated opponent pairings
 * when there is already strong history against a specific matchup.
 *
 * Scenario:
 * - 4 players are available for 1 court
 * - Opponent history heavily penalises:
 *   - 1 vs 3
 *   - 1 vs 4
 *   - 2 vs 3
 *   - 2 vs 4
 * - This makes the arrangement [1,2] vs [3,4] undesirable
 *
 * Expected:
 * - The generated match should avoid placing players 1 and 2
 *   against players 3 and 4 in the same match split.
 */
(function testAvoidRepeatedOpponents() {
  const players = [
    { id: 1, rating: 6, sitOutCount: 0 },
    { id: 2, rating: 6, sitOutCount: 0 },
    { id: 3, rating: 6, sitOutCount: 0 },
    { id: 4, rating: 6, sitOutCount: 0 },
  ];

  const courts = ["Court 1"];
  const history = emptyHistory();

  // Penalise 1 vs 3, 1 vs 4, 2 vs 3, 2 vs 4 so that AB vs CD becomes unattractive
  history.opponent["1-3"] = 10;
  history.opponent["1-4"] = 10;
  history.opponent["2-3"] = 10;
  history.opponent["2-4"] = 10;

  const result = generateRound(players, courts, history);
  const match = result.matches[0];

  const teams = match.teams.map((team) =>
    team.map((p) => p.id).sort((a, b) => a - b)
  );

  const hasABvsCD =
    teams.some((team) => team[0] === 1 && team[1] === 2) &&
    teams.some((team) => team[0] === 3 && team[1] === 4);

  assert(!hasABvsCD);
  console.log("Test 6 passed: avoids repeated opponents");
})();

/**
 * Test 7:
 * Verifies that the scheduler rejects scheduling when no courts are available.
 *
 * Scenario:
 * - 8 players are available
 * - The courts array is empty
 *
 * Expected:
 * - The scheduler should throw an error indicating that
 *   at least one court is required.
 */
(function testZeroCourtsValidation() {
  const players = createPlayers(8);
  const courts = [];
  const history = emptyHistory();

  assert.throws(
    () => generateRound(players, courts, history),
    /at least one court is required/
  );

  console.log("Test 7 passed: rejects zero courts");
})();

/**
 * Test 8:
 * Verifies that the scheduler rejects scheduling when there are
 * not enough players to form a valid doubles match.
 *
 * Scenario:
 * - Only 3 players are available
 * - 1 court is available
 *
 * Expected:
 * - The scheduler should throw an error indicating that
 *   at least 4 players are required.
 */
(function testInsufficientPlayersValidation() {
  const players = createPlayers(3);
  const courts = ["Court 1"];
  const history = emptyHistory();

  assert.throws(
    () => generateRound(players, courts, history),
    /at least 4 players are required/
  );

  console.log("Test 8 passed: rejects insufficient players");
})();

/**
 * Test 9:
 * Verifies that the scheduler rejects non-numeric player ratings.
 *
 * Scenario:
 * - 8 players are available
 * - One player is assigned an invalid rating value of "abc"
 * - 2 courts are available
 *
 * Expected:
 * - The scheduler should throw an error indicating that
 *   the player rating is invalid.
 */
(function testInvalidRatingValidation() {
  const players = createPlayers(8);
  players[0].rating = "abc";

  const courts = ["Court 1", "Court 2"];
  const history = emptyHistory();

  assert.throws(
    () => generateRound(players, courts, history),
    /invalid rating/
  );

  console.log("Test 9 passed: rejects invalid rating");
})();

/**
 * Test 10:
 * Verifies that the scheduler rejects negative player ratings.
 *
 * Scenario:
 * - 8 players are available
 * - One player is assigned a negative rating value of -999
 * - 2 courts are available
 *
 * Expected:
 * - The scheduler should throw an error indicating that
 *   the player rating is invalid.
 */
(function testNegativeRatingValidation() {
  const players = createPlayers(8);
  players[0].rating = -999;

  const courts = ["Court 1", "Court 2"];
  const history = emptyHistory();

  assert.throws(
    () => generateRound(players, courts, history),
    /invalid rating/
  );

  console.log("Test 10 passed: rejects negative rating");
})();

/**
 * Test 11:
 * Verifies that the scheduler correctly handles a scenario where
 * 5 players have equal sit-out counts.
 *
 * Scenario:
 * - 5 players are available
 * - All players have the same sitOutCount
 * - Only 1 court is available (maximum 4 players can play)
 *
 * Expected:
 * - Exactly 1 match should be generated
 * - Exactly 1 player should sit out
 * - Exactly 4 unique players should be selected to play
 * - The sit-out player should not appear in the selected match
 */
(function testFivePlayersEqualSitOutCounts() {
  const players = [
    { id: 1, rating: 6, sitOutCount: 0 },
    { id: 2, rating: 6, sitOutCount: 0 },
    { id: 3, rating: 6, sitOutCount: 0 },
    { id: 4, rating: 6, sitOutCount: 0 },
    { id: 5, rating: 6, sitOutCount: 0 },
  ];

  const courts = ["Court 1"];
  const history = emptyHistory();

  const result = generateRound(players, courts, history);

  // One match should be generated
  assert.strictEqual(result.matches.length, 1);

  // Exactly one player should sit out
  assert.strictEqual(result.sitOuts.length, 1);

  // Extract selected player IDs
  const selectedIds = result.matches[0].teams.flat().map((p) => p.id);

  // Ensure 4 unique players are selected
  assert.strictEqual(new Set(selectedIds).size, 4);

  // Ensure sit-out player is not in selected players
  const sitOutId = result.sitOuts[0].id;
  assert(!selectedIds.includes(sitOutId));

  console.log("Test 11 passed: handles 5 tied players with one fair sit-out");
})();

/**
 * Test 12:
 * Verifies that when multiple players have equal sit-out counts,
 * the scheduler does not always exclude the same player across runs.
 *
 * Scenario:
 * - 5 players are available
 * - All players have the same sitOutCount
 * - Only 1 court is available
 * - The scheduler is executed multiple times
 *
 * Expected:
 * - More than one distinct player should appear as the sit-out
 *   across repeated runs, indicating that tie-breaking is not deterministic
 */
(function testEqualSitOutCountsDoNotAlwaysExcludeSamePlayer() {
  const courts = ["Court 1"];
  const history = emptyHistory();

  const sitOutIds = new Set();

  for (let i = 0; i < 20; i++) {
    const players = [
      { id: 1, rating: 6, sitOutCount: 0 },
      { id: 2, rating: 6, sitOutCount: 0 },
      { id: 3, rating: 6, sitOutCount: 0 },
      { id: 4, rating: 6, sitOutCount: 0 },
      { id: 5, rating: 6, sitOutCount: 0 },
    ];

    const result = generateRound(players, courts, history);
    sitOutIds.add(result.sitOuts[0].id);
  }

  // Ensure that more than one player has been selected as sit-out
  assert(sitOutIds.size > 1);

  console.log("Test 12 passed: tied sit-out counts do not always exclude the same player");
})();