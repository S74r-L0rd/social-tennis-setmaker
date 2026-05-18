# Deployment Guide — Social Tennis Setmaker

This guide covers deploying the full application using:
- **Frontend** → Vercel
- **Backend** → Render
- **Database** → Neon PostgreSQL

---

## 1. Database — Neon PostgreSQL

### Create the database

1. Go to [https://console.neon.tech](https://console.neon.tech) and sign in
2. Create a new project (e.g. `social-tennis-setmaker`)
3. Once created, go to **Connection Details**
4. Copy the **Connection string** — it looks like:
   ```
   postgresql://neondb_owner:PASSWORD@ep-xxx.neon.tech/neondb?sslmode=require
   ```

### Apply migrations

From your local machine with the Neon `DATABASE_URL` set in `server/.env`:

```bash
cd server
npx prisma migrate deploy
npx prisma generate
```

All tables will be created in the Neon database automatically.

### Add team members

1. In the Neon dashboard, go to **Settings → Collaborators**
2. Invite team members by email so they can access the shared database

---

## 2. Backend — Render

### Create a new Web Service

1. Go to [https://render.com](https://render.com) and sign in
2. Click **New → Web Service**
3. Connect your GitHub repository: `S74r-L0rd/social-tennis-setmaker`
4. Configure the service:

| Setting | Value |
|---------|-------|
| **Name** | `social-tennis-setmaker-server` |
| **Root Directory** | `server` |
| **Runtime** | Node |
| **Build Command** | `npm install && npx prisma generate` |
| **Start Command** | `node src/app.js` |
| **Instance Type** | Free |

### Set environment variables on Render

Go to **Environment** tab and add:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | Your Neon connection string |
| `JWT_SECRET` | A long random string (e.g. generate one at [randomkeygen.com](https://randomkeygen.com)) |
| `JWT_EXPIRES_IN` | `7d` |
| `CLIENT_URL` | Your Vercel frontend URL (add after deploying frontend) |
| `PORT` | `5001` |

### Deploy

Click **Create Web Service**. Render will build and deploy automatically.

Your backend API will be available at:
```
https://social-tennis-setmaker-server.onrender.com
```

> **Note:** Free Render instances spin down after inactivity. The first request after idle may take 30–60 seconds.

---

## 3. Frontend — Vercel

### Deploy to Vercel

1. Go to [https://vercel.com](https://vercel.com) and sign in
2. Click **New Project** and import from GitHub: `S74r-L0rd/social-tennis-setmaker`
3. Configure the project:

| Setting | Value |
|---------|-------|
| **Root Directory** | `client` |
| **Framework Preset** | Vite |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |

### Set environment variables on Vercel

Go to **Settings → Environment Variables** and add:

| Key | Value |
|-----|-------|
| `VITE_API_URL` | Your Render backend URL (e.g. `https://social-tennis-setmaker-server.onrender.com`) |

### Deploy

Click **Deploy**. Vercel will build and deploy automatically.

Your frontend will be available at:
```
https://social-tennis-setmaker.vercel.app
```

---

## 4. Post-deployment — Update CORS

After both are deployed, go back to Render and update the `CLIENT_URL` environment variable to your Vercel URL:

```
CLIENT_URL=https://social-tennis-setmaker.vercel.app
```

Render will redeploy automatically.

---

## 5. Verify Deployment

Test the following after deployment:

- [ ] Visit the Vercel URL — home page loads
- [ ] Register a new account
- [ ] Log in with the account
- [ ] Create a session
- [ ] Add players
- [ ] Generate a round
- [ ] Check Neon dashboard — confirm data appears in tables

---

## Redeployment

### Backend (Render)
Render automatically redeploys on every push to the connected branch.

### Frontend (Vercel)
Vercel automatically redeploys on every push to the connected branch.

### Database migrations
When schema changes are made, run migrations from your local machine:

```bash
cd server
npx prisma migrate deploy
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Backend returns 500 errors | Check Render logs — likely a missing env variable |
| Frontend can't reach backend | Check `VITE_API_URL` on Vercel and `CLIENT_URL` on Render |
| Prisma connection error | Check `DATABASE_URL` — must include `?sslmode=require` for Neon |
| Render takes too long to respond | Free tier spins down — first request is slow, subsequent ones are fast |
| Migration fails | Run `npx prisma migrate status` locally to check which migrations are pending |
