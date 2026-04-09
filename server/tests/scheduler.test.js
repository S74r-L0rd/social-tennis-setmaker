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


// ===== BUG TESTS =====

// Bug Test 1: shuffle bias
// Run 1000 rounds and check if sit-out distribution is even
console.log("\n========================================");
console.log("BUG TESTS - Checking for known issues");
console.log("========================================");

(function testShuffleBias() {
  console.log("\n[Bug Test 1] Shuffle bias check");
  const counts = {1: 0, 2: 0, 3: 0, 4: 0};
  for (let i = 0; i < 1000; i++) {
    const players = [
      { id: 1, rating: 5, sitOutCount: 0 },
      { id: 2, rating: 5, sitOutCount: 0 },
      { id: 3, rating: 5, sitOutCount: 0 },
      { id: 4, rating: 5, sitOutCount: 0 },
    ];
    const result = generateRound(players, ["Court 1"], { partner: {}, opponent: {} });
    const firstPlayer = result.matches[0].teams[0][0].id;
    counts[firstPlayer]++;
  }
  console.log("First position frequency over 1000 rounds (expected ~250 each):", counts);
  const values = Object.values(counts);
  const max = Math.max(...values);
  const min = Math.min(...values);
  if (max - min > 100) {
    console.log("FAIL - Shuffle is biased, gap exceeds 100");
  } else {
    console.log("PASS - No significant bias detected");
  }
})();

// Bug Test 2: No error when player count is too low
(function testTooFewPlayers() {
  console.log("\n[Bug Test 2] Too few players - no warning check");
  const players = [
    { id: 1, rating: 5, sitOutCount: 0 },
    { id: 2, rating: 5, sitOutCount: 0 },
  ];
  const result = generateRound(players, ["Court 1"], { partner: {}, opponent: {} });
  if (result.matches.length === 0) {
    console.log("FAIL - Only 2 players provided, matches is empty but no error or warning was thrown");
  } else {
    console.log("PASS - Handled correctly");
  }
})();

// Bug Test 3: Sit-out fairness when all players have equal sitOutCount
(function testSitOutFairnessEqual() {
  console.log("\n[Bug Test 3] Sit-out fairness with equal sitOutCount");
  const players = [
    { id: 1, rating: 5, sitOutCount: 0 },
    { id: 2, rating: 5, sitOutCount: 0 },
    { id: 3, rating: 5, sitOutCount: 0 },
    { id: 4, rating: 5, sitOutCount: 0 },
    { id: 5, rating: 5, sitOutCount: 0 },
  ];
  const sitOutCounts = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0};
  for (let i = 0; i < 20; i++) {
    const result = generateRound(players, ["Court 1"], { partner: {}, opponent: {} });
    for (const p of result.sitOuts) {
      sitOutCounts[p.id]++;
    }
  }
  console.log("Sit-out count per player over 20 rounds (expected ~4 each):", sitOutCounts);
  const values = Object.values(sitOutCounts);
  const max = Math.max(...values);
  const min = Math.min(...values);
  if (max - min > 4) {
    console.log("FAIL - Sit-out distribution is unfair, gap exceeds 4");
  } else {
    console.log("PASS - Sit-out distribution is fair");
  }
})();

console.log("\n========================================");
console.log("BUG TESTS COMPLETE");
console.log("========================================\n");