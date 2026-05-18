# User Guide — Social Tennis Setmaker

This guide walks an organiser through the complete workflow of using Social Tennis Setmaker to run a social doubles tennis session.

---

## Getting Started

### Create an Account

1. Open the application in your browser
2. Click **Log In** on the home page
3. Select the **Sign Up** tab
4. Fill in your name, club details, email, and password
5. Click **Create Account**

You will be logged in automatically after registering.

### Log In

1. Click **Log In** on the home page
2. Enter your email and password
3. Click **Log In**

---

## Step 1 — Set Up a Session

After logging in, click **Start New Session** or go to **Setup** in the navigation bar.

Fill in the session details:

| Field | Description |
|-------|-------------|
| **Session Name** | A name for the session (e.g. "Saturday Morning Social") |
| **Session Date** | The date of the session |
| **Session Period** | Morning, Afternoon, or Evening |
| **Match Start Time** | The time the first round starts |
| **Match Duration** | How long each match runs (in minutes) |
| **Break Between Rounds** | Rest time between rounds (in minutes) |
| **Number of Courts** | How many courts are available |
| **Game Mode** | Same Gender, Mixed Doubles, or Flexible |

Click **Create Session** when done.

---

## Step 2 — Add Players

After setting up the session you will be taken to the **Players** page.

### Add a player

1. Click **+ Add Player**
2. Fill in:
   - **Name** — player's full name
   - **Gender** — Male or Female
   - **Skill Level** — Level 1 (Beginner), Level 2 (Intermediate), or Level 3 (Advanced)
   - **Rounds to Play** — set to 0 if the player plays all rounds, or enter a specific number
3. Click **Add Player**

Repeat for all players attending the session.

### Manage players

| Action | How |
|--------|-----|
| Edit a player | Click the pencil icon next to their name |
| Remove a player | Click the bin icon next to their name |
| Mark as resting | Click **Rest** — the player will be excluded from the next round |
| Return to active | Click **Play** to bring them back |

> **Minimum:** At least 4 active players are required to generate a round.

---

## Step 3 — Generate the First Round

Once you have added all players, click **Generate Schedule** at the bottom of the Players page.

The algorithm will automatically:
- Group players into balanced doubles matches based on skill level
- Assign players to available courts
- Rotate sit-outs fairly so no player sits out more than others
- Avoid repeating the same partner or opponent pairings from previous rounds

---

## Step 4 — Review and Adjust the Schedule

You will be taken to the **Schedule** page showing the generated round.

### View matches

Each court card shows:
- The court name
- Team 1 vs Team 2 with player names
- A **Balanced** or **Skill Gap** indicator based on team ratings

### Swap players (drag and drop)

If you want to adjust the matchups:
1. Drag a player token from one position
2. Drop it onto another player to swap their positions

You can swap players between courts, between teams, and between court players and sit-outs.

### Sit-outs

Players who cannot be assigned to a court due to numbers are shown in the **Sitting Out** section at the bottom of the round.

### Confirm and generate next round

When you are happy with the round:
1. Click **Confirm & Generate Next Round**
2. The current round is locked and a new round is generated
3. The algorithm uses the confirmed round's history to avoid repeating the same pairings

You can view previous rounds by clicking the round tabs (R1, R2, R3...) at the top of the Schedule page.

---

## Step 5 — Broadcast to Players

To let players check their own court assignments:

1. Click **Broadcast** in the top right of the Schedule page
2. On the Broadcast page, click **Start Broadcasting**
3. A **QR code** will appear — players can scan it to view the current schedule on their phone
4. Share the URL shown below the QR code for players on the same network

The broadcast page shows all confirmed rounds with court assignments and sit-outs clearly displayed.

To stop broadcasting, click **Stop** in the top right of the Broadcast page.

---

## Profile Management

Click your name or the profile icon in the navigation bar to access your profile.

### Edit profile

1. Click **Edit Profile**
2. Update your name, email, club name, club country, or suburb
3. Click **Save**

### Change password

1. In the **Change Password** section, enter your current password
2. Enter and confirm your new password (minimum 6 characters)
3. Click **Update Password**

---

## Fairness Analysis

Click **Fairness** in the navigation bar to view the Fairness Dashboard.

This page shows statistics for all players across all sessions:

| Column | Description |
|--------|-------------|
| Name | Player name |
| Gender | Male / Female |
| Skill Level | Level 1, 2, or 3 |
| Sit Out | Total sit-outs and sit-out percentage |
| Unbalanced Matches | Matches where team rating gap was 2 or more |
| Total Matches | Total rounds played |
| Sessions | Number of sessions the player has appeared in |
| Common Partner | The player they have been paired with most often |

### Filters and sorting

- **Search** — find a player by name or common partner
- **Gender filter** — show All, Male, or Female players
- **Group by** — group players by skill level or alphabetically
- **Sort** — click any column header to sort ascending or descending
- **Page size** — show 10, 20, or 50 players per page

### Summary cards

At the top of the page:
- **Avg Sit-outs** — average sit-outs per player
- **Max Sit-outs** — the highest sit-out count for any player
- **Fairness Score** — overall fairness rating (High / Medium / Low)
- **Unbalanced Matches %** — percentage of matches with a skill gap

---

## Tips for Organisers

- Add all players before generating the first round so the algorithm has the full picture
- Use **Rounds to Play = 0** for players who are staying for the full session
- Use **Rounds to Play = N** for players leaving early — they will be excluded from later rounds automatically
- Use the **Rest** button for players taking a break mid-session without removing them
- The fairness score improves as more rounds are played, since the algorithm learns from history
- The QR code works on the same local network — for remote access, a deployed version is needed
