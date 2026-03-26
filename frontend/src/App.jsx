import { useState } from "react";

const samplePlayers = [
  {
    id: 1,
    name: "Alice",
    gender: "Female",
    rating: "5",
    rounds: [true, true, true, false],
  },
  {
    id: 2,
    name: "Ben",
    gender: "Male",
    rating: "4",
    rounds: [true, true, true, true],
  },
  {
    id: 3,
    name: "Chloe",
    gender: "Female",
    rating: "3",
    rounds: [true, false, true, true],
  },
  {
    id: 4,
    name: "David",
    gender: "Male",
    rating: "5",
    rounds: [true, true, false, true],
  },
];

const sampleMatches = [
  { court: "Court 1", match: "Alice + Ben vs Chloe + David" },
  { court: "Court 2", match: "Emma + Frank vs Grace + Henry" },
  { court: "Court 3", match: "Ivy + Jack vs Kelly + Leo" },
];

function App() {
  const [page, setPage] = useState("setup");

  const navButton = (key, label) => (
    <button
      onClick={() => setPage(key)}
      style={{
        display: "block",
        width: "100%",
        marginBottom: "10px",
        padding: "12px",
        borderRadius: "8px",
        border: "1px solid #ccc",
        background: page === key ? "#222" : "#fff",
        color: page === key ? "#fff" : "#000",
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ fontFamily: "Arial, sans-serif", padding: "20px", background: "#f5f5f5", minHeight: "100vh" }}>
      <h1>Social Tennis Setmaker</h1>
      <p>React + Vite UI prototype for organiser workflow</p>

      <div style={{ display: "flex", gap: "20px", alignItems: "flex-start" }}>
        <div
          style={{
            width: "240px",
            background: "#fff",
            padding: "15px",
            borderRadius: "10px",
            border: "1px solid #ddd",
          }}
        >
          <h3>Pages</h3>
          {navButton("setup", "1. Session Setup")}
          {navButton("players", "2. Player Management")}
          {navButton("matches", "3. Match Generation")}
          {navButton("adjust", "4. Manual Adjustment")}
          {navButton("output", "5. Output / Display")}
        </div>

        <div
          style={{
            flex: 1,
            background: "#fff",
            padding: "20px",
            borderRadius: "10px",
            border: "1px solid #ddd",
          }}
        >
          {page === "setup" && (
            <div>
              <h2>Session Setup Page</h2>
              <p>Purpose: Initialize and configure a new tennis session</p>

              <div style={{ marginBottom: "12px" }}>
                <label>Session Name</label>
                <br />
                <input type="text" defaultValue="Sunday Social" style={{ width: "100%", padding: "8px" }} />
              </div>

              <div style={{ marginBottom: "12px" }}>
                <label>Number of Courts</label>
                <br />
                <input type="number" defaultValue="3" style={{ width: "100%", padding: "8px" }} />
              </div>

              <div style={{ marginBottom: "12px" }}>
                <label>Match Type</label>
                <br />
                <select style={{ width: "100%", padding: "8px" }}>
                  <option>Same-gender doubles</option>
                  <option>Mixed doubles</option>
                  <option>Flexible mode</option>
                </select>
              </div>

              <div style={{ marginBottom: "12px" }}>
                <label>Rating Mode</label>
                <br />
                <select style={{ width: "100%", padding: "8px" }}>
                  <option>3-level system (3/4/5)</option>
                  <option>5-level system (2–6)</option>
                </select>
              </div>

              <button style={{ padding: "10px 16px" }}>Start Session</button>
            </div>
          )}

          {page === "players" && (
            <div>
              <h2>Player Management Page</h2>
              <p>Purpose: Input and manage all player data</p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "20px" }}>
                <input type="text" placeholder="Name" style={{ padding: "8px" }} />
                <select style={{ padding: "8px" }}>
                  <option>Male</option>
                  <option>Female</option>
                </select>
                <input type="text" placeholder="Skill rating" style={{ padding: "8px" }} />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <button style={{ padding: "10px 16px", marginRight: "10px" }}>Add Player</button>
                <button style={{ padding: "10px 16px", marginRight: "10px" }}>Edit Player</button>
                <button style={{ padding: "10px 16px" }}>Remove Player</button>
              </div>

              <h3>Player List Display</h3>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ border: "1px solid #ccc", padding: "8px" }}>Name</th>
                    <th style={{ border: "1px solid #ccc", padding: "8px" }}>Gender</th>
                    <th style={{ border: "1px solid #ccc", padding: "8px" }}>Rating</th>
                    <th style={{ border: "1px solid #ccc", padding: "8px" }}>Set 1</th>
                    <th style={{ border: "1px solid #ccc", padding: "8px" }}>Set 2</th>
                    <th style={{ border: "1px solid #ccc", padding: "8px" }}>Set 3</th>
                    <th style={{ border: "1px solid #ccc", padding: "8px" }}>Set 4</th>
                  </tr>
                </thead>
                <tbody>
                  {samplePlayers.map((player) => (
                    <tr key={player.id}>
                      <td style={{ border: "1px solid #ccc", padding: "8px" }}>{player.name}</td>
                      <td style={{ border: "1px solid #ccc", padding: "8px" }}>{player.gender}</td>
                      <td style={{ border: "1px solid #ccc", padding: "8px" }}>{player.rating}</td>
                      {player.rounds.map((r, i) => (
                        <td key={i} style={{ border: "1px solid #ccc", padding: "8px", textAlign: "center" }}>
                          {r ? "✓" : ""}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {page === "matches" && (
            <div>
              <h2>Match Generation Page</h2>
              <p>Purpose: Automatically generate match sets</p>

              <button style={{ padding: "10px 16px", marginBottom: "20px" }}>Generate Matches</button>

              <h3>Match Assignment Display</h3>
              {sampleMatches.map((item, index) => (
                <div
                  key={index}
                  style={{
                    border: "1px solid #ccc",
                    borderRadius: "8px",
                    padding: "12px",
                    marginBottom: "10px",
                  }}
                >
                  <strong>{item.court}</strong>
                  <div>{item.match}</div>
                </div>
              ))}

              <h3>Sit-out Players Display</h3>
              <p>Mia, Noah</p>

              <h3>Balance Indicator</h3>
              <p>Match balance status shown here</p>

              <h3>History Reference</h3>
              <p>Previous pairing history shown here</p>
            </div>
          )}

          {page === "adjust" && (
            <div>
              <h2>Manual Adjustment Page</h2>
              <p>Purpose: Manually refine generated matches</p>

              <div style={{ marginBottom: "12px" }}>
                <button style={{ padding: "10px 16px", marginRight: "10px" }}>Swap Players</button>
                <button style={{ padding: "10px 16px", marginRight: "10px" }}>Drag and Drop Adjustment</button>
                <button style={{ padding: "10px 16px" }}>Reassign Matches</button>
              </div>

              <h3>Error / Imbalance Highlighting</h3>
              <div
                style={{
                  padding: "12px",
                  background: "#fff3cd",
                  border: "1px solid #ffe69c",
                  borderRadius: "8px",
                }}
              >
                Warning: Court 2 may be unbalanced
              </div>
            </div>
          )}

          {page === "output" && (
            <div>
              <h2>Output / Display Page</h2>
              <p>Purpose: Present match results to players</p>

              <div style={{ marginBottom: "20px" }}>
                <button style={{ padding: "10px 16px", marginRight: "10px" }}>Print View (A4 Format)</button>
                <button style={{ padding: "10px 16px" }}>Mobile View</button>
              </div>

              <h3>Court Assignment Display</h3>
              {sampleMatches.map((item, index) => (
                <div
                  key={index}
                  style={{
                    border: "1px solid #ccc",
                    borderRadius: "8px",
                    padding: "12px",
                    marginBottom: "10px",
                  }}
                >
                  <strong>{item.court}</strong>
                  <div>{item.match}</div>
                </div>
              ))}

              
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;