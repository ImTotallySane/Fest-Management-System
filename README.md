# Fest Management System

A full-stack event management platform built for college fests. Handles everything from participant registration and merchandise purchases to organizer dashboards, team formation, and real-time event discussions — all under one roof.

---

## Tech Stack

### Backend
| Package | Why it's here |
|---|---|
| **Express.js v5** | Minimal, unopinionated — lets us structure routes exactly how we want without fighting the framework |
| **Mongoose** | Schema enforcement on top of MongoDB; makes model validation and population easy |
| **bcryptjs** | Password hashing — async, no native bindings, works anywhere |
| **jsonwebtoken** | Stateless JWT auth; tokens carry role info so middleware can gate routes without a DB hit |
| **Socket.IO** | Real-time bidirectional events for the discussion forum; WebSocket with automatic fallback |
| **Nodemailer** | Transactional email for tickets, team invites, and confirmation receipts |
| **qrcode** | Generates QR codes embedded in ticket emails |
| **multer** | Multipart form handling for payment proof image uploads |
| **dotenv** | Keeps secrets out of source control |
| **nodemon** | Auto-restarts the server during development |

### Frontend
| Package | Why it's here |
|---|---|
| **React 18** | Component model fits the multi-role dashboard layout cleanly |
| **React Router v7** | Declarative client-side routing with role-based protected routes |
| **Chakra UI v2** | Accessible component library with a dark-mode-friendly theme system; cuts boilerplate significantly compared to writing raw CSS for every modal and form |
| **Framer Motion** | Powers smooth page transitions and card animations without jank |
| **Axios** | HTTP client with interceptors — we attach the JWT header in one place instead of every fetch call |
| **Socket.IO Client** | Pairs with the backend Socket.IO server for live discussion updates |

---

## Project Structure

```
Fest-Management-System/
├── backend/
│   ├── config/         # DB connection, admin seed, mailer setup
│   ├── constants/      # Shared enums and config values
│   ├── middleware/     # JWT auth + role enforcement
│   ├── models/         # Mongoose schemas (User, Event, Registration, Team, Discussion, Feedback, PasswordResetRequest)
│   ├── routes/         # Express route handlers (auth, users, events, admin, teams, discussions, feedback)
│   ├── scripts/        # Utility/seed scripts
│   └── server.js       # Entry point, Socket.IO setup, route mounting
├── frontend/
│   └── src/
│       ├── components/ # Reusable UI pieces
│       ├── constants/  # API base URL, shared values
│       ├── pages/      # One file per page/view
│       └── utils/      # Helper functions
├── deployment.txt      # Live deployment URLs
└── README.md
```

---

## User Roles

The system has three roles. **Role switching is not allowed** — a user is locked to whichever role they signed up with.

- **Participant** — IIIT students or external attendees. Register for events, buy merch, form teams, follow clubs, join discussions.
- **Organizer** — Clubs, councils, fest teams. Provisioned by the Admin (no self-registration). Create and manage events, view analytics, moderate discussions.
- **Admin** — Single system-level account seeded on first boot. Manages organizer accounts and handles password reset requests.

---

## Local Setup

### Prerequisites
- Node.js >= 18
- A MongoDB Atlas cluster (or local MongoDB)
- A Gmail account (or any SMTP) for Nodemailer

### 1. Clone and install

```bash
git clone <repo-url>
cd Fest-Management-System

# backend
cd backend
npm install

# frontend (separate terminal)
cd ../frontend
npm install
```

### 2. Configure environment variables

Create `backend/.env`:

```env
PORT=5000
MONGO_URI=<your-mongodb-connection-string>
JWT_SECRET=<a-long-random-string>

# Nodemailer (Gmail example)
MAIL_USER=<your-email@gmail.com>
MAIL_PASS=<your-app-password>

# Admin seed credentials
ADMIN_EMAIL=<admin@example.com>
ADMIN_PASSWORD=<secure-password>
```

### 3. Run

```bash
# backend (from /backend)
npm run dev

# frontend (from /frontend)
npm start
```

Frontend runs on `http://localhost:3000`, backend on `http://localhost:5000`.

On first boot the server seeds an Admin account using the credentials in `.env` — use those to log in as Admin.

---

## Features

### Authentication & Security
- IIIT participants must register with an `@iiit.ac.in` / `@students.iiit.ac.in` / `@research.iiit.ac.in` email — validated server-side, not just client-side
- Passwords hashed with bcrypt (salt rounds: 10)
- JWT tokens expire after 5 days; stored in localStorage and attached to every request via an Axios interceptor
- All non-auth routes are protected by middleware that checks token validity and enforces role access

### Participant Features
- Dashboard showing upcoming registered events and participation history (tabs: Normal / Merchandise / Completed / Cancelled)
- Browse events with partial + fuzzy search, filters by type/eligibility/date range/followed clubs, and a trending section (top 5 in last 24h)
- Event detail page with registration/purchase button — blocks if deadline passed or slots exhausted
- Post-signup onboarding to set interests and follow organizers; these influence event ordering
- Profile page — edit name, contact number, college; password change with old-password verification
- Clubs/Organizers listing with follow/unfollow

### Organizer Features
- Dashboard carousel of all events (Draft -> Published -> Ongoing -> Closed) with quick links to detail pages
- Event creation flow: Draft -> add required fields -> Publish
- Edit rules per status: free edits on Draft, description/deadline/limit updates on Published, status-only changes on Ongoing/Completed
- Dynamic form builder for custom registration fields (text, dropdown, checkbox, file upload); fields lock once the first registration comes in
- Per-event analytics: registrations, attendance, revenue, team completion
- Participant list with search/filter and CSV export
- Discord webhook on profile to auto-post new events
- Organizer password reset requests sent to Admin for approval

### Admin Features
- Create organizer accounts — system auto-generates a unique `@clubs.iiit.ac.in` email and a random password, then surfaces both so Admin can share them
- Disable or permanently delete organizers (cascade-deletes all their events, registrations, teams, discussions, and feedback)
- Review and approve/reject organizer password reset requests; on approval, a new random password is generated and returned to Admin

---

## Advanced Features Implemented

This section documents the Tier A, B, and C choices as required.

### Tier A — Hackathon Team Registration *(8 marks)*

Team-based event registration where a participant creates a team, sets a size, and shares an invite code. Other participants join using the code. Registration completes automatically once the team is full — at that point the system:

1. Creates a `Registration` document for every accepted team member
2. Generates a unique `ticketId` and QR code string per member
3. Fires off a ticket email to each member via Nodemailer

Teams can be left (by members) or deleted (by the leader) before completion. Once complete, the team is locked. The team management page lets participants track pending members and copy the invite code.

**Design decision**: We dropped the original pending-invite flow in favour of direct join-via-code with immediate acceptance. This removes an unnecessary approval step and made the UX noticeably simpler for hackathon-style fast signups.

---

### Tier B — Real-Time Discussion Forum *(6 marks)*

A live discussion board lives on every event's detail page. Implemented with Socket.IO rooms — each event is a room (`event:<id>`), and the frontend joins/leaves on mount/unmount.

What's supported:
- Post new discussion threads (registered participants and the event organizer only)
- Threaded replies on any post
- Reactions: like / helpful / agree (toggle; one per user per post)
- Organizer moderation: pin posts (float to top), hide posts (soft-delete from participant view)
- All state changes broadcast instantly to everyone in the room via `discussion:new`, `discussion:reply`, `discussion:updated`, and `discussion:hidden` events

**Design decision**: We re-fetch with full Mongoose `.populate()` before emitting, so the socket payload already has author names resolved. This means the client doesn't need to do a follow-up HTTP request after receiving a socket event.

---

### Tier B — Organizer Password Reset Workflow *(6 marks)*

Organizers cannot reset their own passwords directly. The flow:

1. Organizer submits a reset request (club name, date, reason) from their profile page
2. Request appears in the Admin dashboard with status `pending`
3. Admin approves or rejects with an optional comment
4. On approval, a cryptographically random 16-char hex password is generated, hashed, and saved; the plain-text version is returned to Admin to share manually
5. Request history is preserved (Pending / Approved / Rejected) for audit purposes

---

### Tier C — Anonymous Feedback System *(2 marks)*

After an event, registered participants can submit a star rating (1–5) plus an optional text comment. Feedback is always stored with `isAnonymous: true` — the organizer view shows aggregated stats (total ratings, average, filterable comment list) but never exposes individual identities.

Guards in place: only registered participants can submit, one submission per event per user, and submission is blocked before the event runs.

---

## Deployment

| Layer | Platform |
|---|---|
| Frontend | Vercel |
| Backend | Render |
| Database | MongoDB Atlas |

Live URLs are recorded in `deployment.txt` at the project root.

---

## API Overview

| Prefix | Handles |
|---|---|
| `/api/auth` | Register, login, add-organizer (admin), change-password |
| `/api/users` | Profile read/update, follow/unfollow clubs, interests |
| `/api/events` | CRUD events, registration, merchandise, analytics, search |
| `/api/teams` | Create, join, leave, delete teams |
| `/api/discussions` | Post, reply, react, pin, hide |
| `/api/feedback` | Submit and view (organizer) anonymous feedback |
| `/api/admin` | Organizer management, password reset requests |
