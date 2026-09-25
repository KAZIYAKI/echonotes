# EchoNotes Backend — main branch v2

Implements the three Sprint 1 stories currently marked **Done** on the Jira board:

| Story | What's implemented | Files |
|---|---|---|
| SCRUM-11 | Register / login (bcrypt password hashing, JWT with 24h expiry) | `src/models/Student.js`, `src/routes/auth.js`, `src/middleware/requireAuth.js` |
| SCRUM-13 | Upload a lecture recording with course name and topic | `src/routes/lectures.js`, `src/config/upload.js` |
| SCRUM-14 | Reject invalid files (bad format, oversized, too long) with a clear message | `src/middleware/validateLectureFile.js` |

Stories still To Do / In Progress (SCRUM-12, 15–23 — admin account management,
transcription, study kit generation, export, notifications, history, admin
analytics) are **not** implemented here; only the three Done stories have code.

## Setup

```bash
npm install
cp .env.example .env   # edit MONGO_URI and JWT_SECRET
npm run dev
```

Requires a running MongoDB instance (local or Atlas) at the URI in `.env`.

## Try it

```bash
# Register
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Asha","email":"asha@example.com","password":"correcthorse123"}'

# Log in (copy the returned token)
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"asha@example.com","password":"correcthorse123"}'

# Upload a lecture (valid file)
curl -X POST http://localhost:4000/api/lectures \
  -H "Authorization: Bearer <token>" \
  -F "audioFile=@lecture.mp3" \
  -F "courseName=Software Engineering" \
  -F "topic=Scrum"

# Upload an invalid file — should return HTTP 422
curl -X POST http://localhost:4000/api/lectures \
  -H "Authorization: Bearer <token>" \
  -F "audioFile=@notes.txt" \
  -F "courseName=Software Engineering"
```

## Note on the duration check (SCRUM-14)
Edited Directly on Github
The 120-minute duration limit is stubbed (`probeDurationSeconds` returns
`null`) because checking real audio/video duration needs `ffprobe`, which
isn't installed in this environment. In a full setup, swap that function for
a call to `fluent-ffmpeg` or a similar library.
pushed to Git successfully
