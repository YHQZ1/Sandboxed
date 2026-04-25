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

A host creates a room, gets a short room code, and shares it. Candidates join as participants, co-recruiters join as hosts, and anyone else can watch as a viewer. The host posts problems, starts a timer, and watches the live leaderboard update in real time as participants submit code.

After the contest, hosts can review every submission, every test case result, and every line of code each candidate wrote.

---

## Features

### For Hosts

- Create a contest room and get a shareable room code (e.g. `STORM-4821`)
- Multiple hosts supported — co-recruiters can join the same room as a host
- Post problems with visible sample test cases and hidden judge test cases
- Control the contest timer — start, pause, resume, and end
- View all participant submissions, code, and per-test-case results post-contest
- Remove participants or viewers from the room
- Set point values, time limits, and memory limits per problem

### For Participants

- Join via room code with just a name — no account needed
- Read problems and write code in the built-in Monaco Editor
- Run code against visible sample test cases before submitting
- Submit for full judging against all hidden test cases
- Receive live verdicts — AC, WA, TLE, RE, CE
- Appear on the live leaderboard

### For Viewers (Spectators)

- Join via room code as a read-only observer
- Watch the live leaderboard update in real time
- See contest progress without being able to submit

### Supported Languages

| Language   | Compile                   | Run                   |
| ---------- | ------------------------- | --------------------- |
| C++        | `g++ solution.cpp -o sol` | `./sol`               |
| C          | `gcc solution.c -o sol`   | `./sol`               |
| Java       | `javac Solution.java`     | `java Solution`       |
| Python     | —                         | `python3 solution.py` |
| JavaScript | —                         | `node solution.js`    |

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
Gets room code → shares with candidates (Participant)
                  co-recruiters (Host) and observers (Viewer)
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

| Technology             | Purpose                                                    |
| ---------------------- | ---------------------------------------------------------- |
| **React + TypeScript** | UI framework, fully typed                                  |
| **Monaco Editor**      | VS Code's editor — syntax highlighting for all 5 languages |
| **Socket.io Client**   | Real-time leaderboard, timer, room events                  |
| **TailwindCSS**        | Styling                                                    |
| **Zustand**            | Global state — room state, timer, leaderboard              |
| **React Query**        | REST data fetching and caching                             |

### Backend

| Technology                         | Purpose                                              |
| ---------------------------------- | ---------------------------------------------------- |
| **Node.js + Express + TypeScript** | Main API server                                      |
| **Socket.io**                      | WebSocket server — real-time events                  |
| **Bull + Redis**                   | Submission job queue                                 |
| **Redis Pub/Sub**                  | Event broadcasting between backend and judge service |
| **JWT + bcrypt**                   | Authentication for host accounts                     |

### Judge Service

| Technology  | Purpose                                  |
| ----------- | ---------------------------------------- |
| **Go**      | Fast, concurrent job worker              |
| **Docker**  | Isolated sandbox per submission          |
| **Isolate** | Fine-grained CPU, memory, process limits |

### Database

| Technology     | Purpose                                                  |
| -------------- | -------------------------------------------------------- |
| **PostgreSQL** | All persistent data                                      |
| **Redis**      | Room state, timer, leaderboard cache, job queue, pub/sub |

### Infrastructure

| Technology         | Purpose                                  |
| ------------------ | ---------------------------------------- |
| **Docker Compose** | Runs entire stack locally in one command |
| **Nginx**          | Reverse proxy in production              |

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
│ (Persistent │    │ (Queue, PubSub,  │
│   Storage)  │    │  Room State,     │
└─────────────┘    │  Timer, Cache)   │
                   └────────┬─────────┘
                            │ Bull Queue
                            ▼
                   ┌──────────────────┐
                   │  Judge Service   │
                   │      (Go)        │
                   └────────┬─────────┘
                            │
                            ▼
                   ┌──────────────────┐
                   │ Docker + Isolate │
                   │ (Code Execution) │
                   └────────┬─────────┘
                            │ Verdict
                            ▼
                   PostgreSQL + Redis PubSub
                            │
                            ▼
                   WebSocket push to room
```

### Submission Flow (Step by Step)

```
1. Participant clicks Submit
2. POST /api/submit → Backend receives code + language + problemId
3. Backend saves submission to PostgreSQL with status: "queued"
4. Backend pushes job to Bull queue in Redis
5. Backend immediately returns { submissionId, status: "judging" } to frontend
6. Frontend shows "Judging..." state
7. Go worker picks up job from queue
8. Worker spins up Docker container with language image
9. Compiles code if needed (C, C++, Java)
10. For each test case:
    - Pipes input via stdin
    - Captures stdout
    - Enforces time limit (2s) and memory limit (256MB)
    - Compares output to expected output
    - Stores result in submission_results table
11. Final verdict written to submissions table
12. Go worker publishes verdict to Redis Pub/Sub
13. Backend picks up Pub/Sub event
14. Backend pushes verdict via WebSocket to the participant
15. Backend updates leaderboard in Redis sorted set
16. Backend broadcasts leaderboard update to entire room via WebSocket
```

### Timer Flow

```
Host clicks Start →
  Backend stores { duration, startedAt, elapsed: 0 } in Redis
  Backend begins server-side interval
  Every second → broadcasts { timeRemaining } via WebSocket to all room members

Host clicks Pause →
  Backend calculates elapsed = now - startedAt + previousElapsed
  Stores elapsed in Redis, clears interval, broadcasts paused state

Host clicks Resume →
  Backend recalculates startedAt = now
  Resumes interval with remaining = duration - elapsed

Timer hits 0 →
  Backend sets room status = "ended" in PostgreSQL
  Broadcasts contest_ended event to all room members
  No more submissions accepted
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
  code             VARCHAR(20) UNIQUE NOT NULL,   -- e.g. STORM-4821
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
  room_id          UUID REFERENCES rooms(id),
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
room:{code}:leaderboard      ZSet   → participant name scored by points (tiebreak by time)
submission:queue             Bull   → job queue for judge service
pubsub:verdict               PubSub → channel from judge → backend
```

### Relationships

```
users
  └── creates ──────────────→ rooms
                                ├── has many ──→ room_hosts (co-hosts)
                                ├── has many ──→ problems
                                │                 └── has many → test_cases
                                └── has many ──→ submissions
                                                  └── has many → submission_results
```

### Scoring Logic

- First accepted submission for a problem → full points awarded
- Subsequent accepted submissions for same problem → no additional points
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
POST   /api/auth/logout          Invalidate token
GET    /api/auth/me              Get current host profile
```

### Rooms

```
POST   /api/rooms                Create a new contest room
GET    /api/rooms/:code          Get room details by code
POST   /api/rooms/:code/join     Join a room (name + role + code)
DELETE /api/rooms/:code          End and delete a room (host only)
POST   /api/rooms/:code/timer/start    Start the timer
POST   /api/rooms/:code/timer/pause    Pause the timer
POST   /api/rooms/:code/timer/resume   Resume the timer
```

### Problems

```
GET    /api/rooms/:code/problems            List all problems in a room
POST   /api/rooms/:code/problems            Create a problem (host only)
PUT    /api/rooms/:code/problems/:id        Update a problem (host only)
DELETE /api/rooms/:code/problems/:id        Delete a problem (host only)
POST   /api/rooms/:code/problems/:id/testcases    Add test case
DELETE /api/rooms/:code/problems/:id/testcases/:tcId  Delete test case
```

### Submissions

```
POST   /api/submit               Submit code for judging
GET    /api/submissions/:id      Get verdict for a submission
GET    /api/rooms/:code/submissions            All submissions in a room (host only)
GET    /api/rooms/:code/submissions/:name      All submissions by a participant (host only)
```

---

## WebSocket Events

### Client → Server

```
join_room          { roomCode, name, role }
leave_room         { roomCode }
```

### Server → Client

```
room_joined        { room, participants, problems, leaderboard, timer }
participant_joined { name, role }
participant_left   { name }
timer_tick         { timeRemaining, status }
timer_started      { duration, timeRemaining }
timer_paused       { timeRemaining }
timer_resumed      { timeRemaining }
contest_ended      { finalLeaderboard }
verdict            { submissionId, status, score, timeRemaining }
leaderboard_update { leaderboard: [{ name, score, solvedCount, lastAcceptedAt }] }
problem_added      { problem }
problem_updated    { problem }
```

---

## Code Execution Engine

### Safety Limits (enforced by Isolate)

| Limit              | Value                                |
| ------------------ | ------------------------------------ |
| Time limit         | 2 seconds (configurable per problem) |
| Memory limit       | 256 MB (configurable per problem)    |
| Network access     | Disabled                             |
| File system writes | Restricted to temp working dir only  |
| Process count      | Max 1 (no fork bombs)                |

### Execution Per Language

```
C++        →  g++ solution.cpp -o sol -O2  →  ./sol
C          →  gcc solution.c -o sol         →  ./sol
Java       →  javac Solution.java           →  java -Xmx256m Solution
Python     →  (no compile)                 →  python3 solution.py
JavaScript →  (no compile)                 →  node solution.js
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
│       ├── pages/
│       │   ├── Home.tsx               # Landing — create or join room
│       │   ├── CreateRoom.tsx         # Host creates a new contest
│       │   ├── JoinRoom.tsx           # Enter name + role + code
│       │   └── Room.tsx               # Main contest room
│       ├── components/
│       │   ├── editor/
│       │   │   ├── CodeEditor.tsx     # Monaco editor wrapper
│       │   │   └── LanguageSelect.tsx
│       │   ├── leaderboard/
│       │   │   └── Leaderboard.tsx    # Live leaderboard
│       │   ├── problems/
│       │   │   ├── ProblemList.tsx
│       │   │   └── ProblemView.tsx
│       │   ├── room/
│       │   │   ├── RoomHeader.tsx
│       │   │   └── ParticipantList.tsx
│       │   └── timer/
│       │       └── Timer.tsx          # Countdown timer
│       ├── hooks/
│       │   ├── useSocket.ts
│       │   ├── useTimer.ts
│       │   └── useLeaderboard.ts
│       ├── store/
│       │   ├── roomStore.ts           # Zustand — room state
│       │   ├── timerStore.ts
│       │   └── leaderboardStore.ts
│       ├── socket/
│       │   └── socket.ts              # Socket.io client setup
│       ├── lib/
│       │   └── api.ts                 # REST client (React Query)
│       └── types/
│           └── index.ts               # Shared TypeScript types
│
├── backend/                           # Node.js + Express + TypeScript
│   └── src/
│       ├── routes/
│       │   ├── auth.ts
│       │   ├── rooms.ts
│       │   ├── problems.ts
│       │   └── submissions.ts
│       ├── controllers/
│       │   ├── authController.ts
│       │   ├── roomController.ts
│       │   ├── problemController.ts
│       │   └── submissionController.ts
│       ├── services/
│       │   ├── roomService.ts
│       │   ├── timerService.ts
│       │   ├── leaderboardService.ts
│       │   └── submissionService.ts
│       ├── socket/
│       │   ├── index.ts               # Socket.io server setup
│       │   └── handlers/
│       │       ├── roomHandlers.ts
│       │       └── timerHandlers.ts
│       ├── queue/
│       │   ├── submissionQueue.ts     # Bull queue setup
│       │   └── verdictListener.ts    # Redis pub/sub listener
│       ├── middleware/
│       │   ├── auth.ts               # JWT verification
│       │   └── validate.ts
│       ├── config/
│       │   ├── db.ts                 # PostgreSQL connection
│       │   └── redis.ts              # Redis connection
│       └── types/
│           └── index.ts
│
├── judge/                             # Go — code execution worker
│   ├── worker/
│   │   └── worker.go                 # Pulls jobs from Bull queue
│   ├── sandbox/
│   │   └── sandbox.go                # Docker + Isolate management
│   ├── runner/
│   │   └── runner.go                 # Compiles and runs code
│   └── config/
│       └── config.go
│
├── docker/
│   ├── sandbox/                       # Docker images per language
│   │   ├── cpp/Dockerfile
│   │   ├── c/Dockerfile
│   │   ├── java/Dockerfile
│   │   ├── python/Dockerfile
│   │   └── javascript/Dockerfile
│   └── docker-compose.yml            # Full local stack
│
└── db/
    └── migrations/                   # PostgreSQL migrations
        ├── 001_create_users.sql
        ├── 002_create_rooms.sql
        ├── 003_create_room_hosts.sql
        ├── 004_create_problems.sql
        ├── 005_create_test_cases.sql
        ├── 006_create_submissions.sql
        └── 007_create_submission_results.sql
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

# Copy env files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Start everything
docker-compose up --build
```

That's it. Docker Compose spins up:

- Frontend on `http://localhost:3000`
- Backend API on `http://localhost:4000`
- PostgreSQL on port `5432`
- Redis on port `6379`
- Judge service connected to Docker socket

---

## Environment Variables

### Backend (`backend/.env`)

```env
PORT=4000
DATABASE_URL=postgresql://dojo:dojo@postgres:5432/dojo
REDIS_URL=redis://redis:6379
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d
JUDGE_QUEUE_NAME=submissions
NODE_ENV=development
```

### Frontend (`frontend/.env`)

```env
VITE_API_URL=http://localhost:4000
VITE_SOCKET_URL=http://localhost:4000
```

### Judge (`judge/config/.env`)

```env
REDIS_URL=redis://redis:6379
POSTGRES_URL=postgresql://dojo:dojo@postgres:5432/dojo
JUDGE_QUEUE_NAME=submissions
VERDICT_PUBSUB_CHANNEL=pubsub:verdict
DOCKER_SOCKET=/var/run/docker.sock
```

---

## Roadmap

### v1.0 — Core (current scope)

- [x] Architecture design
- [x] Database schema
- [ ] Auth system (host accounts, JWT)
- [ ] Room creation and join flow
- [ ] Problem and test case management
- [ ] Code execution engine (Docker + Isolate)
- [ ] Submission queue and verdict flow
- [ ] WebSocket layer (timer, leaderboard, room events)
- [ ] Frontend UI (Monaco editor, leaderboard, timer)
- [ ] Post-contest submission review for hosts

### v2.0 — Enhancements

- [ ] Leaderboard freeze + dramatic post-contest reveal
- [ ] Per test case result visibility for participants
- [ ] Problem bank (save and reuse problems)
- [ ] Post-contest analytics dashboard
- [ ] Plagiarism detection (MOSS integration)
- [ ] Live code replay for viewers
- [ ] In-room chat
- [ ] Emoji reactions for viewers

---

## License

MIT

---

> Built for finding the sharpest competitive programmers — on your terms, on your platform.
