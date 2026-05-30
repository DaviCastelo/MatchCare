# MatchCare — Design Spec
**Date:** 2026-05-30  
**Status:** Approved  
**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind CSS · shadcn/ui · Supabase · next-intl · Vercel

---

## 1. Overview

MatchCare automates the matching of ABA therapists with autistic child clients, replacing a manual spreadsheet process. The system enforces clinical compatibility rules, scheduling constraints, and family preferences through a rule-based matching engine.

**Supabase project:** `matchcare` — id: `pcugkjrocilpvutvsfot` — region: `sa-east-1`

---

## 2. User Roles

| Role | Access |
|---|---|
| Admin | Full access; uses Match Tool; approves therapists; manages session changes |
| Therapist | Own profile + schedule + notifications; self-registers (pending Admin approval) |
| Parent | Child's profile + schedule + notifications; can cancel sessions with justification |

### Registration & Approval
- **Parents:** self-register or Admin-created; immediate access after email verification
- **Therapists:** self-register → `approved=false` → Admin approves/rejects → notification sent
- **Rejected therapist:** can log in but sees `/pending-approval` screen; middleware blocks all `/therapist/*` routes

---

## 3. Project Structure

```
D:\MatchCare\
├── app/
│   ├── actions/                # Server Actions by domain
│   │   ├── clients.ts
│   │   ├── therapists.ts
│   │   ├── sessions.ts
│   │   ├── match.ts            # fetches data, filters capacity, calls engine
│   │   └── notifications.ts
│   └── [locale]/
│       ├── (auth)/             # /login, /register, /pending-approval
│       ├── (admin)/            # /admin/*
│       ├── (therapist)/        # /therapist/*
│       └── (parent)/           # /parent/*
├── lib/
│   ├── matching/
│   │   ├── engine.ts           # findEligibleTherapists, generateWeeklySchedule
│   │   └── rules.ts            # hardRules[], computeScore(), computeOverlappingSlots()
│   ├── supabase/
│   │   ├── client.ts           # browser client
│   │   └── server.ts           # server client (service role key)
│   └── types/
│       ├── client.ts
│       ├── therapist.ts
│       ├── session.ts
│       └── matching.ts         # MatchOutput, MatchResult, DisqualifiedEntry, ScheduleResult, MatchFlag
├── components/
│   ├── ui/                     # shadcn/ui components
│   └── app/                    # domain components
├── messages/                   # en.json | pt-BR.json | es.json
└── supabase/
    └── migrations/             # versioned SQL migrations
```

---

## 4. Database Schema

### `profiles`
```sql
id                  uuid PK  -- = auth.users.id
role                enum('admin','therapist','parent')
full_name           text
preferred_language  text DEFAULT 'en'
approved            boolean DEFAULT false  -- only relevant for role='therapist'; admins and parents are set to true on creation
created_at          timestamptz
```

### `therapists`
```sql
id                          uuid PK → profiles.id
email                       text UNIQUE
phone                       text
years_of_experience         numeric
professional_score          int CHECK (1–9)
city                        text
language                    text
last_score_review_date      date
score_reviewer_supervisor   text
notes                       text
```

### `clients`
```sql
id                          uuid PK
parent_id                   uuid → profiles.id
full_name                   text
parent_phone                text
behavior_score              int CHECK (1–9)
score_description           text
age                         int
sex                         enum('Male','Female')
language                    text
city                        text
preferred_session_location  enum('Clinic','School','Home')
health_insurance            text
notes                       text
created_by                  uuid → profiles.id
created_at                  timestamptz
```

### `therapist_availability`
```sql
id            uuid PK
therapist_id  uuid REFERENCES therapists(id) ON DELETE CASCADE
day_of_week   int  -- 0=Sun … 6=Sat
start_time    time
end_time      time
```

### `client_availability`
```sql
id          uuid PK
client_id   uuid REFERENCES clients(id) ON DELETE CASCADE
day_of_week int
start_time  time
end_time    time
```

### `sessions`
```sql
id                uuid PK
client_id         uuid → clients.id
therapist_id      uuid → therapists.id
location          enum('Clinic','School','Home')
day_of_week       int
start_time        time
end_time          time
status            enum('active','cancelled','rescheduled')
recurrence_start  date
recurrence_end    date nullable
change_reason     enum('parent_complaint','therapist_resignation','new_client','availability_change') nullable
changed_at        timestamptz nullable
changed_by        uuid nullable → profiles.id
```
> Audit columns (`change_reason`, `changed_at`, `changed_by`) are write-once — no UPDATE via RLS.

### `session_exceptions`
```sql
id              uuid PK
session_id      uuid → sessions.id
exception_date  date
type            enum('cancellation','reschedule')
new_date        date nullable        -- null when type='cancellation'
new_start_time  time nullable
new_end_time    time nullable
reason          text                 -- required
requested_by    uuid → profiles.id
created_at      timestamptz
```

### `session_change_requests`
```sql
id            uuid PK
session_id    uuid → sessions.id
reason        enum('parent_complaint','therapist_resignation','new_client','availability_change')
requested_by  uuid → profiles.id
reviewed_by   uuid → profiles.id
status        enum('pending','approved','rejected')
notes         text
created_at    timestamptz
reviewed_at   timestamptz
```

### `notifications`
```sql
id          uuid PK
user_id     uuid → profiles.id
type        text   -- 'session_cancelled' | 'match_assigned' | 'schedule_changed' | 'approval_result'
payload     jsonb
read        boolean DEFAULT false
created_at  timestamptz
```

### `therapist_approval_requests`
```sql
id            uuid PK
therapist_id  uuid → profiles.id
status        enum('pending','approved','rejected')
reviewed_by   uuid → profiles.id
reviewed_at   timestamptz
created_at    timestamptz
```

### RLS Policies
- Therapists: read/write own rows only
- Parents: read/write rows linked to their `parent_id`
- Admins: full access via service role key (Server Actions only)
- Audit columns in `sessions`: INSERT only, no UPDATE

---

## 5. Clinic Operating Hours

| Day | Hours |
|---|---|
| Monday–Friday | 09:00–19:00 |
| Saturday | 09:30–14:30 |
| Sunday | 10:00–14:00 |

---

## 6. Session Rules

- Client: **12 hours/week** — either 3×4h or 4×3h (minimum 3h per session)
- Therapist: **15 hours/week**
- Home sessions: therapist must be in the same city as client
- All sessions must fall within clinic operating hours

---

## 7. Matching Engine

### Location: `lib/matching/`

```typescript
// engine.ts
export function findEligibleTherapists(
  client: Client,
  therapists: Therapist[]  // pre-filtered for weekly capacity by Server Action
): MatchOutput

export function generateWeeklySchedule(
  client: Client,
  therapist: Therapist,
  slots: Slot[]
): ScheduleResult
```

```typescript
// types/matching.ts
type MatchRuleName = 'scoreCompatibility' | 'cityMatch' | 'availabilityOverlap'

type MatchFlag = 'GENDER_SENSITIVITY_WARNING'

type Slot = {
  day_of_week: number   // 0=Sun … 6=Sat
  start_time:  string   // 'HH:MM'
  end_time:    string
}

type WeeklySchedule = Slot[]  // 3 or 4 sessions totalling 12h

type MatchOutput = {
  eligible:     MatchResult[]
  disqualified: DisqualifiedEntry[]
}

type MatchResult = {
  therapist:        Therapist
  score:            number
  overlappingSlots: Slot[]
  flags:            MatchFlag[]
  // proposedSchedule is NOT included here — generateWeeklySchedule is called
  // lazily by the Server Action only when admin selects a specific therapist
}

type DisqualifiedEntry = {
  therapist:  Therapist
  failedRule: MatchRuleName
}

type ScheduleResult =
  | { ok: true;  schedule: WeeklySchedule }
  | { ok: false; reason: 'insufficient_hours' | 'no_valid_slots' | 'clinic_hours_conflict' }
```

### Hard Rules (eliminate therapist if any fails)

| Rule | Logic |
|---|---|
| `scoreCompatibility` | Therapist score ≥5 → client score ≥5; therapist score <5 → client score 1–5 |
| `cityMatch` | Same city required for Home sessions; preferred for Clinic/School |
| `availabilityOverlap` | Overlapping slots must total ≥3h within clinic operating hours |

### Soft Rules (affect ordering only)

| Rule | Effect |
|---|---|
| `languageMatch` | +10 pts if languages match |
| `cityMatchPreferred` | +15 pts for same city (Clinic/School) |
| `hoursAvailable` | Proportional pts based on overlapping hours |
| `genderSensitivity` | Adds `GENDER_SENSITIVITY_WARNING` flag — non-blocking |

### Schedule Generation
- Prefer 3×4h; fallback to 4×3h
- All slots within clinic hours
- Returns `ScheduleResult` — never returns null silently

### Server Action Responsibilities (`app/actions/match.ts`)
1. Fetch therapists + their availability
2. Fetch active sessions → compute remaining weekly hours per therapist
3. Filter out therapists at capacity before calling engine
4. Call `findEligibleTherapists` with filtered list → returns `MatchOutput`
5. UI shows eligible therapist cards (score, slots, flags) — no schedule generated yet
6. When Admin clicks a specific therapist card: call `generateWeeklySchedule` for that therapist only → return `ScheduleResult`
7. On Admin confirmation: re-verify availability (optimistic lock) → insert sessions or return conflict error

---

## 8. Business Flows

### Therapist Approval
```
/register → profile (approved=false) + therapist_approval_request (pending)
  → Admin sees pending badge on dashboard
  → Admin approves/rejects
  → profile.approved updated
  → notification sent to therapist
  → if rejected: therapist can log in but sees /pending-approval, all /therapist/* blocked
  → if approved: therapist enters /therapist/schedule
      → if therapist_availability.count = 0:
          redirect to /therapist/profile with banner:
          "Complete your availability to start receiving sessions"
```

### Matching (Admin)
```
/admin/match
  Step 1: Admin selects client
  Step 2: Server Action filters capacity + calls engine → MatchOutput
  Step 3: UI shows eligible therapist cards with proposed schedule pre-generated
           Gender sensitivity flag → yellow banner (non-blocking)
  Step 4: Admin clicks therapist → sees proposed WeeklySchedule
           If { ok: false, reason } → clear error message shown
  Step 5: Admin confirms → Server Action re-verifies availability (optimistic lock)
           If conflict → error, no session created
           If clear → creates session records + notifications to therapist + parent
```

### Cancellation (Asymmetric)
```
Parent:
  → Cancels any single session freely
  → Provides reason (required)
  → Creates session_exception { type: 'cancellation', reason }
  → Notification sent to assigned therapist

Therapist:
  → Cannot cancel sessions directly
  → Creates session_change_request { reason: 'therapist_resignation' }
  → Admin approves/rejects
  → If approved: Admin redoes matching
  → Notification sent to parent
```

### Structural Schedule Change (Admin)
```
/admin/schedule-change
  → Admin selects recurring session
  → Chooses one of 4 valid reasons
  → Proposes new recurring schedule
  → Admin confirms → sessions updated with change_reason + changed_by + changed_at
  → Audit columns are immutable after write
  → Notifications sent to therapist + parent
```

---

## 9. Pages

### Public
- `/login`
- `/register`
- `/pending-approval` — therapist rejected/pending state

### Admin (`/admin`)
- `/admin/dashboard` — stats: total clients, therapists, active sessions, pending approvals
- `/admin/clients` — list, search, filter
- `/admin/clients/[id]` — view/edit
- `/admin/clients/new`
- `/admin/therapists` — list with "Pending" tab
- `/admin/therapists/[id]` — view/edit + approve/reject
- `/admin/therapists/new`
- `/admin/match` — match tool
- `/admin/sessions` — all sessions, filterable
- `/admin/schedule-change` — structural change request + audit log

### Therapist (`/therapist`)
- `/therapist/profile`
- `/therapist/schedule` — weekly view with session details
- `/therapist/notifications`

### Parent (`/parent`)
- `/parent/profile` — child's profile
- `/parent/schedule` — child's sessions
- `/parent/cancel` — cancel session with reason
- `/parent/notifications`

---

## 10. i18n

- Library: `next-intl`
- Default: English (`en`)
- Supported: `en`, `pt-BR`, `es`
- Route prefix: `/[locale]/...`
- All UI text, errors, notifications in translation files at `/messages/`
- User preferred language stored in `profiles.preferred_language`

---

## 11. Notifications (In-App Only)

Stored in `notifications` table. Supabase Realtime subscription on the client for live updates.

| Event | Recipients |
|---|---|
| Session cancelled by parent | Therapist |
| Session change request submitted by therapist | Admin |
| Match/session assigned | Therapist + Parent |
| Session rescheduled | Therapist + Parent |
| Approval result | Therapist |

Email notifications: out of scope for v1. Reserved for future integration (Resend).

---

## 12. Auth & Middleware

- Supabase Auth: email/password
- Sessions via cookies (Next.js middleware)
- Middleware checks:
  - Unauthenticated → `/login`
  - `role=therapist` + `approved=false` → `/pending-approval`
  - Role-based route protection: `/admin/*`, `/therapist/*`, `/parent/*`

---

## 13. Design System

- Component library: shadcn/ui
- Color palette: calming blues and greens (healthcare aesthetic)
- Mobile-responsive
- All data views include: loading state, empty state, error state

---

## 14. Deployment

- Platform: Vercel
- Environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- No custom `vercel.json` required for standard Next.js 14 App Router deployment
