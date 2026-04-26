Here's the updated `README.md` reflecting the fully refactored codebase — accurate architecture, flows, tech stack, API, and project structure.

---

# 🥋 Dojo

> A live competitive coding platform built for recruiting competitive programmers. Spin up a contest room, share a code, and let candidates compete — all in real time.

---

## Table of Contents

- [What is Dojo?](#what-is-dojo)
- [Features](#features)
- [Roles](#roles)
- [Contest Flow](#contest-flow)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Database Schema](#database-schema)
- [API Design](#api-design)
- [WebSocket Events](#websocket-events)
- [Code Execution Engine](#code-execution-engine)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Roadmap](#roadmap)

---

## What is Dojo?

Dojo is a self-hosted, invite-only coding contest platform designed for **recruiting competitive programmers**. Instead of sending candidates to LeetCode or HackerRank, you run your own contest — on your own platform, with your own problems, your own rules, and full visibility into every submission.

A host creates a room, gets a short 6‑character room code, and shares it. Candidates join as participants, co‑recruiters join as hosts, and anyone else can watch as a viewer. The host posts problems, starts a timer, and watches the live leaderboard update in real time as participants submit code.

After the contest, hosts can review every submission, every test case result, and every line of code each candidate wrote.

---

## Features

### For Hosts

- Create a contest room and get a shareable room code (e.g. `abc123`)
- Multiple hosts supported — co‑recruiters can join the same room as a host
- Post problems with visible sample test cases and hidden judge test cases
- Control the contest timer — start, pause, resume, and end
- View all participant submissions, code, and per‑test‑case results post‑contest
- Remove participants or viewers from the room
- Set point values, time limits, and memory limits per problem

### For Participants

- Join via room code with just a name — no account needed
- Read problems and write code in the built‑in Monaco Editor
- Run code against visible sample test cases before submitting
- Submit for full judging against all hidden test cases
- Receive live verdicts — AC, WA, TLE, RE, CE
- Appear on the live leaderboard
- Proctored environment: fullscreen required, violation warnings with auto‑kick after 4 violations

### For Viewers (Spectators)

- Join via room code as a read‑only observer
- Watch the live leaderboard update in real time
- See contest progress without being able to submit

### Supported Languages

| Language   | Compile inside Docker sandbox      | Run                            |
| ---------- | ---------------------------------- | ------------------------------ |
| C++        | `g++ -O2 solution.cpp -o solution` | `./solution`                   |
| C          | `gcc solution.c -o solution`       | `./solution`                   |
| Java       | `javac Solution.java`              | `java -Xmx200m -cp . Solution` |
| Python     | —                                  | `python3 solution.py`          |
| JavaScript | —                                  | `node solution.js`             |

All compilation and execution happens inside disposable Docker containers with no host compilers needed.

---

## Roles

| Role            | Can Code | On Leaderboard | Can Manage Room | Needs Account |
| --------------- | -------- | -------------- | --------------- | ------------- |
| **Host**        | No       | No             | Yes             | Yes           |
| **Participant** | Yes      | Yes            | No              | No            |
| **Viewer**      | No       | No             | No              | No            |

When joining a contest, every user fills in three things:

1. Their **name**
2. Their **role** — Host, Participant, or Viewer
3. The **room code**

Participants and viewers are sessionless — no account required. Their identity within a room is their name + room code combined, stored in Redis for the duration of the contest.

---

## Contest Flow

```
Host creates room
      ↓
Gets room code → shares with candidates (Participant),
                  co‑recruiters (Host) and observers (Viewer)
      ↓
Everyone joins → picks name + role + enters code
      ↓
Host posts problems with test cases
      ↓
Host starts timer (e.g. 90 minutes)
      ↓
Participants write and submit code
      ↓
Judge service sandboxes and executes code against all test cases
      ↓
Verdict returned → leaderboard updates live for everyone
      ↓
Timer ends → room locked → no more submissions
      ↓
Hosts review every candidate's code and results
```

---

## Tech Stack

### Frontend

| Technology         | Purpose                                                    |
| ------------------ | ---------------------------------------------------------- |
| React + TypeScript | UI framework, fully typed                                  |
| Monaco Editor      | VS Code's editor — syntax highlighting for all 5 languages |
| Socket.io Client   | Real‑time leaderboard, timer, room events                  |
| TailwindCSS        | Utility‑first styling                                      |
| Zustand            | Global state — room state, timer, leaderboard              |

### Backend

| Technology                     | Purpose                                              |
| ------------------------------ | ---------------------------------------------------- |
| Node.js + Express + TypeScript | Main API server                                      |
| Socket.io                      | WebSocket server — real‑time events                  |
| Redis Pub/Sub                  | Event broadcasting between backend and judge service |
| Redis (hashes, sorted sets)    | Room state, timer, leaderboard, participant list     |
| JWT + bcrypt                   | Authentication for host accounts                     |
| Axios                          | HTTP communication with judge service                |

### Judge Service

| Technology | Purpose                                |
| ---------- | -------------------------------------- |
| Go         | Fast, concurrent HTTP server           |
| Docker CLI | Isolated sandbox per submission        |
| Redis      | Publishing verdicts to pub/sub channel |

### Database

| Technology | Purpose                                                |
| ---------- | ------------------------------------------------------ |
| PostgreSQL | All persistent data                                    |
| Redis      | Room state, timer, leaderboard cache, participant list |

### Infrastructure

| Technology     | Purpose                                  |
| -------------- | ---------------------------------------- |
| Docker Compose | Runs entire stack locally in one command |
| Docker         | Sandbox containers for code execution    |

---

## Architecture

### Overview

Dojo is composed of **4 services** that communicate through PostgreSQL, Redis, and WebSockets:

```
┌─────────────────────────────────────┐
│         React Frontend              │
│  (Monaco Editor + Socket.io client) │
└────────────┬───────────────┬────────┘
             │ REST          │ WebSocket
             ▼               ▼
┌─────────────────────────────────────┐
│      Node.js + Express + TS         │
│         Backend API                 │
│   (Auth, Rooms, Problems, Socket)   │
└──────┬──────────────────┬───────────┘
       │                  │
       ▼                  ▼
┌─────────────┐    ┌──────────────────┐
│ PostgreSQL  │    │      Redis        │
│ (Persistent │    │ (Room State,     │
│   Storage)  │    │  Timer, Cache,   │
└─────────────┘    │  Pub/Sub)        │
                   └────────┬─────────┘
                            │ HTTP /submit
                            ▼
                   ┌──────────────────┐
                   │  Judge Service   │
                   │      (Go)        │
                   │  Docker Sandbox  │
                   └────────┬─────────┘
                            │ Verdict via Redis PubSub
                            ▼
                   ┌──────────────────┐
                   │    Backend       │
                   │ (verdict.listener)
                   └────────┬─────────┘
                            │ WebSocket push to room
                            ▼
                   ┌──────────────────┐
                   │     Frontend     │
                   └──────────────────┘
```

### Submission Flow (Step by Step)

```
1. Participant clicks Submit
2. POST /api/submissions → Backend receives code + language + problemId
3. Backend validates participant is in room, room is active, and not already solved
4. Backend saves submission to PostgreSQL with status: "queued"
5. Backend sends HTTP POST to judge service at /submit with all test cases
6. Backend immediately returns { submissionId, status: "queued" } to frontend
7. Judge starts processing asynchronously, updates status to "judging"
8. Judge creates a temp directory, writes source file
9. For compiled languages, builds a Docker run command that compiles then runs
10. For each test case:
    - Spins up the appropriate sandbox container
    - Pipes input via stdin
    - Captures stdout
    - Enforces time and memory limits via Docker flags
    - Compares output to expected output
    - Records result per test case
11. Final verdict determined (AC, WA, TLE, RE, CE)
12. Judge publishes verdict to Redis PubSub channel "pubsub:verdict"
13. Backend verdict.listener picks up the message
14. Backend updates submission status/score in PostgreSQL
15. Backend inserts per‑test‑case results into submission_results table
16. If AC, updates leaderboard in Redis sorted set (idempotent via solved set)
17. Backend pushes verdict to the participant via WebSocket
18. Backend broadcasts updated leaderboard to entire room via WebSocket
19. Backend emits submission_update event for the live feed
```

### Timer Flow

```
Host clicks Start →
  Server-side interval begins, ticking every second
  Timer state stored in Redis hash (room:{code}:timer)
  SQL updated to status "active"
  Every second → broadcasts timer_tick to entire room

Host clicks Pause →
  Calculates elapsed time, stores in Redis
  Clears interval, broadcasts paused state
  SQL status "paused" with timer_elapsed

Host clicks Resume →
  Recalculates startedAt, resumes interval
  Redis and SQL updated to "active"

Timer hits 0 (or Host clicks End) →
  Interval cleared
  Room status set to "ended" in PostgreSQL
  Final leaderboard fetched from Redis
  contest_ended broadcast to all room members
  No more submissions accepted
```

### Proctoring Flow

```
Participant enters room →
  During active contest, fullscreen mode is required
  Fullscreen prompt overlay shown until user enters fullscreen

Tab switch or window blur →
  Frontend emits proctor_violation event via WebSocket
  Backend increments violation counter in Redis (expires after 1 hour)
  If count < 4 → frontend receives violation_warning with current count
  If count >= 4 → participant is kicked, removed from Redis participant list,
                  frontend receives kicked event with reason
```

---

## Database Schema

### `users`

Stores host accounts only. Participants and viewers are sessionless.

```sql
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMP DEFAULT NOW()
);
```

### `rooms`

Each contest room. Tracks timer state and current status.

```sql
CREATE TABLE rooms (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code             VARCHAR(20) UNIQUE NOT NULL,   -- e.g. abc123
  name             VARCHAR(255) NOT NULL,
  created_by       UUID REFERENCES users(id),
  status           VARCHAR(20) DEFAULT 'waiting', -- waiting | active | paused | ended
  timer_duration   INTEGER,                       -- total duration in seconds
  timer_started_at TIMESTAMP,                     -- when timer was last started/resumed
  timer_elapsed    INTEGER DEFAULT 0,             -- seconds elapsed before last pause
  created_at       TIMESTAMP DEFAULT NOW()
);
```

### `room_hosts`

Tracks which host accounts are co‑hosting a room.

```sql
CREATE TABLE room_hosts (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id   UUID REFERENCES rooms(id) ON DELETE CASCADE,
  user_id   UUID REFERENCES users(id),
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);
```

### `problems`

Problems posted by hosts inside a room.

```sql
CREATE TABLE problems (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id        UUID REFERENCES rooms(id) ON DELETE CASCADE,
  title          VARCHAR(255) NOT NULL,
  description    TEXT NOT NULL,
  input_format   TEXT,
  output_format  TEXT,
  constraints    TEXT,
  points         INTEGER DEFAULT 100,
  time_limit     INTEGER DEFAULT 2,     -- seconds
  memory_limit   INTEGER DEFAULT 256,   -- MB
  order_index    INTEGER DEFAULT 0,     -- problem ordering A, B, C...
  created_at     TIMESTAMP DEFAULT NOW()
);
```

### `test_cases`

Each problem has multiple test cases. Sample ones are visible to participants.

```sql
CREATE TABLE test_cases (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id      UUID REFERENCES problems(id) ON DELETE CASCADE,
  input           TEXT NOT NULL,
  expected_output TEXT NOT NULL,
  is_sample       BOOLEAN DEFAULT FALSE, -- TRUE = visible, FALSE = hidden judge case
  order_index     INTEGER DEFAULT 0
);
```

### `submissions`

Every code submission by a participant.

```sql
CREATE TABLE submissions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id          UUID REFERENCES rooms(id) ON DELETE CASCADE,
  problem_id       UUID REFERENCES problems(id),
  participant_name VARCHAR(100) NOT NULL,          -- name they entered on join
  language         VARCHAR(20) NOT NULL,           -- cpp | c | java | python | javascript
  code             TEXT NOT NULL,
  status           VARCHAR(30) DEFAULT 'queued',  -- queued | judging | accepted | wrong_answer | tle | runtime_error | compilation_error
  score            INTEGER DEFAULT 0,
  time_taken       INTEGER,                        -- ms, fastest accepted run
  memory_used      INTEGER,                        -- MB
  submitted_at     TIMESTAMP DEFAULT NOW()
);
```

### `submission_results`

Per test case results for every submission. Lets hosts see exactly where a candidate failed.

```sql
CREATE TABLE submission_results (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id  UUID REFERENCES submissions(id) ON DELETE CASCADE,
  test_case_id   UUID REFERENCES test_cases(id),
  status         VARCHAR(30) NOT NULL, -- accepted | wrong_answer | tle | runtime_error
  time_taken     INTEGER,              -- ms
  memory_used    INTEGER,              -- MB
  actual_output  TEXT                 -- what the code actually printed
);
```

### Redis Keys

```
room:{code}:participants     Hash   → { name: { role, joinedAt } }
room:{code}:timer            Hash   → { duration, startedAt, elapsed, status }
room:{code}:leaderboard      ZSet   → participant JSON sorted by score (tiebreak by time)
room:{code}:leaderboard:meta Hash   → per‑participant solved count, last accepted time
room:{code}:solved           Set    → submission IDs (prevents double scoring)
room:{code}:violations:{name} String → violation counter (TTL 1 hour)
pubsub:verdict               PubSub → channel from judge → backend
queue:submissions            List   → (deprecated, replaced by direct HTTP call)
```

### Relationships

```
users
  └── creates ──────────────→ rooms
                                ├── has many ──→ room_hosts (co‑hosts)
                                ├── has many ──→ problems
                                │                 └── has many → test_cases
                                └── has many ──→ submissions
                                                  └── has many → submission_results
```

### Scoring Logic

- First accepted submission for a problem → full points awarded
- Subsequent accepted submissions for same problem → no additional points (enforced by Redis solved set)
- Wrong answer → 0 points, tracked as an attempt

**Leaderboard ranking:**

1. Total points — descending
2. Tiebreak — total time of accepted submissions — ascending (faster wins)

---

## API Design

### Auth

```
POST   /api/auth/register        Create host account
POST   /api/auth/login           Login, receive JWT
GET    /api/auth/me              Get current host profile
```

Frontend uses a single `/auth` page with `?mode=login` or `?mode=register` search params.

### Rooms

```
POST   /api/rooms                Create a new contest room (auth required)
GET    /api/rooms/:code          Get room details by code (problems filtered by role)
POST   /api/rooms/:code/join     Join a room (name + role + code; host requires JWT)
DELETE /api/rooms/:code/participants/:name  Kick participant (host only)
```

Timer is controlled exclusively via WebSocket events — no REST endpoints for timer.

### Problems

```
GET     /api/rooms/:code/problems                   List problems (public or full based on role)
POST    /api/rooms/:code/problems                   Create a problem (host only)
PUT     /api/rooms/:code/problems/:id               Update a problem (host only)
DELETE  /api/rooms/:code/problems/:id               Delete a problem (host only)
POST    /api/rooms/:code/problems/:id/testcases     Add test case (host only)
DELETE  /api/rooms/:code/problems/:id/testcases/:tcId  Delete test case (host only)
```

### Submissions

```
POST   /api/submissions                         Submit code for judging (requires roomCode, participantName)
GET    /api/submissions/:id                     Get verdict and full submission details
GET    /api/rooms/:code/submissions             All submissions in a room (host only)
GET    /api/rooms/:code/submissions/:name       All submissions by a participant
```

### Run (sample test)

```
POST   /api/run    Execute code against sample input (requires roomCode, participantName validation)
```

---

## WebSocket Events

### Client → Server

```
join_room          { roomCode, name, role }
leave_room         { roomCode }
timer_start        { roomCode, userId }
timer_pause        { roomCode, userId }
timer_resume       { roomCode, userId }
timer_end          { roomCode, userId }
proctor_violation  { roomCode, type, participant }
problem_added      { roomCode, problem }
problem_updated    { roomCode, problem }
kick_participant   { roomCode, name }
```

### Server → Client

```
room_joined          { room, participants, problems, leaderboard, timer }
participant_joined   { name, role }
participant_left     { name }
timer_tick           { timeRemaining, status }
timer_started        { duration, timeRemaining }
timer_paused         { timeRemaining }
timer_resumed        { timeRemaining }
contest_ended        { finalLeaderboard }
verdict              { submissionId, status, score, timeTaken }
leaderboard_update   { leaderboard: [{ name, score, solvedCount, lastAcceptedAt }] }
submission_update    { submissionId, participantName, problemTitle, status, score }
problem_added        { problem }
problem_updated      { problem }
violation_warning    { count, max }
kicked               { reason? }
```

---

## Code Execution Engine

### Safety Limits (enforced by Docker)

| Limit          | Value                                |
| -------------- | ------------------------------------ |
| Time limit     | 2 seconds (configurable per problem) |
| Memory limit   | 256 MB (configurable per problem)    |
| Network access | Disabled (`--network none`)          |
| File system    | Read‑write mount to temp dir only    |
| Process count  | Max 64 (`--pids-limit=64`)           |

### Execution Per Language

All compilation and execution happens inside Docker sandbox images that include the necessary compilers (no host tools needed).

```
C++        →  g++ -O2 solution.cpp -o solution && ./solution
C          →  gcc solution.c -o solution && ./solution
Java       →  javac Solution.java && java -Xmx200m -cp . Solution
Python     →  python3 solution.py
JavaScript →  node solution.js
```

### Verdict Meanings

| Verdict                       | Meaning                       |
| ----------------------------- | ----------------------------- |
| **AC** — Accepted             | All test cases passed         |
| **WA** — Wrong Answer         | Output didn't match expected  |
| **TLE** — Time Limit Exceeded | Took longer than allowed      |
| **RE** — Runtime Error        | Code crashed during execution |
| **CE** — Compilation Error    | Code didn't compile           |

---

## Project Structure

```
dojo/
│
├── frontend/                          # React + TypeScript
│   ├── public/
│   └── src/
│       ├── App.tsx                     # Root with error boundary and routes
│       ├── main.tsx
│       ├── index.css                   # Tailwind import
│       ├── pages/
│       │   ├── Home.tsx                # Landing page
│       │   ├── Auth.tsx                # Login + Register (combined)
│       │   ├── CreateRoom.tsx          # Host creates a new contest
│       │   ├── JoinRoom.tsx            # Enter name + role + code
│       │   ├── Room.tsx                # Room wrapper (socket, identity)
│       │   ├── HostRoom.tsx            # Host dashboard
│       │   ├── ParticipantRoom.tsx     # Participant coding environment
│       │   ├── ViewerRoom.tsx          # Observer view
│       │   └── PostContest.tsx         # Results and code review
│       ├── components/
│       │   ├── editor/
│       │   │   ├── CodeEditor.tsx      # Monaco editor wrapper
│       │   │   └── LanguageSelect.tsx
│       │   ├── leaderboard/
│       │   │   └── Leaderboard.tsx     # Live leaderboard
│       │   ├── problems/
│       │   │   ├── AddProblemModal.tsx # Host problem creation
│       │   │   ├── ProblemList.tsx
│       │   │   ├── ProblemView.tsx
│       │   │   └── SubmissionHistory.tsx
│       │   ├── room/
│       │   │   ├── LiveFeed.tsx        # Real‑time submission feed
│       │   │   ├── ParticipantList.tsx  # Room roster with kick
│       │   │   ├── RoomCodeShare.tsx
│       │   │   └── RoomHeader.tsx
│       │   └── timer/
│       │       └── Timer.tsx           # Countdown timer display
│       ├── hooks/
│       │   ├── useSocket.ts
│       │   ├── useTimer.ts
│       │   └── useLeaderboard.ts
│       ├── store/
│       │   ├── roomStore.ts            # Zustand — room state
│       │   ├── timerStore.ts
│       │   └── leaderboardStore.ts
│       ├── socket/
│       │   └── socket.ts               # Socket.io client setup
│       ├── lib/
│       │   └── api.ts                  # REST client (axios)
│       └── types/
│           └── index.ts
│
├── backend/                           # Node.js + Express + TypeScript
│   └── src/
│       ├── app.ts                      # Express app setup
│       ├── server.ts                   # HTTP server and socket initialization
│       ├── config/
│       │   ├── postgres.ts             # PostgreSQL pool
│       │   └── redis.ts                # Redis client
│       ├── controllers/
│       │   ├── auth.controller.ts
│       │   ├── problem.controller.ts
│       │   ├── room.controller.ts
│       │   ├── run.controller.ts
│       │   └── submission.controller.ts
│       ├── middleware/
│       │   └── auth.middleware.ts
│       ├── queue/
│       │   └── verdict.listener.ts     # Redis pub/sub verdict handler
│       ├── routes/
│       │   ├── auth.routes.ts
│       │   ├── problem.routes.ts
│       │   ├── room.routes.ts
│       │   ├── run.routes.ts
│       │   └── submission.routes.ts
│       ├── services/
│       │   ├── auth.service.ts
│       │   ├── leaderboard.service.ts
│       │   ├── problem.service.ts
│       │   ├── room.service.ts
│       │   ├── run.service.ts
│       │   └── submission.service.ts
│       ├── socket/
│       │   ├── index.ts                # Socket.io server setup
│       │   └── handlers/
│       │       ├── room.handlers.ts
│       │       ├── timer.handlers.ts
│       │       └── proctor.handlers.ts
│       └── types/
│           └── index.ts
│
├── judge/                             # Go — code execution service
│   ├── main.go
│   ├── config/
│   │   └── config.go
│   ├── runner/
│   │   └── runner.go                  # Compiles and runs code inside Docker
│   └── server/
│       └── server.go                  # HTTP /run and /submit endpoints
│
├── docker/
│   ├── docker-compose.yml             # Full local stack
│   └── sandbox/                       # Docker images per language
│       ├── cpp/Dockerfile
│       ├── c/Dockerfile
│       ├── java/Dockerfile
│       ├── python/Dockerfile
│       └── javascript/Dockerfile
│
├── db/
│   └── migrations/                    # PostgreSQL migrations
│       ├── 001_create_users.sql
│       ├── 002_create_rooms.sql
│       ├── 003_create_room_hosts.sql
│       ├── 004_create_problems.sql
│       ├── 005_create_test_cases.sql
│       ├── 006_create_submissions.sql
│       ├── 007_create_submission_results.sql
│       ├── 008_add_indexes.sql
│       └── 009_add_cascade_submissions.sql
│
├── scripts/
│   └── build-sandboxes.sh             # Build sandbox Docker images
│
├── .gitignore
└── README.md
```

---

## Getting Started

### Prerequisites

- Docker + Docker Compose
- Node.js 20+ (for local development of backend/frontend)
- Go 1.22+ (for local development of judge)

### Clone & Run

```bash
git clone https://github.com/yourusername/dojo.git
cd dojo

# Build sandbox images (required once)
sh scripts/build-sandboxes.sh

# Copy env files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Start the full stack
docker compose -f docker/docker-compose.yml up --build
```

That's it. Docker Compose spins up:

- PostgreSQL on `localhost:5433`
- Redis on `localhost:6379`
- Backend API on `http://localhost:4000`
- Judge service on `http://localhost:5001`
- Frontend on `http://localhost:5173`

Database migrations are automatically applied on first run.

---

## Environment Variables

### Backend (`backend/.env.example`)

```env
PORT=4000
DATABASE_URL=postgresql://dojo:dojo@postgres:5432/dojo
REDIS_URL=redis://redis:6379
JWT_SECRET=change-this-to-a-random-secret
JUDGE_URL=http://judge:5001
CORS_ORIGIN=http://localhost:5173
```

### Frontend (`frontend/.env.example`)

```env
VITE_API_URL=http://localhost:4000
VITE_SOCKET_URL=http://localhost:4000
```

### Judge (reads from environment)

```env
REDIS_URL=redis://redis:6379
```

The judge only needs Redis to publish verdicts. It has no PostgreSQL dependency.

---

## Roadmap

### v1.0 — Core (completed)

- [x] Architecture design
- [x] Database schema with indexes and cascades
- [x] Auth system (host accounts, JWT)
- [x] Room creation and join flow (lowercase 6‑char codes)
- [x] Problem and test case management
- [x] Code execution engine (Docker sandbox with internal compilation)
- [x] Direct HTTP submission flow (no external queue)
- [x] WebSocket layer (timer, leaderboard, live feed, proctoring)
- [x] Proctoring (fullscreen enforcement, violation warnings, auto‑kick)
- [x] Frontend UI (Monaco editor, leaderboard, timer, responsive design)
- [x] Post‑contest submission review and code audit
- [x] Recovery of stuck submissions

### v2.0 — Enhancements

- [ ] Leaderboard freeze + dramatic post‑contest reveal
- [ ] Per test case result visibility for participants
- [ ] Problem bank (save and reuse problems across rooms)
- [ ] Post‑contest analytics dashboard
- [ ] Plagiarism detection (MOSS integration)
- [ ] Live code replay for viewers
- [ ] In‑room chat
- [ ] Constraint helper in problem creation (dropdowns for bounds)
