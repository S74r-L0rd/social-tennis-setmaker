/**
 * API integration tests for database-backed routes.
 * Requires the server to be running on localhost:5001.
 * Run with: node tests/api.test.js
 */

const BASE = "http://localhost:5001";
const TEST_EMAIL = `integration.${Date.now()}@setmaker.test`;
const TEST_PASSWORD = "Test@12345";

let passed = 0;
let failed = 0;
let token = "";
let sessionId = null;
let playerId = null;
let sessionPlayerId = null;
let roundId = null;
const createdPlayerIds = [];

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function req(method, path, body, authToken) {
  const headers = { "Content-Type": "application/json" };
  if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, data: await res.json() };
}

function assert(condition, message) {
  if (condition) {
    console.log(`    ✓ ${message}`);
    passed++;
  } else {
    console.error(`    ✗ ${message}`);
    failed++;
  }
}

async function test(name, fn) {
  process.stdout.write(`  ${name}\n`);
  try {
    await fn();
  } catch (err) {
    console.error(`    ✗ Unexpected error: ${err.message}`);
    failed++;
  }
}

function section(name) {
  console.log(`\n${name}`);
  console.log("─".repeat(50));
}

// ─── Test suites ─────────────────────────────────────────────────────────────

async function testAuth() {
  section("Auth routes");

  await test("POST /api/auth/register creates user and returns token", async () => {
    const { status, data } = await req("POST", "/api/auth/register", {
      name: "Integration Tester",
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });
    assert(status === 201, `status 201 (got ${status})`);
    assert(data.success === true, "success is true");
    assert(typeof data.data?.token === "string", "token returned");
    assert(data.data?.user?.email === TEST_EMAIL, "email matches");
    token = data.data.token;
  });

  await test("POST /api/auth/login returns token for valid credentials", async () => {
    const { status, data } = await req("POST", "/api/auth/login", {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });
    assert(status === 200, `status 200 (got ${status})`);
    assert(data.success === true, "success is true");
    assert(typeof data.data?.token === "string", "token returned");
    token = data.data.token;
  });

  await test("POST /api/auth/login rejects wrong password with 401", async () => {
    const { status, data } = await req("POST", "/api/auth/login", {
      email: TEST_EMAIL,
      password: "wrongpassword",
    });
    assert(status === 401, `status 401 (got ${status})`);
    assert(data.success === false, "success is false");
  });

  await test("POST /api/auth/register rejects duplicate email with 409", async () => {
    const { status, data } = await req("POST", "/api/auth/register", {
      name: "Duplicate",
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });
    assert(status === 409, `status 409 (got ${status})`);
    assert(data.success === false, "success is false");
  });

  await test("GET /api/auth/me returns logged-in user", async () => {
    const { status, data } = await req("GET", "/api/auth/me", undefined, token);
    assert(status === 200, `status 200 (got ${status})`);
    assert(data.data?.email === TEST_EMAIL, "email matches");
  });
}

async function testSessions() {
  section("Session routes");

  await test("POST /api/sessions creates session in DB", async () => {
    const { status, data } = await req("POST", "/api/sessions", {
      name: "Integration Test Session",
      courtCount: 2,
      gameMode: "flexible",
    }, token);
    assert(status === 201, `status 201 (got ${status})`);
    assert(data.success === true, "success is true");
    assert(data.data?.name === "Integration Test Session", "name matches");
    assert(data.data?.status === "DRAFT", "status is DRAFT");
    assert(typeof data.data?.id === "number", "id is a number");
    sessionId = data.data.id;
  });

  await test("GET /api/sessions lists sessions (public)", async () => {
    const { status, data } = await req("GET", "/api/sessions");
    assert(status === 200, `status 200 (got ${status})`);
    assert(Array.isArray(data.data), "data is an array");
    assert(data.data.some(s => s.id === sessionId), "created session appears in list");
  });

  await test("GET /api/sessions/:id returns correct session", async () => {
    const { status, data } = await req("GET", `/api/sessions/${sessionId}`);
    assert(status === 200, `status 200 (got ${status})`);
    assert(data.data?.id === sessionId, "id matches");
    assert(data.data?.name === "Integration Test Session", "name matches");
  });

  await test("PUT /api/sessions/:id updates only whitelisted fields", async () => {
    const { status, data } = await req("PUT", `/api/sessions/${sessionId}`, {
      name: "Updated Session Name",
      courtCount: 3,
      status: "DRAFT",
    }, token);
    assert(status === 200, `status 200 (got ${status})`);
    assert(data.data?.name === "Updated Session Name", "name updated");
    assert(data.data?.courtCount === 3, "courtCount updated");
  });

  await test("POST /api/sessions requires auth token", async () => {
    const { status } = await req("POST", "/api/sessions", { name: "No auth" });
    assert(status === 401, `status 401 (got ${status})`);
  });

  await test("POST /api/sessions/:id/activate moves DRAFT to ACTIVE", async () => {
    const { status, data } = await req("POST", `/api/sessions/${sessionId}/activate`, undefined, token);
    assert(status === 200, `status 200 (got ${status})`);
    assert(data.data?.status === "ACTIVE", "status is ACTIVE");
  });

  await test("POST /api/sessions/:id/activate rejects already-ACTIVE session", async () => {
    const { status, data } = await req("POST", `/api/sessions/${sessionId}/activate`, undefined, token);
    assert(status === 400, `status 400 (got ${status})`);
    assert(data.success === false, "success is false");
  });
}

async function testPlayers() {
  section("Player routes");

  await test("POST /api/players creates player in DB", async () => {
    const { status, data } = await req("POST", "/api/players", {
      name: "Integration Player",
      gender: "M",
      rating: 7,
    }, token);
    assert(status === 201, `status 201 (got ${status})`);
    assert(data.data?.name === "Integration Player", "name matches");
    assert(data.data?.rating === 7, "rating matches");
    playerId = data.data.id;
    createdPlayerIds.push(playerId);
  });

  await test("GET /api/players lists players (public)", async () => {
    const { status, data } = await req("GET", "/api/players");
    assert(status === 200, `status 200 (got ${status})`);
    assert(data.data.some(p => p.id === playerId), "created player appears in list");
  });

  await test("GET /api/players/:id returns correct player", async () => {
    const { status, data } = await req("GET", `/api/players/${playerId}`);
    assert(status === 200, `status 200 (got ${status})`);
    assert(data.data?.id === playerId, "id matches");
  });

  await test("PUT /api/players/:id updates only whitelisted fields", async () => {
    const { status, data } = await req("PUT", `/api/players/${playerId}`, {
      rating: 8,
      passwordHash: "should-be-ignored",
      createdAt: "2000-01-01",
    }, token);
    assert(status === 200, `status 200 (got ${status})`);
    assert(data.data?.rating === 8, "rating updated to 8");
    assert(data.data?.passwordHash === undefined, "passwordHash not exposed in response");
  });

  await test("PUT /api/players/:id requires auth token", async () => {
    const { status } = await req("PUT", `/api/players/${playerId}`, { rating: 5 });
    assert(status === 401, `status 401 (got ${status})`);
  });

  await test("GET /api/players/:id returns 404 for unknown id", async () => {
    const { status } = await req("GET", "/api/players/999999999");
    assert(status === 404, `status 404 (got ${status})`);
  });
}

async function testSessionPlayers() {
  section("Session-player routes");

  await test("POST /api/session-players adds player to session in DB", async () => {
    const { status, data } = await req("POST", "/api/session-players", {
      sessionId,
      playerId,
    }, token);
    assert(status === 201, `status 201 (got ${status})`);
    assert(data.data?.playerId === playerId, "playerId matches");
    assert(data.data?.sessionId === sessionId, "sessionId matches");
    assert(data.data?.status === "ACTIVE", "default status is ACTIVE");
    sessionPlayerId = data.data.id;
  });

  await test("GET /api/session-players/:sessionId lists players for session", async () => {
    const { status, data } = await req("GET", `/api/session-players/${sessionId}`, undefined, token);
    assert(status === 200, `status 200 (got ${status})`);
    assert(data.data.some(sp => sp.id === sessionPlayerId), "session player in list");
  });

  await test("POST /api/session-players rejects duplicate player+session", async () => {
    const { status, data } = await req("POST", "/api/session-players", {
      sessionId,
      playerId,
    }, token);
    assert(status === 409, `status 409 (got ${status})`);
    assert(data.success === false, "success is false");
  });

  await test("PUT /api/session-players/:id updates player status", async () => {
    const { status, data } = await req("PUT", `/api/session-players/${sessionPlayerId}`, {
      status: "RESTING",
    }, token);
    assert(status === 200, `status 200 (got ${status})`);
    assert(data.data?.status === "RESTING", "status updated to RESTING");
  });
}

async function testRounds() {
  section("Round routes");

  // Add enough active players for round generation (need 4+)
  await req("PUT", `/api/session-players/${sessionPlayerId}`, { status: "ACTIVE" }, token);

  for (let i = 1; i <= 7; i++) {
    const { data } = await req("POST", "/api/players", {
      name: `RoundPlayer${i}`,
      gender: i % 2 === 0 ? "F" : "M",
      rating: 5 + i,
    }, token);
    createdPlayerIds.push(data.data.id);
    await req("POST", "/api/session-players", { sessionId, playerId: data.data.id }, token);
  }

  await test("POST /api/rounds/generate persists round and matches to DB", async () => {
    const { status, data } = await req("POST", "/api/rounds/generate", { sessionId }, token);
    assert(status === 201, `status 201 (got ${status})`);
    assert(data.data?.roundNumber === 1, "roundNumber is 1");
    assert(Array.isArray(data.data?.matches), "matches is array");
    assert(data.data?.matches.length > 0, "at least 1 match generated");
    assert(data.data?.matches[0]?.assignments?.length === 4, "4 assignments per match");
    roundId = data.data.id;
  });

  await test("GET /api/rounds/session/:sessionId returns persisted rounds", async () => {
    const { status, data } = await req("GET", `/api/rounds/session/${sessionId}`, undefined, token);
    assert(status === 200, `status 200 (got ${status})`);
    assert(data.data?.length === 1, "1 round in DB");
    assert(data.data[0]?.roundNumber === 1, "round 1 present");
    assert(Array.isArray(data.data[0]?.matches), "matches included");
  });

  await test("GET /api/rounds/:id returns round with full detail", async () => {
    const { status, data } = await req("GET", `/api/rounds/${roundId}`, undefined, token);
    assert(status === 200, `status 200 (got ${status})`);
    assert(data.data?.id === roundId, "id matches");
    assert(data.data?.isConfirmed === false, "not yet confirmed");
  });

  await test("POST /api/rounds/:id/confirm marks round as confirmed", async () => {
    const { status, data } = await req("POST", `/api/rounds/${roundId}/confirm`, undefined, token);
    assert(status === 200, `status 200 (got ${status})`);
    assert(data.data?.isConfirmed === true, "isConfirmed is true");
  });

  await test("POST /api/rounds/:id/confirm rejects already-confirmed round", async () => {
    const { status, data } = await req("POST", `/api/rounds/${roundId}/confirm`, undefined, token);
    assert(status === 400, `status 400 (got ${status})`);
    assert(data.success === false, "success is false");
  });

  await test("POST /api/rounds/generate blocked on non-ACTIVE session", async () => {
    await req("POST", `/api/sessions/${sessionId}/complete`, undefined, token);
    const { status, data } = await req("POST", "/api/rounds/generate", { sessionId }, token);
    assert(status === 400, `status 400 (got ${status})`);
    assert(data.success === false, "success is false");
  });
}

// ─── Cleanup ─────────────────────────────────────────────────────────────────

async function cleanup() {
  if (sessionId) await req("DELETE", `/api/sessions/${sessionId}`, undefined, token);
  for (const id of createdPlayerIds) {
    await req("DELETE", `/api/players/${id}`, undefined, token);
  }
}

// ─── Runner ──────────────────────────────────────────────────────────────────

async function main() {
  console.log("API Integration Tests");
  console.log("=".repeat(50));
  console.log(`Server: ${BASE}`);
  console.log(`Test account: ${TEST_EMAIL}\n`);

  try {
    await testAuth();
    await testSessions();
    await testPlayers();
    await testSessionPlayers();
    await testRounds();
  } finally {
    process.stdout.write("\nCleaning up test data... ");
    await cleanup();
    console.log("done");
  }

  console.log("\n" + "=".repeat(50));
  console.log(`Results: ${passed} passed, ${failed} failed`);

  if (failed > 0) process.exit(1);
}

main().catch(err => {
  console.error("Test runner crashed:", err.message);
  process.exit(1);
});
