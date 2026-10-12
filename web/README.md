# EchoNotes – Lecture to Study Notes (Assignment 4)

A website that runs on **your own laptop** (localhost). Log in → upload a lecture video/audio → get notes as a PDF → find it later in "Your past notes".

## One-time setup
1. Install **Node.js LTS** from https://nodejs.org (accept defaults). Restart VS Code afterwards.
2. Unzip this folder and open it in VS Code (**File → Open Folder** → `echonotes-web`).
3. Open the terminal in VS Code (**Terminal → New Terminal**) and run:
   ```
   npm install
   ```
4. (Optional – real e-mails) copy `.env.example` to a new file called `.env` and fill `SMTP_USER` and `SMTP_PASS` (Gmail address + 16-letter *App password*, see the comments in the file). **If you skip this, the reset code is printed in the VS Code terminal** – fine for a demo.

## Run
```
npm start
```
Open **http://localhost:3000** in your browser. Stop with `Ctrl + C`.

> First upload only: the speech model (~40 MB) is downloaded once, so it needs internet and takes a minute. After that it works offline.

## How to demo it
1. Type any username + password → "not registered" → you are taken to **Register** → create the account.
2. Log out, click **Forgot password?** → enter the username → code arrives by e-mail (or appears in the terminal) → type it → set a new password → you are logged in.
3. Home shows two folders: **Upload & get notes** and **Your past notes**.
4. Upload: click the box → file manager opens → pick an mp3/mp4/etc. → progress steps → notes PDF appears and is saved.
5. Past notes: shows saved PDFs one by one with Previous / Next.

## Project layout
| File | Purpose |
|---|---|
| `server.js` | Starts the web server |
| `src/auth.js` | Register, login, forgot-password (code → verify → reset) |
| `src/mailer.js` | Sends the code by e-mail (or prints it) |
| `src/notesRoutes.js` | File upload, notes list, PDF download |
| `src/jobs.js` | Queue: UPLOADED → TRANSCRIBING → STRUCTURING → DONE/FAILED |
| `src/transcribe.js` | ffmpeg + Whisper speech-to-text (local) |
| `src/notes.js` | Keywords, summary, sections, glossary |
| `src/pdf.js` | Builds the notes PDF |
| `public/` | The web pages (login, home, upload, past notes) |
| `data/` | Created automatically: users, notes, PDFs |

## Troubleshooting
- `npm` not recognised → reinstall Node.js and reopen VS Code.
- Port busy → set `PORT=3001` in `.env`.
- Very long file → limit is 120 minutes / 500 MB.
