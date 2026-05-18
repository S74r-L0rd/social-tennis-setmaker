# Social Tennis Setmaker

A web application that helps organisers manage social doubles tennis sessions more efficiently by automating match scheduling, tracking sit-out fairness, and broadcasting court assignments to players.

## Features

- User authentication (register, login, profile management)
- Session creation and configuration
- Player management with skill ratings and gender modes
- Automated doubles round generation with fairness algorithm
- Sit-out fairness tracking across rounds
- Partner and opponent history to reduce repeated pairings
- Court assignment and management
- Round confirmation and next-round generation
- Player swapping and reshuffle functionality
- Live broadcast view with QR code for players to scan
- Fairness analysis dashboard with cross-session player statistics
- PostgreSQL persistence via Neon cloud database

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Frontend | React 18 + Vite |
| Backend | Node.js + Express |
| Database | PostgreSQL (Neon) |
| ORM | Prisma |
| Auth | JWT |
| Styling | Tailwind CSS |
| Drag & Drop | @dnd-kit |

## Project Structure

```
social-tennis-setmaker/
├── client/                  # React frontend
│   ├── src/
│   │   ├── pages/           # Page components
│   │   ├── components/      # Reusable UI components
│   │   ├── context/         # AuthContext, SessionContext
│   │   ├── services/        # API service layer
│   │   └── utils/
│   └── .env.example
├── server/                  # Node.js backend
│   ├── src/
│   │   ├── algorithm/       # Scheduling algorithm
│   │   ├── middleware/      # JWT auth middleware
│   │   ├── repositories/    # Database access layer
│   │   ├── routes/          # API route handlers
│   │   └── app.js
│   ├── prisma/
│   │   ├── schema.prisma    # Database schema
│   │   └── migrations/
│   ├── tests/               # Algorithm and API tests
│   └── .env.example
└── README.md
```

## Prerequisites

- Node.js v18 or higher
- npm v9 or higher
- A PostgreSQL database (local or Neon cloud)

## Local Setup

### 1. Clone the repository

```bash
git clone https://github.com/S74r-L0rd/social-tennis-setmaker.git
cd social-tennis-setmaker
```

### 2. Set up the backend

```bash
cd server
npm install
```

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

Edit `server/.env`:

```env
DATABASE_URL="postgresql://USERNAME:PASSWORD@HOST:5432/DATABASE_NAME?sslmode=require"
JWT_SECRET="your-long-random-secret-key"
JWT_EXPIRES_IN="7d"
CLIENT_URL="http://localhost:5173"
```

Apply database migrations:

```bash
npx prisma migrate deploy
npx prisma generate
```

Start the backend server:

```bash
npm run dev
```

The backend runs on `http://localhost:5001`

### 3. Set up the frontend

Open a new terminal:

```bash
cd client
npm install
```

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `client/.env`:

```env
VITE_API_URL=http://localhost:5001
```

Start the frontend:

```bash
npm run dev
```

The frontend runs on `http://localhost:5173`

## Running Tests

```bash
# Scheduling algorithm tests
cd server
npm test

# API integration tests
npm run test:api
```

## API Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|------|
| POST | /api/auth/register | Register new user | No |
| POST | /api/auth/login | Login | No |
| GET | /api/auth/me | Get current user profile | Yes |
| PUT | /api/auth/profile | Update profile | Yes |
| PUT | /api/auth/password | Change password | Yes |
| GET | /api/sessions | Get all sessions | Yes |
| POST | /api/sessions | Create session | Yes |
| PUT | /api/sessions/:id | Update session | Yes |
| DELETE | /api/sessions/:id | Delete session | Yes |
| GET | /api/players | Get all players | Yes |
| POST | /api/players | Create player | Yes |
| PUT | /api/players/:id | Update player | Yes |
| POST | /api/rounds/generate | Generate round | Yes |
| POST | /api/rounds/:id/confirm | Confirm round | Yes |
| POST | /api/courts/session/:id/bulk | Set courts for session | Yes |

## Environment Variables

### Backend (`server/.env`)

| Variable | Description | Required |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `JWT_SECRET` | Secret key for signing JWT tokens | Yes |
| `JWT_EXPIRES_IN` | Token expiry duration | No (default: `7d`) |
| `CLIENT_URL` | Frontend URL for CORS | No (default: `http://localhost:5173`) |
| `PORT` | Server port | No (default: `5001`) |

### Frontend (`client/.env`)

| Variable | Description | Required |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API base URL | No (default: `http://localhost:5001`) |

## Important Notes

- Never commit `server/.env` or `client/.env` — they are listed in `.gitignore`
- Always run Prisma commands from inside the `server/` directory
- If Prisma fails with a connection error, check your `DATABASE_URL` in `server/.env` first

## Team

CITS5206 Capstone — Group 07, University of Western Australia
