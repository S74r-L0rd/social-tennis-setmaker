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