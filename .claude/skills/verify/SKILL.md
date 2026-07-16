---
name: verify
description: Build, run and drive the e-lib app locally to observe a change working (DB + API + web, browser verification).
---

# Verify e-lib changes

Three processes: Postgres (docker), NestJS API, Vite web. Login page renders
without the API; anything behind auth needs all three.

## Launch

```bash
# 1. DB — docker CLI works from the PowerShell tool, NOT from Bash (silently empty there)
docker compose up -d db            # container e-lib-db, 5433->5432

# 2. API — NestJS, port 3003, global prefix /api
cd apps/api && npm run dev

# 3. Web — port 5173 is often a DIFFERENT project. Always pass an explicit port.
cd apps/web && npx vite --port 5300 --strictPort
```

`apps/web/.env` → `VITE_API_URL=http://localhost:3003/api`.

Wait for the API instead of sleeping:
```bash
until curl -s -o /dev/null http://localhost:3003/api/auth/me; do sleep 1; done
```

## Drive the browser

No playwright in the repo. Install `playwright-core` in the scratchpad and point
it at the already-downloaded chromium:

```js
const { chromium } = require("playwright-core");
const EXE = "C:/Users/id303/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe";
const browser = await chromium.launch({ executablePath: EXE });
```

- Login: `superadmin` / `123` (apps/api/seeds/002_superadmin.js). Fields are
  `input[name="login"]` / `input[name="password"]`.
- **Use `waitUntil: "domcontentloaded"` + `waitForSelector`, not `networkidle`** —
  background requests keep the network busy and `networkidle` times out.
- Theme: `localStorage.setItem("theme-mode", "dark"|"light")` via `addInitScript`,
  before `goto`. Sets `data-theme` on `<html>`.
- Settings dialog: click `.MuiAvatar-root` in the header → menu item "Настройки".

### Gotcha: querySelector("input") on the login page

The language `<Select>` renders a hidden `<input>` that comes FIRST in the DOM.
`document.querySelector("input")` grabs that, not the login field — it reports
light-theme colors in dark mode and will fake a passing/failing contrast check.
Always select `input[name="login"]`.

## Build gates

- Web: `npx vite build` only — esbuild, no type-check.
- `npx tsc --noEmit` in apps/web has **42 pre-existing errors** in untouched files
  (UserFilesPage, FilesPage, FileRequestsPage). Don't chase them; only check that
  changed files add no NEW errors: `npx tsc --noEmit 2>&1 | grep -c "error TS"`.
- API: `nest build` is a real tsc and must pass cleanly.
- MUI is v5.18 — `Dialog` has no `slotProps.paper`; use `PaperProps={{ sx }}`.

## Theme correctness

Light/dark comes from `createAppTheme(mode)` (app/theme.ts) + CSS vars in
index.css. Pages must take backgrounds from theme tokens (`background.paper`,
`background.default`), never a hardcoded `#fff` — a hardcoded white background
pairs with theme text (`#e2e8f0` in dark) and renders white-on-white. When
checking readability, measure WCAG contrast in `page.evaluate` rather than
eyeballing a screenshot; walk up parents for the first non-transparent
background.
