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

