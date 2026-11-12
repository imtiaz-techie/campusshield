# CampusShield – Campus Safety & Emergency Response System

CampusShield is a full-stack web app for campus emergencies. Students can report an emergency in seconds, share a simulated location and alert trusted contacts (simulated). Campus security can then monitor, prioritize, escalate and resolve each incident from a role-based dashboard.

> **Academic prototype:** Daffodil International University · SE331 Software Engineering Design Capstone Project · Assessment 2.
> No real SMS, calls or emails are sent. All locations are **mock coordinates** around DIU Smart City, and the browser's real geolocation is never read.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, React Router 6, Axios, Lucide icons, Recharts, Leaflet + OpenStreetMap, Sonner toasts |
| Backend | Node.js, Express 4 (REST API) |
| Database | MongoDB with Mongoose 8 |
| Security | JWT auth, bcrypt password hashing, role-based access control, input validation and sanitization, Helmet |
| Deployment | Vercel (static frontend plus a serverless Express function) with MongoDB Atlas |

---

## Feature checklist (marks)

### Core features (63)
| # | Feature | Where |
|---|---|---|
| 1 | Student registration & login (8) | `/register`, `/login`, JWT, bcrypt, validation, role redirect |
| 2 | Trusted emergency contacts (7) | `/student/emergency-contacts`: add, edit, delete, set primary, validation |
| 3 | Emergency / SOS reporting (10) | `/student/report-emergency?mode=sos`: SOS button, confirmation step, auto ID `CS-YYYY-NNNN`, appears on the security dashboard right away |
| 4 | Emergency categories (5) | 8 categories, each with its own icon and color (admins can add more) |
| 5 | Incident details (7) | Detailed form: title, category, description, location, date/time, simulated GPS, notes |
| 6 | View emergency reports (7) | `/student/incidents`: search by ID, filter by category and status, detail page with progress tracker and timeline |
| 7 | Security / admin dashboard (10) | Totals, pending, active, resolved, critical, recent reports, category stats, activity chart, location map |
| 8 | Update incident status (9) | Reported → Acknowledged → Response Dispatched → In Progress → Resolved → Closed. Each change records the incident ID, previous and new status, who updated it, a timestamp and notes |

### Advanced features (20)
| # | Feature | Where |
|---|---|---|
| 9 | Share location coordinates (5) | Simulated GPS fix, lat/lng display, Leaflet map markers, privacy switch per report and in the profile |
| 10 | Contact notification simulation (5) | Simulated SMS per trusted contact. Status goes Sent → Delivered, with timestamps and full history |
| 11 | Priority classification (5) | Rule-based Critical / High / Medium / Low with explanations; security can override manually (reason required) |
| 12 | History & statistics (5) | `/security/analytics`: monthly trend, top categories, resolved vs unresolved, average response time, priority distribution |

### Bonus (5): Emergency escalation workflow
Code: `server/services/escalationEngine.js`
1. Takes in each new report.
2. Analyzes the category and description keywords (weapon, bleeding, fire, following…).
3. Picks a **response category**, for example *Immediate Security Intervention*.
4. Calculates the **priority**.
5. Recommends the **next action**, a response checklist and a status-aware "next step".
6. Shows all of this to security on the incident page.
7. **Auto-escalates** critical incidents that nobody has acknowledged after a configurable time (Admin → Settings, default 5 minutes per level, 3 levels). The check runs whenever staff load data, and there is also a manual "Run escalation check" button.
8. Logs every escalation in `IncidentHistory` and `Escalations`.

Example: *Physical Assault: "A student reports being physically attacked near the university gate."* produces **Critical** · *Immediate Security Intervention* · "IMMEDIATE: Dispatch nearby campus security personnel…" · "Immediate attention required."

---

## Demo accounts

All demo data is seeded automatically the first time the app runs on an empty database.

| Role | Email | Password |
|---|---|---|
| Student | `student@diu.edu.bd` | `student123` |
| Security | `security@diu.edu.bd` | `security123` |
| Security | `security2@diu.edu.bd` | `security123` |
| Admin | `admin@diu.edu.bd` | `admin123` |

The other students (`tanvir@`, `nusrat@`, `rakib@`, `farzana@`, `mehedi@`, `sadia@`, `arif@`, `mim@`, `shakil@` … `@diu.edu.bd`) all use `student123`.
The seed contains 10 students, 2 security officers, 1 admin, 18 incidents across 6 months (every category, priority and status), 21 trusted contacts, and simulated notifications, history and escalations. One fresh unacknowledged Critical incident is included so you can demo auto-escalation.

The login page also has **one-click demo buttons**.

---

## Run locally

Requirements: **Node.js 18+**.

```bash
npm install
npm run dev
```

- Web app: http://localhost:5173
- API: http://localhost:5000/api/health

**No MongoDB needed for local dev:** if `MONGODB_URI` is empty, the API starts an in-memory MongoDB and seeds it. The first run downloads a MongoDB binary (~600 MB, cached afterwards). Data resets each time the server restarts.

To use your own MongoDB (local or Atlas):

```bash
cp .env.example .env        # then set MONGODB_URI and JWT_SECRET
npm run seed                # optional: wipe and reseed demo data
npm run dev
```

### Scripts
| Script | Purpose |
|---|---|
| `npm run dev` | API (port 5000) and Vite (port 5173) together |
| `npm run dev:api:watch` | API only, restarting when files in `server/` change |
| `npm run build` | Production build of the frontend into `dist/` |
| `npm run seed` | Reset the database in `MONGODB_URI` and insert demo data |
| `npm run test:api` | End-to-end API test suite (54 checks) against an in-memory DB |

---

## Deploy to Vercel

1. Create a free **MongoDB Atlas** cluster and a database user. Under *Network Access*, allow `0.0.0.0/0` (Vercel uses dynamic IPs). Copy the connection string, for example `mongodb+srv://user:pass@cluster.mongodb.net/campusshield`.
2. Push this folder to GitHub.
3. In Vercel, go to **Add New → Project**, import the repo, and keep the detected settings (Framework: Vite, Output: `dist`).
4. Add these **Environment Variables**:
   - `MONGODB_URI`: your Atlas connection string (**required**)
   - `JWT_SECRET`: a long random string (**required**)
   - `AUTO_SEED`: `true` (seeds demo data on the first request to an empty DB)
5. Click Deploy. The first API request can take a few seconds while the demo data is seeded.

How it works: `vercel.json` sends `/api/*` to the serverless function `api/index.js`, which wraps the Express app, and sends every other path to the React SPA.

---

## Project structure

```
├── api/index.js                 # Vercel serverless entry (wraps Express app)
├── server/
│   ├── app.js                   # Express app: middleware, routes, errors
│   ├── index.js                 # Local server (+ in-memory MongoDB fallback)
│   ├── config/                  # env + cached DB connection
│   ├── models/                  # Mongoose schemas
│   ├── controllers/             # auth, contacts, categories, incidents, analytics, notifications, admin
│   ├── routes/index.js          # REST routes + RBAC
│   ├── middleware/              # JWT protect/authorize, sanitize, error handler
│   ├── services/escalationEngine.js  # priority + escalation + notification simulation
│   ├── utils/                   # ApiError/response helpers, validation, constants
│   └── seed/                    # seed data, seed runner, API smoke test
├── src/
│   ├── App.jsx                  # routes + protected role routes
│   ├── context/AuthContext.jsx
│   ├── services/api.js          # Axios client + endpoint helpers
│   ├── layouts/DashboardLayout.jsx   # responsive sidebar for all roles
│   ├── components/              # UI kit, charts, map, timeline, location sharing
│   └── pages/                   # public, student, security, admin, shared
├── vercel.json
└── .env.example
```

---

## Database design (MongoDB collections)

| Collection | Key fields |
|---|---|
| `users` | name, studentId (unique, students only), email (unique), phone, department, password (bcrypt, `select:false`), role, isActive, locationSharing, timestamps |
| `emergencycontacts` | userId → users, contactName, relationship, phone, email, isPrimary |
| `incidents` | incidentId (unique), studentId → users, title, category, categoryName, description, location, latitude, longitude, locationShared, incidentDate, notes, isSOS, priority, priorityReasons, priorityOverridden, status, assignedTo → users, responseCategory, recommendedAction, escalationLevel, acknowledgedAt, resolvedAt, timestamps |
| `notifications` | incident → incidents, incidentId, recipientUser, contactId → contacts, contactName, contactPhone, channel, notificationType, notificationStatus, message, read, deliveredAt |
| `incidenthistories` | incident, incidentId, action, previousStatus, newStatus, updatedBy → users, updatedByName, notes, createdAt |
| `escalations` | incident, incidentId, priority, responseCategory, recommendedAction, escalationStatus, level, reasons, nextSteps |
| `categories` | key, name, icon, color, defaultPriority, responseCategory, recommendedAction, isActive, isSystem |
| `settings` | escalationMinutes, autoEscalation, notifyContactsOnSOS, securityHotline |
| `activitylogs` | user, userName, role, action, details, createdAt |
| `counters` | per-year sequence for readable incident IDs |

Indexes are on email, studentId (partial unique), incidentId, `incidents(status, priority, createdAt)`, the foreign keys, and `createdAt`.

---

## REST API

Base URL: `/api`. Every response has the shape `{ success, message, data, meta? }`, and errors look like `{ success:false, message, errors? }`.
Send `Authorization: Bearer <token>` on all endpoints except register, login and health.

| Method | Endpoint | Role | Description |
|---|---|---|---|
| GET | `/health` | public | Health check |
| POST | `/auth/register` | public | Register a student (returns token and user) |
| POST | `/auth/login` | public | Log in (returns token and user) |
| GET | `/auth/departments` | public | List of departments |
| GET / PUT | `/auth/me` | any | Get or update own profile (incl. `locationSharing`) |
| PUT | `/auth/me/password` | any | Change password |
| GET / POST | `/contacts` | student | List or add trusted contacts |
| PUT / DELETE | `/contacts/:id` | student | Edit or delete own contact |
| GET | `/categories` | any | Active categories (`?all=true` for admin) |
| POST / PUT / DELETE | `/categories[/:id]` | admin | Manage categories |
| POST | `/incidents/analyze` | any | Preview priority and response (escalation engine) |
| POST | `/incidents` | student | Create an SOS (`isSOS:true`) or detailed report |
| GET | `/incidents` | any | Students see their own reports; staff see all. Query: `q, category, status (or open/done), priority, assigned (me/none), sort, page, limit` |
| GET | `/incidents/:id` | owner / staff | Details, history, escalations, contact notifications, next action |
| PATCH | `/incidents/:id/status` | security, admin | `{ status, notes }` (notes required for Resolved/Closed) |
| PATCH | `/incidents/:id/priority` | security, admin | `{ priority, reason }` manual override |
| PATCH | `/incidents/:id/assign` | security, admin | `{ assignedTo }` |
| GET | `/incidents/map` | security, admin | Incidents with shared coordinates |
| POST | `/incidents/escalations/run` | security, admin | Force an escalation sweep |
| GET | `/incidents/escalations/recent` | security, admin | Escalation feed |
| GET | `/analytics/summary` | security, admin | Dashboard and analytics data (`?months=3/6/12`) |
| GET | `/analytics/me` | student | Personal stats |
| GET | `/notifications` | any | Students see their own; staff see contact-alert simulations |
| GET | `/notifications/unread-count` | any | Unread badge count |
| PATCH | `/notifications/:id/read`, `/notifications/read-all` | any | Mark as read |
| GET | `/users/officers` | security, admin | Officers for assignment |
| GET / POST | `/users` | admin | List or create accounts |
| PUT / DELETE | `/users/:id` | admin | Update (incl. deactivate) or delete |
| GET | `/admin/activity` | admin | System activity log |
| GET / PUT | `/admin/settings` | admin | Escalation and system settings |
| GET | `/settings/public` | any | Hotline and escalation time |

Example:
```bash
curl -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" \
  -d '{"email":"student@diu.edu.bd","password":"student123"}'
```

---

## Security measures

- Passwords are hashed with bcrypt and never returned (`select:false` plus a `toJSON` transform).
- JWT authentication. `protect` and `authorize(...roles)` middleware guard every private route, and the frontend also uses protected routes per role.
- Ownership checks: a student can only read their own incidents, contacts and notifications.
- Only security and admin can change status, priority or assignment, and the server enforces a status-transition workflow.
- Input is validated on both client and server. HTML tags and control characters are stripped, and keys starting with `$` or containing `.` are removed (NoSQL-injection guard).
- Location privacy: coordinates are stored only when the student shares them, and only security and admin can access the map endpoint.
- Secrets live in environment variables. Helmet headers, a JSON body size limit, and centralized error handling are in place.

---

## Testing

**Automated:** `npm run test:api` runs 54 end-to-end checks against a throwaway in-memory database. They cover auth, validation, the NoSQL-injection guard, contacts CRUD, SOS and detailed reports, location privacy, RBAC (401/403), the status workflow and history, priority override, assignment, auto-escalation, notifications, the map, analytics and admin operations.

**Manual demo script:**
1. Log in as the **student**, press **SOS**, choose *Physical Assault*, type "someone attacked me", confirm, and see the incident ID, Critical priority and simulated contact alerts.
2. Submit a **detailed report** with a simulated GPS fix and watch the live priority preview.
3. Log in as **security** in another browser. The new incident is at the top of the dashboard and on the map. Open it to see the recommendation, then acknowledge, dispatch and resolve it with notes.
4. Back as the student, check **My Reports**: the progress tracker, timeline and notifications are updated.
5. Log in as **admin**: set the escalation time to 1 minute, wait, press **Run escalation check** and watch the unacknowledged Critical incident escalate. Also review users, categories and the activity log.
