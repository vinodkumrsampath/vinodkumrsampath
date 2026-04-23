# Verified — Dating App · Claude Code Guide

## What this project is

**Verified** is a dating app that solves three core problems found in apps like Tinder, Bumble, and Hinge:

1. **Fake/ghost profiles** — every user does email OTP + selfie verification; every profile photo is face-matched against their selfie
2. **Safety & harassment** — AI content moderation, reports, blocks, trusted contacts, safe-meeting check-ins, SOS
3. **Pay-to-win** — all features are free; revenue comes from ads; premium = ad-free only

---

## Monorepo layout

```
verified/
├── apps/
│   ├── web/          # Next.js 14 (App Router) — web client
│   └── mobile/       # Expo (React Native) — iOS + Android
├── packages/
│   ├── shared/       # Types, validators, constants shared by all apps
│   └── config/       # Base tsconfig.json and eslint config
├── server/           # Fastify API server
└── infrastructure/
    └── docker-compose.yml   # PostgreSQL + PostGIS + Redis
```

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend web | Next.js 14 (App Router), TypeScript, Tailwind CSS, Zustand, framer-motion |
| Frontend mobile | Expo 51, React Native, expo-router, react-native-reanimated |
| API server | Node.js, Fastify 4, Zod validation |
| Database | PostgreSQL 16 + PostGIS (geo queries) |
| Cache / queues | Redis + BullMQ |
| Real-time | Socket.io |
| Auth | JWT (access 15m + refresh 30d), email OTP via Nodemailer |
| File storage | Cloudflare R2 (S3-compatible, free 10 GB) |
| Face matching | face-api.js (TensorFlow.js — free, no third-party API) |
| Photo moderation | nsfwjs (free, runs in Node.js) |
| Text moderation | Hugging Face free inference API (toxic-bert), keyword fallback |
| Monorepo | Turborepo |

**Zero mandatory paid services** — the stack runs free locally and at small scale.

---

## Dev environment setup

### 1. Prerequisites
- Node.js ≥ 20
- Docker + Docker Compose

### 2. Start databases
```bash
docker compose -f infrastructure/docker-compose.yml up -d
```

### 3. Environment variables
```bash
cp .env.example .env
# Edit .env — minimum required:
#   DATABASE_URL, REDIS_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET
#   SMTP_HOST / SMTP_USER / SMTP_PASS  (Gmail SMTP works free)
```

### 4. Install and migrate
```bash
npm install
npm run db:migrate      # runs server/src/db/migrate.ts
```

### 5. Run all apps
```bash
npm run dev             # starts web (3000), server (3001), both via Turborepo
```

### 6. Mobile only
```bash
cd apps/mobile
npx expo start
```

---

## Key commands

| Command | What it does |
|---------|-------------|
| `npm run dev` | Start web + server in parallel (Turborepo) |
| `npm run build` | Build all packages and apps |
| `npm run db:migrate` | Apply pending SQL migrations in order |
| `npm run db:seed` | Seed test users (dev only) |
| `npm run lint` | TypeScript type-check all packages |

---

## Database schema overview

Migrations live in `server/src/db/migrations/` and run in filename order.

| Table | Purpose |
|-------|---------|
| `users` | Auth identity — email, password hash, role, `account_status`, `verification_level` |
| `profiles` | Dating profile — photos (JSONB), prompts (JSONB), PostGIS `location` |
| `verifications` | Per-user records for `email`, `selfie_capture` verification types |
| `email_otp` | Hashed OTPs with 10-min TTL |
| `refresh_tokens` | Hashed refresh tokens for JWT rotation |
| `swipes` | `like` / `pass` records, unique per pair |
| `matches` | Mutual likes — canonical ordering (`user_a_id < user_b_id`), 72h expiry |
| `messages` | Chat messages with `moderation_status` |
| `message_cooldowns` | 48h slow-match intro window |
| `reports` | User-submitted reports with evidence JSONB |
| `blocks` | Blocker / blocked pairs |
| `trusted_contacts` | Up to 3 emergency contacts per user |
| `safety_check_ins` | Safe-meeting check-ins with SOS status |
| `moderation_queue` | AI-scored content awaiting human review |
| `user_strikes` | 3 strikes → suspension |
| `subscriptions` | `free` / `premium` (ad-free) tiers |

---

## API surface

Base URL: `http://localhost:3001/api/v1`

### Auth — `/auth`
```
POST /auth/register              Body: { email, password }
POST /auth/login                 Body: { email, password }
POST /auth/refresh               Body: { refreshToken }
POST /auth/logout                Body: { refreshToken }
POST /auth/email/request-otp     (authenticated) — sends OTP to user's email
POST /auth/email/verify-otp      (authenticated) Body: { otp }
```

### Verification — `/verification`
```
GET  /verification/status             Current verification levels
POST /verification/selfie/upload-url  Get presigned R2 URL for selfie upload
POST /verification/selfie/confirm     Body: { key } — runs liveness check
POST /verification/photo/face-match   Body: { photoKey } — compares to reference selfie
```

### Profiles — `/profiles`
```
GET  /profiles/me                     Own profile
POST /profiles/me                     Create or update profile
POST /profiles/me/photos/upload-url   Get presigned URL for photo upload
POST /profiles/me/photos/confirm      Body: { key, photoId } — moderate + save photo
DELETE /profiles/me/photos/:photoId   Remove a photo
GET  /profiles/:userId                View another user's profile
```

### Discovery — `/discovery`
```
GET  /discovery/feed           Paginated proximity feed (requires verification_level = 'full')
POST /discovery/swipe          Body: { targetId, direction: 'like'|'pass' }
```

### Matches — `/matches`
```
GET  /matches                  All active + pending matches
GET  /matches/expired          Recently expired matches (last 7 days)
GET  /matches/:matchId         Single match detail
GET  /matches/:matchId/insights  Match score + reasons (transparent algorithm)
POST /matches/:matchId/unmatch   Body: { reason? }
```

### Messages — `/messages`
```
GET    /messages/:matchId              Message history (cursor paginated)
POST   /messages/:matchId             Body: { content, contentType, mediaUrl? }
PATCH  /messages/:messageId/read      Mark as read
DELETE /messages/:messageId           Soft-delete own message
GET    /messages/:matchId/starters    AI conversation starter suggestions
```

### Safety — `/safety`
```
POST   /safety/reports                  Body: { reportedId, reportType, description?, evidence? }
GET    /safety/reports                  My submitted reports
POST   /safety/blocks                   Body: { userId }
DELETE /safety/blocks/:userId           Unblock
GET    /safety/blocks                   My block list
POST   /safety/trusted-contacts         Body: { name, email }
DELETE /safety/trusted-contacts/:id     Remove contact
GET    /safety/trusted-contacts         List contacts
POST   /safety/check-ins                Body: { matchId?, meetingLocation?, meetingTime? }
POST   /safety/check-ins/:id/sos        Trigger SOS
GET    /safety/check-in/:token          Public status page (no auth — for trusted contact)
```

---

## WebSocket events (Socket.io)

Connect with `{ auth: { token: <accessToken> } }`.

### Client → Server
```
join_match_room     { matchId }
send_message        { matchId, content, contentType }
typing              { matchId }
read_messages       { matchId, upToMessageId }
```

### Server → Client
```
new_message         { message }
message_read        { matchId, readerId, readAt }
new_match           { match }
match_expired       { matchId }
user_typing         { matchId, userId }
```

---

## Verification flow

```
Register → email OTP sent automatically
  │
  ▼
POST /auth/email/verify-otp         verification_level: 'none' → 'email'
  │                                 account_status: 'pending_verification' → 'active'
  ▼
POST /verification/selfie/upload-url  → presigned R2 URL
  ↓  (client uploads JPEG directly to R2)
POST /verification/selfie/confirm   → face-api.js liveness check
  │                                 verification_level: 'email' → 'full'
  ▼
Profile photo uploads:
POST /verification/photo/face-match → face-api.js CompareFaces vs selfie
  score ≥ 0.90 → photo approved ✅
  score < 0.90 → photo rejected ❌
```

---

## Moderation pipeline

```
Image uploaded:
  → moderateImage() via nsfwjs
  → score < 0.30 : auto-approve
  → 0.30–0.95   : human review queue (content hidden)
  → score ≥ 0.95 : auto-remove + user strike

Text message sent:
  → moderateText() via Hugging Face toxic-bert (or keyword fallback)
  → flagged       : message saved with moderation_status='flagged'
  → score ≥ 0.95 : message blocked, never saved

3 strikes → account suspended
```

---

## Shared package constants

All tunable thresholds live in `packages/shared/src/constants/index.ts`:

```ts
MATCH_EXPIRY_HOURS = 72           // match auto-expires if no message
SLOW_MATCH_INTRO_HOURS = 48       // both must message within this window
FACE_MATCH_THRESHOLD = 0.90       // min similarity to approve a profile photo
MODERATION_AUTO_REMOVE_THRESHOLD = 0.95
MODERATION_HUMAN_REVIEW_THRESHOLD = 0.30
AD_CARD_FREQUENCY = 8             // inject ad card every N swipe cards
MAX_PROFILE_PHOTOS = 6
MIN_PROFILE_PHOTOS = 2
MAX_BIO_LENGTH = 500
OTP_EXPIRY_MINUTES = 10
```

---

## Key file paths

### Server
| Path | Description |
|------|-------------|
| `server/src/app.ts` | Fastify bootstrap, route registration, Socket.io, BullMQ |
| `server/src/config/env.ts` | All env vars with defaults — edit here to add new ones |
| `server/src/db/migrations/` | SQL migration files (run in filename order) |
| `server/src/routes/auth.ts` | Register, login, email OTP |
| `server/src/routes/verification.ts` | Selfie upload + face-match route |
| `server/src/routes/discovery.ts` | Feed (PostGIS radius query) + swipe + match creation |
| `server/src/routes/messages.ts` | CRUD + starters + moderation |
| `server/src/routes/safety.ts` | Reports, blocks, check-ins, SOS |
| `server/src/services/authService.ts` | OTP generation, token storage, bcrypt |
| `server/src/integrations/faceApiClient.ts` | face-api.js wrapper (compareFaces, detectLiveness) |
| `server/src/integrations/moderationClient.ts` | nsfwjs + Hugging Face text mod |
| `server/src/integrations/emailClient.ts` | Nodemailer — OTP email + safety alert email |
| `server/src/integrations/r2Client.ts` | Cloudflare R2 (presigned URLs, getObjectBuffer) |
| `server/src/workers/matchExpiryWorker.ts` | BullMQ — expires pending matches every 15 min |
| `server/src/websocket/socketServer.ts` | Socket.io real-time messaging |

### Web
| Path | Description |
|------|-------------|
| `apps/web/app/page.tsx` | Landing page |
| `apps/web/app/(auth)/register/page.tsx` | Registration form |
| `apps/web/app/(auth)/verify/page.tsx` | Verification wizard (OTP → selfie → success) |
| `apps/web/app/(app)/discover/page.tsx` | Discover feed page |
| `apps/web/app/(app)/messages/page.tsx` | Conversation list |
| `apps/web/app/(app)/messages/[matchId]/page.tsx` | Message thread |
| `apps/web/app/(app)/safety/page.tsx` | Safety center |
| `apps/web/components/verification/SelfieStep.tsx` | Camera selfie capture + upload |
| `apps/web/components/discover/SwipeCard.tsx` | Draggable swipe card (framer-motion) |
| `apps/web/components/discover/SwipeStack.tsx` | Card stack container |
| `apps/web/lib/api-client.ts` | Axios client with JWT auth + refresh |
| `apps/web/store/authStore.ts` | Zustand auth store (persisted) |
| `apps/web/hooks/useSocket.ts` | Socket.io connection hook |

### Mobile
| Path | Description |
|------|-------------|
| `apps/mobile/app/_layout.tsx` | Root layout (GestureHandlerRootView) |
| `apps/mobile/app/(tabs)/_layout.tsx` | Bottom tab navigator |
| `apps/mobile/app/(tabs)/discover.tsx` | Gesture swipe stack |
| `apps/mobile/app/(tabs)/messages.tsx` | Conversation list |
| `apps/mobile/app/(tabs)/profile.tsx` | Profile + logout |
| `apps/mobile/app/lib/api-client.ts` | Axios client (expo-secure-store for tokens) |
| `apps/mobile/app/store/authStore.ts` | Zustand auth store (SecureStore backed) |

### Shared
| Path | Description |
|------|-------------|
| `packages/shared/src/types/user.ts` | User, Profile, ProfilePhoto, Lifestyle types |
| `packages/shared/src/types/match.ts` | Match, Swipe, MatchWithProfile types |
| `packages/shared/src/types/message.ts` | Message, ConversationStarter, SocketEvents |
| `packages/shared/src/types/verification.ts` | Verification, VerificationState types |
| `packages/shared/src/types/report.ts` | Report, SafetyCheckIn types |
| `packages/shared/src/validators/profileValidator.ts` | validateBio, validateAge, getAge |
| `packages/shared/src/constants/index.ts` | All app-wide numeric constants |

---

## Coding conventions

- **TypeScript strict mode** everywhere — no `any` except at API boundaries
- **Zod** for all request body validation in server routes
- **No comments** unless the WHY is non-obvious (workaround, hidden invariant)
- **No feature flags** — just change the code
- Prefer editing existing files over creating new ones
- Server routes use `async/await` with Zod `.parse()` at the top — throw early
- DB queries use `query<T>()` / `queryOne<T>()` from `server/src/db/index.ts`
- Canonical match pair: always sort `[userAId, userBId]` before any DB insert/lookup

---

## Adding a new feature — checklist

1. If it needs a new table or column: add a new migration file `server/src/db/migrations/00N_description.sql`
2. If it adds new shared types: add to `packages/shared/src/types/`
3. Add a route file in `server/src/routes/` and register it in `server/src/app.ts`
4. Add the web screen in `apps/web/app/(app)/` (authenticated) or `apps/web/app/(auth)/`
5. Add the mobile screen in `apps/mobile/app/(tabs)/`
6. If real-time: add events to `server/src/websocket/socketServer.ts` and `useSocket.ts`

---

## Environment variable reference

See `.env.example` for full list. Required for local dev:

```
DATABASE_URL=postgresql://verified:verified_dev@localhost:5432/verified
REDIS_URL=redis://localhost:6379
JWT_ACCESS_SECRET=<32+ random chars>
JWT_REFRESH_SECRET=<32+ random chars>
SMTP_HOST / SMTP_USER / SMTP_PASS    # Gmail SMTP works free
```

Optional (app works without them, features degrade gracefully):
```
R2_ENDPOINT / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET   # photo storage
HUGGINGFACE_API_KEY                                                  # better text moderation
STRIPE_SECRET_KEY / STRIPE_PREMIUM_PRICE_ID                         # ad-free subscriptions
```
