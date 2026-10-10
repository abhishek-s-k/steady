# Verification

Verified locally on October 10, 2026. Browser checks used fictional habits and nicknames only; no user information was added to the source.

- **10 JavaScript regression tests passed:** inclusive goal dates; month/year/leap/DST boundaries; current and best streaks; month history; original to-do snapshots; schema limits; duplicate IDs; invalid dates; future records; unknown fields and prototype properties. Repeated date tests with `America/New_York` to cover a daylight-saving timezone.
- **5 server regression tests passed:** application/security headers; JavaScript module MIME and HEAD; blocked repository, traversal, and backup paths; rejected foreign Host and cross-site requests; unsupported write methods.
- **Desktop browser:** created a habit; set priority/color/goal; edited name/color/goal; confirmed an out-of-month goal has no current-month marker; added and edited a to-do; checked in with an activity; verified history retained its original wording; reloaded and verified persistence; changed local nickname; exported and restored a JSON backup; inspected a historical tooltip; filtered priorities and sorted habits.
- **Responsive browser:** confirmed two cards per row on desktop and one on a 390px mobile viewport, without horizontal overflow; inspected multi-month history and checked in with no to-do items. Viewport override was reset afterward.
- No browser JavaScript errors or CSP warnings were observed in the tested flows.

Automated tests cover invalid backup rejection; file-picker restore was tested with a valid exported backup. Browser storage quota failures, blocked storage, simultaneous-tab writes, and midnight rollover have handling in the implementation but were not independently fault-injected. This is a development verification record, not an independent security audit.

The GitHub Pages workflow publishes only the six allowlisted application assets in `dist`. The preview contains optional fictional sample habits stored only in its browser origin; a fresh browser origin starts empty. The source repository contains no browser-local progress or backups. Deployment results are recorded in the repository's Actions history.
# Cloudflare Pages migration — October 10, 2026

- Production: https://steady-habits.pages.dev/
- GitHub Pages disabled; old public URL returns HTTP 404. Source repository retained.
- Cloudflare Pages Direct Upload published the six reviewed assets and `_headers`; no GitHub app permissions were granted.
- Every application asset returned HTTP 200 with bytes matching its local SHA-256 hash. The root URL served the reviewed `index.html` over HTTPS.
- Verified response headers: restrictive Content Security Policy including `frame-ancestors 'none'` and `connect-src 'none'`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and `Referrer-Policy: no-referrer`. JavaScript modules have a JavaScript MIME type.
- Live browser checks: home, new-habit dialog (cancelled), profile, and return navigation. No warnings or errors in the browser console; no test habits or personal data added.
- Publication allowlist passed; five local server tests passed outside the sandbox with loopback access.
- Future source pushes do not publish automatically. `python scripts/package_site.py` produces the validated, ignored ZIP for a new Cloudflare production upload.

