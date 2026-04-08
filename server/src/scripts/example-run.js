const {
  generateRound,
  applyRoundResults,
} = require("../algorithm/scheduler");

const players = [
  { id: 1, rating: 7, sitOutCount: 0 },
  { id: 2, rating: 6, sitOutCount: 0 },
  { id: 3, rating: 5, sitOutCount: 0 },
  { id: 4, rating: 7, sitOutCount: 0 },
  { id: 5, rating: 6, sitOutCount: 0 },
  { id: 6, rating: 5, sitOutCount: 0 },
  { id: 7, rating: 6, sitOutCount: 0 },
  { id: 8, rating: 5, sitOutCount: 0 },
  { id: 9, rating: 6, sitOutCount: 0 }
];

const courts = ["Court 12", "Court 13"];

const history = {
  partner: {},
  opponent: {},
};

const result = generateRound(players, courts, history);

console.log("=== GENERATED MATCHES ===");

for (const match of result.matches) {
  console.log(`\n${match.court}`);

  console.log(
    `Team 1: Player ${match.teams[0][0].id} + Player ${match.teams[0][1].id}`
  );

  console.log(
    `Team 2: Player ${match.teams[1][0].id} + Player ${match.teams[1][1].id}`
  );
}

console.log("\n=== SIT OUTS ===");
console.log(result.sitOuts.map((p) => `Player ${p.id}`));

applyRoundResults(result, history);

console.log("\n=== UPDATED HISTORY ===");
console.log(history);