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

