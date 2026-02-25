# 🛡️ CTF Arena — Backend Meta Prompt

> **Use this prompt with any AI coding assistant to generate the complete backend for the CTF Arena challenge portal.**

---

## Prompt

```
Build a production-ready backend API for a "Beginner CTF (Capture The Flag)" challenge portal called "CTF Arena." The frontend is already built with React + Vite + TypeScript and is running separately. The backend must be a standalone REST API server.

---

## Technology Stack

- **Runtime**: Node.js (v18+)
- **Framework**: Express.js with TypeScript
- **Database**: SQLite via `better-sqlite3` (for simplicity; no external DB setup required)
- **Authentication**: JWT (JSON Web Tokens) using `jsonwebtoken`
- **Password Hashing**: `bcryptjs`
- **Validation**: `zod` for request body validation
- **CORS**: `cors` package (allow frontend origin)
- **Environment Variables**: `dotenv`

---

## Project Structure

Create the backend in a `/backend` directory at the project root (sibling to `/frontend`):

```

intro-to-ctf/
├── frontend/ # (already exists)
├── backend/
│ ├── src/
│ │ ├── index.ts # Entry point — Express server setup
│ │ ├── config/
│ │ │ └── env.ts # Environment variable loader & validation
│ │ ├── db/
│ │ │ ├── database.ts # SQLite connection & initialization
│ │ │ ├── seed.ts # Seed script for challenges & admin user
│ │ │ └── schema.sql # SQL schema (for reference)
│ │ ├── middleware/
│ │ │ ├── auth.ts # JWT verification middleware
│ │ │ ├── errorHandler.ts # Global error handling middleware
│ │ │ └── rateLimiter.ts # Rate limiting for flag submissions
│ │ ├── routes/
│ │ │ ├── auth.routes.ts # POST /api/auth/register, /api/auth/login
│ │ │ ├── challenge.routes.ts # GET /api/challenges, POST /api/challenges/:id/submit
│ │ │ ├── user.routes.ts # GET /api/user/profile, GET /api/user/stats
│ │ │ └── leaderboard.routes.ts # GET /api/leaderboard
│ │ ├── controllers/
│ │ │ ├── auth.controller.ts
│ │ │ ├── challenge.controller.ts
│ │ │ ├── user.controller.ts
│ │ │ └── leaderboard.controller.ts
│ │ ├── services/
│ │ │ ├── auth.service.ts
│ │ │ ├── challenge.service.ts
│ │ │ └── user.service.ts
│ │ └── types/
│ │ └── index.ts # Shared TypeScript interfaces
│ ├── .env # Environment variables
│ ├── .env.example # Template for env vars
│ ├── package.json
│ ├── tsconfig.json
│ └── nodemon.json # For dev auto-reload

````

---

## Database Schema (SQLite)

### Table: `users`
| Column       | Type         | Constraints                        |
|--------------|--------------|------------------------------------|
| id           | INTEGER      | PRIMARY KEY AUTOINCREMENT          |
| username     | TEXT         | UNIQUE, NOT NULL, min 3 chars      |
| email        | TEXT         | UNIQUE, NOT NULL                   |
| password     | TEXT         | NOT NULL (bcrypt hashed)           |
| points       | INTEGER      | DEFAULT 0                          |
| created_at   | DATETIME     | DEFAULT CURRENT_TIMESTAMP          |
| updated_at   | DATETIME     | DEFAULT CURRENT_TIMESTAMP          |

### Table: `challenges`
| Column       | Type         | Constraints                        |
|--------------|--------------|------------------------------------|
| id           | TEXT         | PRIMARY KEY (e.g., 'osint-01')     |
| title        | TEXT         | NOT NULL                           |
| category     | TEXT         | NOT NULL, CHECK IN ('OSINT','Crypto','Web','Forensics','Reverse') |
| difficulty   | TEXT         | NOT NULL, CHECK IN ('Easy','Medium','Hard') |
| description  | TEXT         | NOT NULL                           |
| hint         | TEXT         | NOT NULL                           |
| flag         | TEXT         | NOT NULL (stored as plain text, compared case-sensitively) |
| points       | INTEGER      | NOT NULL                           |
| author       | TEXT         | DEFAULT 'admin'                    |
| created_at   | DATETIME     | DEFAULT CURRENT_TIMESTAMP          |

### Table: `submissions`
| Column        | Type         | Constraints                       |
|---------------|--------------|-----------------------------------|
| id            | INTEGER      | PRIMARY KEY AUTOINCREMENT         |
| user_id       | INTEGER      | FK → users.id, NOT NULL           |
| challenge_id  | TEXT         | FK → challenges.id, NOT NULL      |
| submitted_flag| TEXT         | NOT NULL (what the user submitted)|
| is_correct    | BOOLEAN      | NOT NULL                          |
| submitted_at  | DATETIME     | DEFAULT CURRENT_TIMESTAMP         |

### Table: `solves`
| Column        | Type         | Constraints                       |
|---------------|--------------|-----------------------------------|
| id            | INTEGER      | PRIMARY KEY AUTOINCREMENT         |
| user_id       | INTEGER      | FK → users.id, NOT NULL           |
| challenge_id  | TEXT         | FK → challenges.id, NOT NULL      |
| solved_at     | DATETIME     | DEFAULT CURRENT_TIMESTAMP         |
| UNIQUE(user_id, challenge_id)                                      |

---

## Seed Data — Challenges

Pre-populate the database with these 5 challenges:

1. **OSINT — Digital Footprint**
   - id: `osint-01`
   - difficulty: Easy
   - points: 100
   - flag: `CTF{0p3n_s0urc3_1nt3l}`
   - description: "A mysterious user left traces across the internet. Their username is 'cyb3rph4nt0m'. Find the hidden message in their public profile bio on a popular code-sharing platform."
   - hint: "Check their GitHub profile for repositories with unusual names."

2. **Crypto — Caesar's Secret**
   - id: `crypto-01`
   - difficulty: Easy
   - points: 100
   - flag: `CTF{caesar_cipher_is_easy}`
   - description: "Julius Caesar used a simple cipher to protect his military messages. Can you decode this intercepted message?\n\nEncrypted: 'HWI{fdhvdu_flskhu_lv_hdvb}'\n\nThe shift is classic — think of the original Caesar cipher."
   - hint: "The standard Caesar cipher uses a shift of 3."

3. **Web — Hidden in Plain Sight**
   - id: `web-01`
   - difficulty: Medium
   - points: 200
   - flag: `CTF{v13w_s0urc3_ftw}`
   - description: "Our dev team accidentally left some sensitive information in the website's source code. The flag is hidden somewhere in the page — but you won't find it by just looking at the rendered page."
   - hint: "View the page source or inspect elements. Developers sometimes leave comments in HTML."

4. **Forensics — Pixel Perfect**
   - id: `forensics-01`
   - difficulty: Medium
   - points: 200
   - flag: `CTF{st3g0_m4st3r}`
   - description: "An image file was recovered from a compromised server. It looks like a normal landscape photo, but our analysts believe data is hidden within the pixel values."
   - hint: "Look into LSB (Least Significant Bit) steganography. Tools like zsteg or stegsolve can help."

5. **Reverse — Binary Secrets**
   - id: `reverse-01`
   - difficulty: Hard
   - points: 300
   - flag: `CTF{r3v3rs3_3ng1n33r}`
   - description: "A compiled binary was found on the target system. It asks for a password, but we don't know it. Reverse engineer the binary to discover the hardcoded password."
   - hint: "Try using strings command first, then move to Ghidra or IDA Free for deeper analysis."

---

## API Endpoints

### 🔐 Authentication

#### `POST /api/auth/register`
- **Body**: `{ "username": string, "email": string, "password": string }`
- **Validation**:
  - `username`: 3–20 chars, alphanumeric + underscores only
  - `email`: valid email format
  - `password`: minimum 6 characters
- **Response (201)**: `{ "message": "Registration successful", "token": "<JWT>", "user": { "id", "username", "email" } }`
- **Errors**: 409 if username/email already exists

#### `POST /api/auth/login`
- **Body**: `{ "username": string, "password": string }`
- **Response (200)**: `{ "message": "Login successful", "token": "<JWT>", "user": { "id", "username", "email", "points" } }`
- **Errors**: 401 if credentials invalid

### 🏴 Challenges (Protected — requires JWT)

#### `GET /api/challenges`
- **Headers**: `Authorization: Bearer <JWT>`
- **Response (200)**:
```json
{
  "challenges": [
    {
      "id": "osint-01",
      "title": "Digital Footprint",
      "category": "OSINT",
      "difficulty": "Easy",
      "description": "...",
      "hint": "...",
      "points": 100,
      "solved": false,       // whether THIS user has solved it
      "totalSolves": 12      // how many users have solved it
    }
  ]
}
````

- **IMPORTANT**: Never return the `flag` field in this response!

#### `POST /api/challenges/:id/submit`

- **Headers**: `Authorization: Bearer <JWT>`
- **Body**: `{ "flag": string }`
- **Rate Limit**: Max 10 attempts per challenge per 5 minutes
- **Response (200) — Correct**:

```json
{
  "correct": true,
  "message": "🎉 Flag accepted! You earned 100 points.",
  "pointsAwarded": 100,
  "totalPoints": 100,
  "newRank": 5
}
```

- **Response (200) — Incorrect**:

```json
{
  "correct": false,
  "message": "Incorrect flag. Try again!",
  "attemptsRemaining": 8
}
```

- **Response (200) — Already Solved**:

```json
{
  "correct": true,
  "message": "You've already solved this challenge.",
  "alreadySolved": true
}
```

### 👤 User (Protected)

#### `GET /api/user/profile`

- **Response (200)**:

```json
{
  "id": 1,
  "username": "player1",
  "email": "player1@example.com",
  "points": 300,
  "rank": 3,
  "solvedChallenges": ["osint-01", "crypto-01", "web-01"],
  "totalChallenges": 5,
  "joinedAt": "2026-02-25T12:00:00Z"
}
```

#### `GET /api/user/stats`

- **Response (200)**:

```json
{
  "points": 300,
  "rank": 3,
  "solvedCount": 3,
  "totalChallenges": 5,
  "submissions": 15,
  "accuracy": 20.0,
  "categorySolves": {
    "OSINT": 1,
    "Crypto": 1,
    "Web": 1,
    "Forensics": 0,
    "Reverse": 0
  }
}
```

### 🏆 Leaderboard (Public — no JWT required)

#### `GET /api/leaderboard`

- **Query params**: `?limit=10` (default 10, max 50)
- **Response (200)**:

```json
{
  "leaderboard": [
    {
      "rank": 1,
      "username": "z3r0c00l",
      "points": 900,
      "solvedCount": 5
    }
  ],
  "totalPlayers": 42
}
```

---

## JWT Configuration

- **Secret**: Read from `JWT_SECRET` environment variable
- **Expiry**: 24 hours (`24h`)
- **Payload**: `{ "userId": number, "username": string }`
- **Algorithm**: HS256

---

## Environment Variables (.env)

```
PORT=3001
JWT_SECRET=ctf-arena-super-secret-key-change-in-production
DB_PATH=./data/ctf-arena.db
CORS_ORIGIN=http://localhost:5173
NODE_ENV=development
RATE_LIMIT_WINDOW_MS=300000
RATE_LIMIT_MAX_ATTEMPTS=10
```

---

## Middleware Requirements

### Auth Middleware (`auth.ts`)

- Extract JWT from `Authorization: Bearer <token>` header
- Verify token signature and expiry
- Attach `req.user = { userId, username }` to request
- Return 401 if token missing/invalid/expired

### Rate Limiter (`rateLimiter.ts`)

- Track flag submissions per user per challenge
- Use in-memory store (Map) with TTL
- Max 10 attempts per challenge per 5-minute window
- Return 429 with retry-after header when exceeded

### Error Handler (`errorHandler.ts`)

- Catch all unhandled errors
- Return consistent error format: `{ "error": string, "message": string, "statusCode": number }`
- Don't leak stack traces in production

---

## Security Considerations

1. **Never return flags** in any GET response — flags only exist in the DB and are compared server-side
2. **Hash passwords** with bcrypt (salt rounds: 12)
3. **Validate all inputs** with Zod schemas before processing
4. **Rate-limit** flag submissions to prevent brute force
5. **Sanitize error messages** — don't reveal whether a username exists during login (use generic "Invalid credentials")
6. **CORS** — only allow the frontend origin
7. **Helmet** — use `helmet` middleware for security headers

---

## Scripts (package.json)

```json
{
  "scripts": {
    "dev": "nodemon",
    "build": "tsc",
    "start": "node dist/index.js",
    "seed": "ts-node src/db/seed.ts"
  }
}
```

---

## Integration Notes for Frontend

The React frontend at `/frontend` will need to be updated to:

1. Add a Login/Register page (route: `/auth`)
2. Store JWT in `localStorage` or a secure cookie
3. Send `Authorization: Bearer <token>` header on all protected API calls
4. Fetch challenges from `GET /api/challenges` instead of local `data.ts`
5. Submit flags to `POST /api/challenges/:id/submit` instead of local comparison
6. Fetch leaderboard from `GET /api/leaderboard` in real-time
7. Add an auth context/provider for managing user session state
8. Redirect unauthenticated users to the login page

---

## Vibe & Quality

- Write clean, well-typed TypeScript with NO `any` types
- Add JSDoc comments on all service functions
- Use async/await consistently (even though better-sqlite3 is sync, wrap in try/catch)
- Log important events with timestamps (startup, auth events, flag submissions)
- Make the seed script idempotent (safe to run multiple times)
- Test that the server starts without errors and all endpoints return expected responses

```

---

## Quick Copy-Paste Version (Condensed)

If you need a shorter version to paste into an AI assistant:

```

Build a Node.js + Express + TypeScript backend for a CTF challenge portal.

Requirements:

- SQLite database (better-sqlite3) with tables: users, challenges, submissions, solves
- JWT authentication (register/login) with bcrypt password hashing
- 5 pre-seeded challenges (OSINT, Crypto, Web, Forensics, Reverse) with flags
- Endpoints: POST /api/auth/register, POST /api/auth/login, GET /api/challenges, POST /api/challenges/:id/submit, GET /api/user/profile, GET /api/leaderboard
- Never expose flags in GET responses — compare server-side only
- Rate limit flag submissions: 10 attempts per challenge per 5 min
- Zod validation, helmet security headers, CORS for frontend origin
- Clean TypeScript, no 'any' types, proper error handling

The frontend (React + Vite) is already built at /frontend. Backend goes in /backend directory. Server runs on port 3001.

```

```
