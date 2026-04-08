const assert = require("assert");
const {
  generateRound,
  applyRoundResults,
} = require("../src/algorithm/scheduler");

function createPlayers(n) {
  return Array.from({ length: n }, (_, i) => ({
    id: i + 1,
    rating: 5 + (i % 3),
    sitOutCount: 0,
  }));
}

function emptyHistory() {
  return { partner: {}, opponent: {} };
}

(function testBasicGeneration() {
  const players = createPlayers(8);
  const courts = ["Court 1", "Court 2"];
  const history = emptyHistory();

  const result = generateRound(players, courts, history);

  assert.strictEqual(result.matches.length, 2);
  console.log("Test 1 passed: basic generation");
})();

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

(function testCourtCapacity() {
  const players = createPlayers(20);
  const courts = ["Court 1", "Court 2", "Court 3"];
  const history = emptyHistory();

  const result = generateRound(players, courts, history);

  assert(result.matches.length <= 3);
  console.log("Test 3 passed: respects court capacity");
})();

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