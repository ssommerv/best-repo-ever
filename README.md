# best-repo-ever baby!!!


## 🛍️ Place Value Boutique (grade 3 math game)

A shopping-themed iPad game for practising **place value up to 1,000**. It lives in [`docs/`](docs/) and runs as a Home Screen web app. There's nothing to install from the App Store, it works offline, and progress is saved on the iPad.

### The stores
| Store | Skill |
|---|---|
| 🧾 Receipt Counter | Chapter 2, Addition up to 1000. Level 1 teaches the book's method step by step (add the ones, regroup, add the tens, …) with hints that teach rather than tell. Levels 2–4 are on her own: regrouping in ones or tens, then both plus word problems (including "fewer than" traps), then missing-digit puzzles |
| 🎀 Display Window | Chapter 2, Lesson 5 Addition Patterns. Level 1 guides number patterns, shape patterns with tables, and SET/REPEAT/ADD/OUTPUT code; levels 2–3 are on her own |
| 💳 Cash Register | Build a price with $100 bills, $10 bills and $1 coins on a place value mat |
| 🔍 Price Tag Detective | Value of a digit, and which digit is in a given place |
| 🏷️ Tag Maker | Word form ↔ standard form ↔ expanded form |
| ⚖️ Best Deal | Compare numbers with <, > and = |
| 🎯 Round-It Sale | Round to the nearest 10 or 100 using a number line |
| 🏦 Change Machine | Regrouping (10 ones = 1 ten, 10 tens = 1 hundred) |
| 📿 Letter Bead Bar | Weekly spelling words: hear the word in a sentence, spell it with letter beads. Includes a practice test like the real one. Grown-ups can edit the word list |
| 🛎️ Open for Business | In My Boutique: stock shelves with items bought in the Sparkle Shop (90+ items), then sell them to customers by making change: subtraction from $20/$50, from $100s, then two-item orders paid with $500 or $1,000 |

Each round has 5 questions. In the Chapter 2 stores, she moves on from the guided "Learn" level only after 5 problems in a row with every step right the first time, and drops back to it after 3 misses in a row. A wrong answer gets a hint, and a second wrong answer shows a worked explanation. Each store adapts: 2-digit prices, then 3-digit, then "tricky" prices with zeros and look-alike digits. It moves up after 5 first-try answers in a row and steps back after 3 misses in a row. Coins earned buy decorations for her own boutique. A 🔒 Grown-ups page (behind a times-table question) shows accuracy per skill and lets you set levels.

### Put it on the iPad
1. In GitHub: **Settings → Pages → Build and deployment → Deploy from a branch**, choose `main` and the `/docs` folder, then save. (Merge this branch into `main` first.)
2. After a minute the game is at `https://ssommerv.github.io/best-repo-ever/`.
3. On the iPad, open that link in **Safari**, tap **Share → Add to Home Screen**.

### Run it locally
```sh
cd docs && python3 -m http.server 8000   # then open http://localhost:8000
```
It's plain HTML/CSS/JS with no build step.

### Recorded voice
Questions, spelling dictation and cheers are spoken in a recorded ElevenLabs voice ("Brittney"). Clips live in `docs/audio/`. A question is a recorded line plus a recorded price (e.g. "Round this price to the nearest ten:" + "two hundred forty-eight dollars."), joined with the silence trimmed. Anything not recorded, like a custom spelling word, falls back to the device's built-in voice.

To record new lines (for example after changing `SPELL_DEFAULT` in `docs/app.js` for a new weekly list):
```sh
ELEVENLABS_API_KEY=sk_... python3 tools/voice/generate.py --dry-run   # shows how many credits it will use
ELEVENLABS_API_KEY=sk_... python3 tools/voice/generate.py             # records only new or changed lines
NODE_PATH=$(npm root -g) node tools/voice/manifest.js                 # rebuilds docs/audio/manifest.json (needs Playwright)
```
The API key is only read from the environment and is never stored in the repo.
