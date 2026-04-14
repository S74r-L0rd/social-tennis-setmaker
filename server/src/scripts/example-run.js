/**
 * Example script to manually test the scheduling algorithm.
 *
 * This script:
 * 1. Defines a sample set of players and courts
 * 2. Generates a round using the scheduler
 * 3. Prints match assignments and sit-outs
 * 4. Applies results to update history
 * 5. Prints updated history for verification
 *
 * This is useful for quick manual validation without running formal tests.
 */

const {
  generateRound,
  applyRoundResults,
} = require("../algorithm/scheduler");

// Sample player dataset
// Each player has: id, rating (skill level), and sitOutCount
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

// Available courts for this round
// Each court supports one doubles match (4 players)
const courts = ["Court 12", "Court 13"];

// History object to track:
// - partner frequency
// - opponent frequency
const history = {
  partner: {},
  opponent: {},
};

// Generate a round based on players, courts, and history
const result = generateRound(players, courts, history);

// Print generated matches
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

// Print players who are sitting out
console.log("\n=== SIT OUTS ===");
console.log(result.sitOuts.map((p) => `Player ${p.id}`));

// Apply results to update history (partners, opponents, sit-outs)
applyRoundResults(result, history);

// Print updated history for verification
console.log("\n=== UPDATED HISTORY ===");
console.log(history);