# best-repo-ever baby!!!


## 🛍️ Place Value Boutique (grade 3 math game)

A shopping-themed iPad game for practising **place value up to 1,000**. It lives in [`docs/`](docs/) and runs as a Home Screen web app. There's nothing to install from the App Store, it works offline, and progress is saved on the iPad.

### The stores
| Store | Skill |
|---|---|
| 💳 Cash Register | Build a price with $100 bills, $10 bills and $1 coins on a place value mat |
| 🔍 Price Tag Detective | Value of a digit, and which digit is in a given place |
| 🏷️ Tag Maker | Word form ↔ standard form ↔ expanded form |
| ⚖️ Best Deal | Compare numbers with <, > and = |
| 🎯 Round-It Sale | Round to the nearest 10 or 100 using a number line |
| 🏦 Change Machine | Regrouping (10 ones = 1 ten, 10 tens = 1 hundred) |

Each round has 5 questions. A wrong answer gets a hint, and a second wrong answer shows a worked explanation. Each store adapts: 2-digit prices, then 3-digit, then "tricky" prices with zeros and look-alike digits. It moves up after 5 first-try answers in a row and steps back after 3 misses in a row. Coins earned buy decorations for her own boutique. A 🔒 Grown-ups page (behind a times-table question) shows accuracy per skill and lets you set levels.

### Put it on the iPad
1. In GitHub: **Settings → Pages → Build and deployment → Deploy from a branch**, choose `main` and the `/docs` folder, then save. (Merge this branch into `main` first.)
2. After a minute the game is at `https://ssommerv.github.io/best-repo-ever/`.
3. On the iPad, open that link in **Safari**, tap **Share → Add to Home Screen**.

### Run it locally
```sh
cd docs && python3 -m http.server 8000   # then open http://localhost:8000
```
It's plain HTML/CSS/JS with no build step.
