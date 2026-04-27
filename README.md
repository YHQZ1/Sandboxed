<div align="center">

# Sandboxed

**A self-hosted competitive coding platform built for recruiting programmers.**

Run your own contests. Judge code in real time. Find your best.

![React](https://img.shields.io/badge/React-TypeScript-61DAFB?style=flat-square&logo=react&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=flat-square&logo=node.js&logoColor=white)
![Go](https://img.shields.io/badge/Go-Judge%20Service-00ADD8?style=flat-square&logo=go&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-Real--time-010101?style=flat-square&logo=socket.io&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-Cache%20%7C%20Pub%2FSub-DC382D?style=flat-square&logo=redis&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Sandbox-2496ED?style=flat-square&logo=docker&logoColor=white)

</div>

---

## Table of Contents

- [What is Sandboxed?](#what-is-sandboxed)
- [Features](#features)
- [Architecture](#architecture)
- [Services](#services)
- [Contest Flow](#contest-flow)
- [Tech Stack](#tech-stack)
- [Database Schema](#database-schema)
- [API Design](#api-design)
- [WebSocket Events](#websocket-events)
- [Code Execution Engine](#code-execution-engine)
- [Proctoring System](#proctoring-system)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Roadmap](#roadmap)

---

## What is Sandboxed?

Sandboxed is a self-hosted, invite-only coding contest platform built for recruiting competitive programmers. Instead of sending candidates to LeetCode or HackerRank, you run your own contest on your own platform — with your own problems, your own rules, and full visibility into every submission.

A host creates a room and gets a unique room code to share. Candidates join as participants, co-recruiters join as hosts, and anyone else can watch as a viewer. The host posts problems, starts a timer, and watches the live leaderboard update in real time as participants submit code.

After the contest, hosts can review every submission, every test case result, and every line of code each candidate wrote.

---

## Features

### For Hosts

- Create a contest room and get a shareable room code
- Multiple hosts supported — co-recruiters can join as hosts
- Post problems with visible sample test cases and hidden judge test cases
- Control the contest timer — start, pause, resume, end early
- Live submission feed — see every submission and verdict in real time
- Kick participants from the room
- View full post-contest breakdown — submission matrix, per-candidate code audit

### For Participants

- Join via room code with just a name — no account needed
- Read problems and write code in a built-in Monaco Editor (VS Code's editor)
- Run code against visible sample test cases before submitting
- Submit for full judging against all hidden test cases
- Receive live verdicts — AC, WA, TLE, RE, CE
- Appear on the live leaderboard
- Proctored environment — fullscreen enforced, violations tracked, auto-kick on 4 violations

### For Viewers

- Join via room code as a read-only observer
- Watch the live leaderboard update in real time
- Read problems without being able to submit

### Supported Languages

| Language   | Execution                                        |
| ---------- | ------------------------------------------------ |
| C++        | `g++ -O2 solution.cpp -o solution && ./solution` |
| C          | `gcc solution.c -o solution && ./solution`       |
| Java       | `javac Solution.java && java -Xmx200m Solution`  |
| Python     | `python3 solution.py`                            |
| JavaScript | `node solution.js`                               |

All compilation and execution happens inside disposable Docker sandbox images. No host compilers required.

---

## Roles

| Role        | Can Code | On Leaderboard | Can Manage Room | Needs Account |
| ----------- | -------- | -------------- | --------------- | ------------- |
| Host        | No       | No             | Yes             | Yes           |
| Participant | Yes      | Yes            | No              | No            |
| Viewer      | No       | No             | No              | No            |

Participants and viewers are sessionless — no account required. Their identity within a room is their name + room code, stored in Redis for the duration of the contest.

---

## Architecture

Sandboxed runs as three independently deployed processes: a React frontend, a Node.js backend, and a Go judge service. The backend is the central coordinator — it owns the REST API, the WebSocket layer, and all state in PostgreSQL and Redis. The judge service is a stateless HTTP worker that receives submissions, executes them in isolated Docker containers, and publishes verdicts back via Redis Pub/Sub.

```

+------------------------------------------+
| React Frontend |
| Monaco Editor · Socket.io client |
+----------------+---------------+---------+
| REST | WebSocket
v v
+------------------------------------------+
| Node.js + Express + TypeScript |
| Auth · Rooms · Problems · Socket |
+-----------+------------------------------+
| |
v v
+----------------+ +--------------------+
| PostgreSQL | | Redis |
| (Persistent) | | Room State · Timer |
| | | Cache · Pub/Sub |
+----------------+ +--------+-----------+
|
HTTP /submit
v
+------------------+
| Judge Service |
| (Go) |
| Docker Sandbox |
+--------+---------+
|
Verdict via Redis Pub/Sub
v
+------------------+
| Backend |
| verdict.listener |
+--------+---------+
|
WebSocket push to room
v
+------------------+
| Frontend |
+------------------+

```

### Submission Flow

1. Participant clicks Submit
2. `POST /api/submissions` — backend receives code, language, and problemId
3. Backend validates participant is in room, room is active, and problem not already solved
4. Backend saves submission to PostgreSQL with status `queued`
5. Backend sends `HTTP POST` to judge service at `/submit` with all test cases
6. Backend immediately returns `{ submissionId, status: "queued" }` to frontend
7. Judge processes asynchronously — spins up a Docker container, compiles if needed, runs each test case, enforces time and memory limits
8. Judge publishes verdict to Redis Pub/Sub channel `pubsub:verdict`
9. Backend `verdict.listener` picks it up, updates PostgreSQL, updates Redis leaderboard
10. Backend pushes verdict to the participant and broadcasts the updated leaderboard to the entire room via WebSocket

### Timer Flow

```

Host clicks Start -> server-side interval begins, ticking every second
timer state stored in Redis, SQL set to "active"
every second -> timer_tick broadcast to entire room

Host clicks Pause -> elapsed time calculated and stored in Redis
interval cleared, SQL status set to "paused"

Host clicks Resume -> recalculates startedAt, resumes interval
Redis and SQL updated to "active"

Timer hits 0 (or Host ends early)
-> interval cleared, room status set to "ended"
final leaderboard fetched and broadcast
no more submissions accepted

```

---

## Services

### Backend — Node.js + Express + TypeScript `:4000`

The central coordinator. Owns authentication, room lifecycle, problem management, the WebSocket hub, and all state across PostgreSQL and Redis.

- JWT-based auth for host accounts
- Room creation, join validation, and participant management
- Timer state stored in Redis and controlled entirely via WebSocket events — no REST endpoints for timer
- Subscribes to `pubsub:verdict` and fans results out to connected clients via WebSocket
- Proctoring violation tracking with auto-kick on threshold breach

### Judge Service — Go `:5001`

A stateless HTTP worker. Receives a submission payload (code, language, test cases, limits), compiles and runs the code inside a Docker sandbox per test case, and publishes the verdict to Redis. Has no PostgreSQL dependency.

- Supports C++, C, Java, Python, JavaScript
- All compilation happens inside the sandbox image — no host compilers required
- Time limit, memory limit, network access, and process count enforced via Docker flags
- Exposes `/submit` for full judging and `/run` for sample test execution

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
Host posts problems with visible sample + hidden judge test cases
|
Host starts timer
|
Participants write code, run against samples, then submit
|
Judge sandboxes and executes code against all hidden test cases
|
Verdict returned -> leaderboard updates live for everyone in the room
|
Timer ends (or host ends early) -> room locked -> no more submissions
|
Hosts review every candidate's submissions, code, and per-test-case results

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
| React Router       | Client-side routing                                        |
| Axios              | REST client                                                |

### Backend

| Technology                     | Purpose                                          |
| ------------------------------ | ------------------------------------------------ |
| Node.js + Express + TypeScript | Main API server                                  |
| Socket.io                      | WebSocket server — real-time events              |
| Redis Pub/Sub                  | Verdict broadcasting from judge to backend       |
| Redis (hashes, sorted sets)    | Room state, timer, leaderboard, participant list |
| PostgreSQL                     | All persistent data                              |
| JWT + bcrypt                   | Authentication for host accounts                 |

### Judge

| Technology | Purpose                                   |
| ---------- | ----------------------------------------- |
| Go         | Fast, concurrent HTTP server              |
| Docker CLI | Isolated sandbox container per submission |
| Redis      | Publishing verdicts to Pub/Sub channel    |

### Infrastructure

| Technology     | Purpose                                    |
| -------------- | ------------------------------------------ |
| Docker Compose | Runs entire stack locally in one command   |
| Docker         | Sandbox containers for safe code execution |

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

`is_sample = TRUE` cases are visible to participants. Hidden cases are judge-only and never exposed to the frontend.

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
  time_taken       INTEGER,               -- ms, slowest passing test case
  memory_used      INTEGER,               -- MB
  submitted_at     TIMESTAMP DEFAULT NOW()
);
```

Status transitions: `queued` → `judging` → `accepted` | `wrong_answer` | `tle` | `runtime_error` | `compilation_error`

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
room:{code}:participants        Hash    -> { name: { role, joinedAt } }
room:{code}:timer               Hash    -> { duration, startedAt, elapsed, status }
room:{code}:leaderboard         ZSet    -> participant JSON sorted by score (tiebreak by time)
room:{code}:leaderboard:meta    Hash    -> per-participant solved count, last accepted time
room:{code}:solved              Set     -> problem IDs solved per participant (prevents double scoring)
room:{code}:violations:{name}   String  -> violation counter (TTL 1 hour)
pubsub:verdict                  PubSub  -> channel from judge to backend
```

### Scoring

First accepted submission for a problem awards full points. Subsequent accepted submissions for the same problem score nothing, enforced by the Redis solved set. Wrong answers score 0 and are tracked as attempts.

Leaderboard ranking: total points descending, tiebroken by total time of accepted submissions ascending (faster wins).

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

> Timer is controlled exclusively via WebSocket events — no REST endpoints.

### Problems

```
GET     /api/rooms/:code/problems                           List problems (sample test cases only for participants)
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
GET   /api/rooms/:code/submissions/:name      All submissions by a specific participant
```

### Run

```
POST  /api/run    Execute code against a single input — does not affect leaderboard or DB
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
verdict              { submissionId, status, score, timeTaken, problemId }
leaderboard_update   { leaderboard: [{ name, score, solvedCount, lastAcceptedAt }] }
submission_update    { submissionId, participantName, problemTitle, status, score }
problem_added        { problem }
problem_updated      { problem }
violation_warning    { count, max }
kicked               { reason? }
```

---

## Code Execution Engine

All compilation and execution happens inside disposable Docker sandbox images. No host compilers are required. Each submission gets its own container, destroyed immediately after execution.

### Safety Limits

| Limit          | Value                               |
| -------------- | ----------------------------------- |
| Time limit     | 2s (configurable per problem)       |
| Memory limit   | 256 MB (configurable per problem)   |
| Network access | Disabled (`--network none`)         |
| Process count  | Max 64 (`--pids-limit=64`)          |
| Filesystem     | Read-write to temp working dir only |

### Verdicts

| Verdict | Meaning                       |
| ------- | ----------------------------- |
| AC      | All test cases passed         |
| WA      | Output didn't match expected  |
| TLE     | Took longer than the limit    |
| RE      | Code crashed during execution |
| CE      | Code didn't compile           |

---

## Proctoring System

During an active contest, participants are subject to the following controls:

- **Fullscreen enforced** — participants must stay in fullscreen. Exiting triggers a warning overlay and requires re-entry.
- **Tab switch detection** — switching tabs or hiding the window emits a `proctor_violation` event.
- **Window blur detection** — losing window focus emits a `proctor_violation` event.
- **DevTools blocked** — `F12`, `Ctrl+Shift+I/J/C/K`, `Ctrl+U`, and Mac equivalents are intercepted.
- **Copy/paste disabled** — all clipboard shortcuts blocked everywhere including inside the editor. Right click disabled. Drag and drop blocked.
- **Text selection disabled** — `user-select: none` applied across the entire contest interface.
- **DevTools size detection** — window dimension ratio checked every 3 seconds to detect docked DevTools.
- **Violation counter** — each violation increments a Redis counter (TTL 1 hour). The participant is shown a warning with their current count. On the 4th violation they are automatically kicked and receive a `kicked` WebSocket event.

---

## Project Structure

```
sandboxed/
|
+-- frontend/
|   +-- src/
|       +-- pages/
|       |   +-- Home.tsx               # Landing page
|       |   +-- Auth.tsx               # Login + Register
|       |   +-- CreateRoom.tsx         # Host creates a contest
|       |   +-- JoinRoom.tsx           # Enter name + role + code
|       |   +-- Room.tsx               # Room wrapper (socket, identity, role router)
|       |   +-- HostRoom.tsx           # Host management dashboard
|       |   +-- ParticipantRoom.tsx    # Participant coding environment
|       |   +-- ViewerRoom.tsx         # Observer view
|       |   +-- PostContest.tsx        # Results and code review
|       +-- components/
|       |   +-- editor/                # Monaco editor wrapper, language select
|       |   +-- leaderboard/           # Live leaderboard
|       |   +-- problems/              # Problem view, add modal, submission history
|       |   +-- room/                  # Live feed, participant list, room header, code share
|       |   +-- timer/                 # Countdown timer display
|       +-- hooks/
|       |   +-- useSocket.ts           # WebSocket event wiring
|       |   +-- useTimer.ts
|       |   +-- useLeaderboard.ts
|       +-- store/                     # Zustand -- room, timer, leaderboard state
|       +-- socket/                    # Socket.io client setup
|       +-- lib/
|       |   +-- api.ts                 # REST client (axios)
|       +-- types/                     # Shared TypeScript interfaces
|
+-- backend/
|   +-- src/
|       +-- app.ts                     # Express app, middleware, routes
|       +-- server.ts                  # HTTP server and socket initialization
|       +-- config/
|       |   +-- postgres.ts            # PostgreSQL pool
|       |   +-- redis.ts               # Redis client
|       +-- controllers/               # auth, problem, room, run, submission
|       +-- middleware/
|       |   +-- auth.middleware.ts     # JWT verification
|       +-- queue/
|       |   +-- verdict.listener.ts    # Redis Pub/Sub verdict handler
|       +-- routes/                    # auth, problem, room, run, submission
|       +-- services/                  # auth, leaderboard, problem, room, run, submission
|       +-- socket/
|       |   +-- index.ts               # Socket.io server setup
|       |   +-- handlers/              # room, timer, proctor event handlers
|       +-- types/                     # Shared TypeScript interfaces
|
+-- judge/                             # Go judge service
|   +-- main.go
|   +-- config/
|   |   +-- config.go
|   +-- runner/
|   |   +-- runner.go                  # Compiles and runs code inside Docker containers
|   +-- server/
|       +-- server.go                  # HTTP /run and /submit endpoints
|
+-- docker/
|   +-- docker-compose.yml             # Full local stack
|   +-- sandbox/                       # One Dockerfile per language
|       +-- cpp/
|       +-- c/
|       +-- java/
|       +-- python/
|       +-- javascript/
|
+-- db/
|   +-- migrations/                    # 9 ordered SQL migration files
|
+-- scripts/
    +-- build-sandboxes.sh             # Builds all sandbox Docker images
```

---

## Getting Started

### Prerequisites

- Docker + Docker Compose
- Node.js 20+
- Go 1.22+

### Clone & Run

```bash
git clone https://github.com/yourusername/sandboxed.git
cd sandboxed

# Build sandbox images (required once — pulls base images and installs compilers)
sh scripts/build-sandboxes.sh

# Copy env files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Start the full stack
docker compose -f docker/docker-compose.yml up --build
```

Docker Compose starts:

| Service     | URL                   |
| ----------- | --------------------- |
| Frontend    | http://localhost:5173 |
| Backend API | http://localhost:4000 |
| Judge       | http://localhost:5001 |
| PostgreSQL  | localhost:5433        |
| Redis       | localhost:6379        |

Database migrations are applied automatically on first run.

### First Run Checklist

1. Register a host account at `/auth`
2. Create a contest room — you get a room code
3. Share the code with participants (`/join`)
4. Add problems and test cases from the host dashboard
5. Start the timer — the contest begins
6. Review results at `/results/:code` after the contest ends

---

## Environment Variables

### Backend (`backend/.env`)

```env
PORT=4000
DATABASE_URL=postgresql://sandboxed:sandboxed@postgres:5432/sandboxed
REDIS_URL=redis://redis:6379
JWT_SECRET=change-this-to-a-long-random-secret
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

### v1.0 — Core

- [x] Auth system (host accounts, JWT)
- [x] Room creation and join flow with role-based access
- [x] Problem and test case management
- [x] Sandboxed code execution (Docker, 5 languages, compile + run inside container)
- [x] Real-time WebSocket layer — timer, leaderboard, live feed, room events
- [x] Proctoring system — fullscreen, violation tracking, auto-kick, copy/paste disabled
- [x] Run against sample test cases before submitting
- [x] Post-contest submission review and per-candidate code audit
- [x] Session persistence on page refresh
- [x] Multi-host support
- [x] Deployment via Docker Compose

### v2.0 — Enhancements

- [ ] Leaderboard freeze + dramatic post-contest reveal
- [ ] Per-test-case result visibility for participants after verdict
- [ ] Problem bank — save and reuse problems across rooms
- [ ] Post-contest analytics dashboard
- [ ] Plagiarism detection (MOSS integration)
- [ ] Live code replay for viewers
- [ ] In-room chat

---

<div align="center">

Built for finding the sharpest competitive programmers — on your terms, on your platform.

</div>
