# Social Tennis Setmaker

## Backend local setup

The backend uses Prisma with PostgreSQL.
A real `.env` file is required locally for backend and Prisma commands, but it is **not committed** to the repository on purpose.

### 1. Create your local env file

Inside the `server` folder, create:

`server/.env`

You can copy:

`server/.env.example`

and replace the placeholder values.

### 2. Required environment variable

```env id="90814"
DATABASE_URL="postgresql://USERNAME:PASSWORD@HOST:5432/DATABASE_NAME?schema=public"
```

### 3. Backend setup steps

Run these commands from the `server` folder:

```bash id="53836"
npm install
npx prisma generate
npx prisma migrate deploy
node src/scripts/smoke-test-db.js
node src/app.js
```

### 4. Important notes

* Run Prisma commands from the `server` folder
* The port in `DATABASE_URL` must be a real numeric port such as `5432`
* Do not commit the real `server/.env`
* If Prisma fails with datasource or connection string errors, check the local `server/.env` file first
