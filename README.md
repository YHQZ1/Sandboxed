# Dojo

A live competitive coding platform built for recruiting competitive programmers.

![React](https://img.shields.io/badge/React-TypeScript-61DAFB?style=flat-square&logo=react&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=flat-square&logo=node.js&logoColor=white)
![Go](https://img.shields.io/badge/Go-Judge%20Service-00ADD8?style=flat-square&logo=go&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-Real--time-010101?style=flat-square&logo=socket.io&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-Cache%20%7C%20Pub%2FSub-DC382D?style=flat-square&logo=redis&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Sandbox-2496ED?style=flat-square&logo=docker&logoColor=white)

---

## Table of Contents

- [What is Dojo?](#what-is-dojo)
- [Architecture](#architecture)
- [Services](#services)
- [Contest Flow](#contest-flow)
- [Tech Stack](#tech-stack)
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

Dojo is a self-hosted, invite-only coding contest platform built for recruiting competitive programmers. Instead of sending candidates to LeetCode or HackerRank, you run your own contest on your own platform — with your own problems, your own rules, and full visibility into every submission.

A host creates a room and gets a 6-character room code to share. Candidates join as participants, co-recruiters join as hosts, and anyone else can watch as a viewer. The host posts problems, starts a timer, and watches the live leaderboard update in real time as participants submit code.

After the contest, hosts can review every submission, every test case result, and every line of code each candidate wrote.

| Role        | Can Code | On Leaderboard | Can Manage Room | Needs Account |
| ----------- | -------- | -------------- | --------------- | ------------- |
| Host        | No       | No             | Yes             | Yes           |
| Participant | Yes      | Yes            | No              | No            |
| Viewer      | No       | No             | No              | No            |

Participants and viewers are sessionless — no account required. Their identity within a room is their name + room code, stored in Redis for the duration of the contest.

---

## Architecture

Dojo runs as three independently deployed processes: a React frontend, a Node.js backend, and a Go judge service. The backend is the central coordinator — it owns the REST API, the WebSocket layer, and all state in PostgreSQL and Redis. The judge service is a stateless HTTP worker that receives submissions, executes them in isolated Docker containers, and publishes verdicts back via Redis Pub/Sub.

```
+------------------------------------------+
|            React Frontend                |
|   Monaco Editor · Socket.io client       |
+----------------+---------------+---------+
                 | REST          | WebSocket
                 v               v
+------------------------------------------+
|      Node.js + Express + TypeScript      |
|    Auth · Rooms · Problems · Socket      |
+-----------+------------------------------+
            |                  |
            v                  v
+----------------+    +--------------------+
|  PostgreSQL    |    |       Redis        |
|  (Persistent)  |    | Room State · Timer |
|                |    | Cache · Pub/Sub    |
+----------------+    +--------+-----------+
                               |
                     HTTP /submit
                               v
                      +------------------+
                      |  Judge Service   |
                      |      (Go)        |
                      |  Docker Sandbox  |
                      +--------+---------+
                               |
                     Verdict via Redis Pub/Sub
                               v
                      +------------------+
                      |    Backend       |
                      | verdict.listener |
                      +--------+---------+
                               |
                     WebSocket push to room
                               v
                      +------------------+
                      |    Frontend      |
                      +------------------+
```

### Submission Flow

1. Participant clicks Submit
2. `POST /api/submissions` — backend receives code, language, and problemId
3. Backend validates participant is in room, room is active, and problem not already solved
4. Backend saves submission to PostgreSQL with status `queued`
5. Backend sends `HTTP POST` to judge service at `/submit` with all test cases
6. Backend immediately returns `{ submissionId, status: "queued" }` to frontend
7. Judge processes asynchronously — runs code in a Docker container per test case, enforces time and memory limits
8. Judge publishes verdict to Redis Pub/Sub channel `pubsub:verdict`
9. Backend `verdict.listener` picks it up, updates PostgreSQL, updates Redis leaderboard
10. Backend pushes verdict to the participant and broadcasts the updated leaderboard to the room via WebSocket

### Proctoring Flow

During an active contest, participants are required to stay in fullscreen. Tab switches and window blurs emit a `proctor_violation` event via WebSocket. The backend increments a violation counter in Redis (TTL 1 hour). On the fourth violation the participant is kicked — removed from the participant list and their frontend receives a `kicked` event.

---

## Services

### Backend — Node.js + Express + TypeScript `:4000`

The central coordinator. Owns authentication, room lifecycle, problem management, the WebSocket hub, and all state across PostgreSQL and Redis.

- JWT-based auth for host accounts
- Room creation, join validation, and participant management
- Timer state stored in Redis and controlled entirely via WebSocket — no REST endpoints
- Subscribes to `pubsub:verdict` and fans results out to connected clients

### Judge Service — Go `:5001`

A stateless HTTP worker. Receives a submission payload (code, language, test cases, limits), compiles and runs the code inside a Docker sandbox per test case, and publishes the verdict to Redis. Has no PostgreSQL dependency.

- Supports C++, C, Java, Python, JavaScript
- All compilation happens inside the sandbox image — no host compilers required
- Time limit, memory limit, network access, and process count enforced via Docker flags

---

## Contest Flow

```
Host creates room
      |
Gets room code -> shares with candidates (Participant),
                  co-recruiters (Host), observers (Viewer)
      |
Everyone joins -> picks name + role + enters code
      |
Host posts problems with test cases
      |
Host starts timer
      |
Participants write and submit code
      |
Judge sandboxes and executes code against all test cases
      |
Verdict returned -> leaderboard updates live for everyone
      |
Timer ends -> room locked -> no more submissions
      |
Hosts review every candidate's code and results
```

---

## Tech Stack

### Frontend

| Technology         | Purpose                                                    |
| ------------------ | ---------------------------------------------------------- |
| React + TypeScript | UI framework, fully typed                                  |
| Monaco Editor      | VS Code's editor — syntax highlighting for all 5 languages |
| Socket.io Client   | Real-time leaderboard, timer, room events                  |
| TailwindCSS        | Utility-first styling                                      |
| Zustand            | Global state — room, timer, leaderboard                    |

### Backend

| Technology                     | Purpose                                          |
| ------------------------------ | ------------------------------------------------ |
| Node.js + Express + TypeScript | Main API server                                  |
| Socket.io                      | WebSocket server                                 |
| Redis Pub/Sub                  | Verdict broadcasting from judge to backend       |
| Redis (hashes, sorted sets)    | Room state, timer, leaderboard, participant list |
| JWT + bcrypt                   | Authentication for host accounts                 |

### Judge

| Technology | Purpose                                |
| ---------- | -------------------------------------- |
| Go         | Fast, concurrent HTTP server           |
| Docker CLI | Isolated sandbox per submission        |
| Redis      | Publishing verdicts to Pub/Sub channel |

### Infrastructure

| Technology     | Purpose                                  |
| -------------- | ---------------------------------------- |
| PostgreSQL     | All persistent data                      |
| Redis          | Room state, timer, leaderboard cache     |
| Docker Compose | Runs entire stack locally in one command |
| Docker         | Sandbox containers for code execution    |

---

## Database Schema

### `users`

Host accounts only. Participants and viewers are sessionless.

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
  code             VARCHAR(20) UNIQUE NOT NULL,
  name             VARCHAR(255) NOT NULL,
  created_by       UUID REFERENCES users(id),
  status           VARCHAR(20) DEFAULT 'waiting', -- waiting | active | paused | ended
  timer_duration   INTEGER,
  timer_started_at TIMESTAMP,
  timer_elapsed    INTEGER DEFAULT 0,
  created_at       TIMESTAMP DEFAULT NOW()
);
```

### `room_hosts`

Tracks which host accounts are co-hosting a room.

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
  time_limit     INTEGER DEFAULT 2,    -- seconds
  memory_limit   INTEGER DEFAULT 256,  -- MB
  order_index    INTEGER DEFAULT 0,
  created_at     TIMESTAMP DEFAULT NOW()
);
```

### `test_cases`

```sql
CREATE TABLE test_cases (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id      UUID REFERENCES problems(id) ON DELETE CASCADE,
  input           TEXT NOT NULL,
  expected_output TEXT NOT NULL,
  is_sample       BOOLEAN DEFAULT FALSE,
  order_index     INTEGER DEFAULT 0
);
```

`is_sample = TRUE` cases are visible to participants. Hidden cases are judge-only.

### `submissions`

```sql
CREATE TABLE submissions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id          UUID REFERENCES rooms(id) ON DELETE CASCADE,
  problem_id       UUID REFERENCES problems(id),
  participant_name VARCHAR(100) NOT NULL,
  language         VARCHAR(20) NOT NULL,  -- cpp | c | java | python | javascript
  code             TEXT NOT NULL,
  status           VARCHAR(30) DEFAULT 'queued',
  score            INTEGER DEFAULT 0,
  time_taken       INTEGER,
  memory_used      INTEGER,
  submitted_at     TIMESTAMP DEFAULT NOW()
);
```

Statuses: `queued` → `judging` → `accepted` | `wrong_answer` | `tle` | `runtime_error` | `compilation_error`

### `submission_results`

Per-test-case results. Lets hosts see exactly where a candidate failed.

```sql
CREATE TABLE submission_results (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id  UUID REFERENCES submissions(id) ON DELETE CASCADE,
  test_case_id   UUID REFERENCES test_cases(id),
  status         VARCHAR(30) NOT NULL,
  time_taken     INTEGER,
  memory_used    INTEGER,
  actual_output  TEXT
);
```

### Redis Keys

```
room:{code}:participants        Hash   -> { name: { role, joinedAt } }
room:{code}:timer               Hash   -> { duration, startedAt, elapsed, status }
room:{code}:leaderboard         ZSet   -> participant JSON sorted by score (tiebreak by time)
room:{code}:leaderboard:meta    Hash   -> per-participant solved count, last accepted time
room:{code}:solved              Set    -> submission IDs (prevents double scoring)
room:{code}:violations:{name}   String -> violation counter (TTL 1 hour)
pubsub:verdict                  PubSub -> channel from judge to backend
```

### Scoring

First accepted submission for a problem awards full points. Subsequent accepted submissions for the same problem score nothing, enforced by the Redis solved set. Wrong answers score 0 and are tracked as attempts.

Leaderboard ranking: total points descending, tiebroken by total time of accepted submissions ascending.

---

## API Design

### Auth

```
POST  /api/auth/register    Create host account
POST  /api/auth/login       Login, receive JWT
GET   /api/auth/me          Get current host profile
```

### Rooms

```
POST    /api/rooms                              Create a new contest room (auth required)
GET     /api/rooms/:code                        Get room details by code
POST    /api/rooms/:code/join                   Join a room (host requires JWT)
DELETE  /api/rooms/:code/participants/:name     Kick participant (host only)
```

Timer is controlled exclusively via WebSocket — no REST endpoints.

### Problems

```
GET     /api/rooms/:code/problems                           List problems
POST    /api/rooms/:code/problems                           Create a problem (host only)
PUT     /api/rooms/:code/problems/:id                       Update a problem (host only)
DELETE  /api/rooms/:code/problems/:id                       Delete a problem (host only)
POST    /api/rooms/:code/problems/:id/testcases             Add test case (host only)
DELETE  /api/rooms/:code/problems/:id/testcases/:tcId       Delete test case (host only)
```

### Submissions

```
POST  /api/submissions                        Submit code for judging
GET   /api/submissions/:id                    Get verdict and full submission details
GET   /api/rooms/:code/submissions            All submissions in a room (host only)
GET   /api/rooms/:code/submissions/:name      All submissions by a participant
```

### Run

```
POST  /api/run    Execute code against sample input only (does not affect leaderboard)
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

All compilation and execution happens inside disposable Docker sandbox images. No host compilers are required.

| Language   | Execution                                             |
| ---------- | ----------------------------------------------------- |
| C++        | `g++ -O2 solution.cpp -o solution && ./solution`      |
| C          | `gcc solution.c -o solution && ./solution`            |
| Java       | `javac Solution.java && java -Xmx200m -cp . Solution` |
| Python     | `python3 solution.py`                                 |
| JavaScript | `node solution.js`                                    |

### Safety Limits

| Limit          | Value                             |
| -------------- | --------------------------------- |
| Time limit     | 2s (configurable per problem)     |
| Memory limit   | 256 MB (configurable per problem) |
| Network access | Disabled (`--network none`)       |
| Process count  | Max 64 (`--pids-limit=64`)        |

### Verdicts

| Verdict | Meaning                       |
| ------- | ----------------------------- |
| AC      | All test cases passed         |
| WA      | Output didn't match expected  |
| TLE     | Took longer than the limit    |
| RE      | Code crashed during execution |
| CE      | Code didn't compile           |

---

## Project Structure

```
dojo/
|
+-- frontend/
|   +-- src/
|       +-- pages/
|       |   +-- Home.tsx
|       |   +-- Auth.tsx
|       |   +-- CreateRoom.tsx
|       |   +-- JoinRoom.tsx
|       |   +-- Room.tsx               # Room wrapper (socket, identity)
|       |   +-- HostRoom.tsx
|       |   +-- ParticipantRoom.tsx
|       |   +-- ViewerRoom.tsx
|       |   +-- PostContest.tsx
|       +-- components/
|       |   +-- editor/                # Monaco editor wrapper, language select
|       |   +-- leaderboard/           # Live leaderboard
|       |   +-- problems/              # Problem view, add modal, submission history
|       |   +-- room/                  # Live feed, participant list, room header
|       |   +-- timer/                 # Countdown timer display
|       +-- hooks/
|       |   +-- useSocket.ts
|       |   +-- useTimer.ts
|       |   +-- useLeaderboard.ts
|       +-- store/                     # Zustand -- room, timer, leaderboard
|       +-- socket/                    # Socket.io client setup
|       +-- lib/
|       |   +-- api.ts                 # REST client (axios)
|       |   +-- device.ts
|       +-- types/
|
+-- backend/
|   +-- src/
|       +-- app.ts
|       +-- server.ts                  # HTTP server and socket initialization
|       +-- config/
|       |   +-- postgres.ts
|       |   +-- redis.ts
|       +-- controllers/               # auth, problem, room, run, submission
|       +-- middleware/
|       |   +-- auth.middleware.ts
|       +-- queue/
|       |   +-- submission.queue.ts
|       |   +-- verdict.listener.ts    # Redis Pub/Sub verdict handler
|       +-- routes/                    # auth, problem, room, run, submission
|       +-- services/                  # auth, leaderboard, problem, room, run, submission
|       +-- socket/
|       |   +-- index.ts
|       |   +-- handlers/              # room, timer, proctor handlers
|       +-- types/
|
+-- judge/                             # Go
|   +-- main.go
|   +-- config/
|   |   +-- config.go
|   +-- runner/
|   |   +-- runner.go                  # Compiles and runs code inside Docker
|   +-- server/
|       +-- server.go                  # HTTP /run and /submit endpoints
|
+-- docker/
|   +-- docker-compose.yml
|   +-- sandbox/                       # Dockerfile per language
|       +-- cpp/ c/ java/ python/ javascript/
|
+-- db/
|   +-- migrations/                    # 9 SQL migration files
|
+-- scripts/
    +-- build-sandboxes.sh             # Build sandbox Docker images
```

---

## Getting Started

### Prerequisites

- Docker + Docker Compose
- Node.js 20+
- Go 1.22+

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

Docker Compose spins up:

- PostgreSQL on `localhost:5433`
- Redis on `localhost:6379`
- Backend API on `http://localhost:4000`
- Judge service on `http://localhost:5001`
- Frontend on `http://localhost:5173`

Database migrations are applied automatically on first run.

---

## Environment Variables

### Backend (`backend/.env`)

```env
PORT=4000
DATABASE_URL=postgresql://dojo:dojo@postgres:5432/dojo
REDIS_URL=redis://redis:6379
JWT_SECRET=change-this-to-a-random-secret
JUDGE_URL=http://judge:5001
CORS_ORIGIN=http://localhost:5173
```

### Frontend (`frontend/.env`)

```env
VITE_API_URL=http://localhost:4000
VITE_SOCKET_URL=http://localhost:4000
```

### Judge

```env
REDIS_URL=redis://redis:6379
```

The judge has no PostgreSQL dependency — it only needs Redis to publish verdicts.

---

## Roadmap

### v1.0 — Core (completed)

- [x] Database schema with indexes and cascades
- [x] Auth system (host accounts, JWT)
- [x] Room creation and join flow
- [x] Problem and test case management
- [x] Code execution engine (Docker sandbox with internal compilation)
- [x] Direct HTTP submission flow
- [x] WebSocket layer (timer, leaderboard, live feed, proctoring)
- [x] Proctoring (fullscreen enforcement, violation warnings, auto-kick)
- [x] Frontend UI (Monaco editor, leaderboard, timer)
- [x] Post-contest submission review and code audit

### v2.0 — Enhancements

- [ ] Leaderboard freeze + post-contest reveal
- [ ] Per-test-case result visibility for participants
- [ ] Problem bank (save and reuse problems across rooms)
- [ ] Post-contest analytics dashboard
- [ ] Plagiarism detection (MOSS integration)
- [ ] Live code replay for viewers
- [ ] In-room chat
