# Steady

A quiet, local-first habit tracker. Plain HTML, CSS, and browser JavaScript. No accounts, Node.js, build step, framework, dependencies, external fonts, or analytics.

## Use the website

Open **https://abhishek-s-k.github.io/steady/**. No installation or GitHub account is needed. Each browser has independent local progress; the hosted app does not upload habit names, to-do items, check-ins, or nicknames. To move existing localhost progress to the website, export a backup from My space locally, then import it into My space on the website. Backups remain on your device.

GitHub Pages serves the public application over HTTPS. GitHub logs visitors' IP addresses for security purposes, as described in [its Pages documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages#data-collection). The app adds no analytics or tracking.

The deployment workflow runs when website files change on `main`, or manually from the Actions tab. Official GitHub Actions are pinned to immutable commits and use separate read-only packaging and narrowly scoped deployment permissions. `scripts/check_dist.py` refuses publication unless `dist` contains exactly the six reviewed static assets; only that folder is uploaded. The launcher, tests, repository metadata, and browser backups are not part of the hosted artifact.

## Run locally

**Windows:** double-click `Start-Steady.cmd`. It finds Python automatically (including Codex's bundled Python, when available), starts the local server, and prints the address to open. Keep the terminal open while using the app.

**Any platform:** install Python 3.10 or later if needed, open a terminal in this folder, and run:

```sh
python serve.py
```

On Windows, `py serve.py` also works if Python was installed with the Python launcher. Open **http://127.0.0.1:8765** in your browser. Stop the server with Ctrl+C. Use the same URL and browser each time to keep using the same local data. The launcher serves only the allowlisted application assets, binds to your own machine, and provides no write API.

If the port is occupied, run `python serve.py --port 8766`. Changing the port creates a different browser storage space, so export your backup first. Serve the app over localhost; opening `index.html` directly is not supported because it uses native JavaScript modules.

## What you can do

- Create and edit habits with P1/P2/P3 priorities, six soft accent colors, and a goal length.
- See at most two habit cards per row, with a calendar for the current month, streak, completion total, and goal date. Small screens use one column.
- Check in for today, edit that check-in, or undo it. Historical and future days are read-only.
- Open a habit for its calendar history and optional, repeatable to-do list. Add, edit, or remove activities and select any subset when checking in.
- Hover, focus, or tap a calendar day to inspect its check-in. Past check-ins retain the original selected item wording even after you edit or delete a to-do item.
- Use My space to change your local nickname, see statistics, export/import a backup, or reset all local data.
- Optionally explore with fictional sample habits from the empty state. No samples are automatically created.

## Dates and statistics

Dates follow the browser's local calendar, using local noon arithmetic to avoid daylight-saving shifts. Day 1 of a goal is the creation date: a three-day goal created on October 10 has its marker on October 12. Only the relevant month displays that marker. This is a target date, not a prediction of when you will finish a number of check-ins. Total completed days is tracked separately; check-ins can continue after the target date or completion count is reached.

A current streak includes consecutive completed days ending today, or yesterday if today is still incomplete. Once you miss a full day, it resets. Best streak is the longest consecutive sequence ever recorded. Profile completion rate counts all possible habit check-ins during the last 30 calendar days, including today but excluding dates before each habit existed. History is grouped by month from creation through the end of the current month; long histories initially show the latest 12 months, with a button to reveal earlier months.

## Persistence and privacy

Progress is automatically saved in **localStorage** under `steady.habits.v1`, associated with the exact browser origin (scheme, hostname, and port). The local profile is only an optional nickname, not an identity or account. No email address, password, real name, contact detail, location, or device identifier is requested. All application assets are local; the app makes no network requests for user data.

Habit names and to-do text can still reveal personal information. Avoid sensitive content. Browser storage is plaintext and accessible to someone using your browser profile; it is not encrypted storage. Clearing site data removes progress, and private browsing may discard it on exit. Automatic saves deliberately do **not** write to the project folder: a static website cannot silently write arbitrary files, and keeping progress outside the checkout avoids accidental publication in Git. Use **My space → Export backup** to keep a portable JSON copy somewhere private, outside this repository. Import validates the entire backup before asking to replace existing progress. A failed import leaves existing data unchanged.

Sharing the source with friends shares only the application. Each person has an independent local space; there is no shared progress or synchronization. No server, account, cloud database, or third-party service receives the history. The server itself does not log requests or write any progress files.

## Security and public repository hygiene

- No third-party scripts, dependencies, CDNs, remote images, or external fonts.
- User-entered and imported text is rendered with DOM text nodes, never HTML injection or code evaluation.
- Import accepts only the versioned schema, validates dates/IDs/colors/lengths/limits, removes unknown properties, and rejects invalid or oversized files. Downloads contain data only, never code.
- A restrictive Content Security Policy disallows network connections, inline scripts, frames, objects, and form submissions. The supplied server also sets anti-framing, MIME, referrer, cross-origin, and feature restrictions.
- The read-only server accepts only loopback Host headers and rejects cross-site fetches. It has no directory listings and never serves the repository, backups, or arbitrary filesystem paths.
- Saves detect conflicting writes from other tabs; quota and corrupt-storage errors are surfaced without silently overwriting saved history.
- `.gitignore` excludes the app's standard backup filenames, private/data/backup folders, environment files, and logs. Renamed files can bypass ignore patterns, so inspect your changes before committing. No actual habit data is included in the source.

This is a personal tool with browser-local storage. The hosted version serves the same static app and gives each visitor independent browser-local data. The local Python server's additional response headers apply only to localhost; GitHub Pages controls hosted response headers. The app's HTML Content Security Policy and referrer policy remain in effect when hosted. GitHub Pages does not provide our custom anti-framing response header, so the hosted app should not be used for sensitive information. Browser storage is shared by origin: other applications hosted on the same `abhishek-s-k.github.io` origin must also be trusted. A separate custom domain would provide a separate origin if needed in the future.

## Project structure

```text
dist/                  Static application; no build needed
  index.html           Accessible shell and dialogs
  styles.css           Responsive pastel theme
  app.mjs              DOM interactions and browser persistence
  core.mjs             Date, streak, and backup validation logic
  icons.svg            Local SVG icon symbols
  favicon.svg          Local favicon
serve.py               Optional Python standard-library local launcher
Start-Steady.cmd        Windows launcher with Python discovery
tests/                 Date/schema and server regression checks
scripts/check_dist.py  Publication allowlist check
.github/workflows/     GitHub Pages deployment configuration
```

## Development checks

The application itself never needs Node.js. Its pure JavaScript regression tests use Node's built-in test runner for development only:

```sh
node --test tests/core.test.mjs
python -m unittest discover -s tests -p "test_*.py"
```

There is no package manager or dependency installation. Browser smoke testing covers creation/editing, check-ins, to-do history, navigation, backup restore, and responsive layout.
