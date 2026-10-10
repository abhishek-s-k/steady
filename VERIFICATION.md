# Verification

Verified locally on October 10, 2026. Browser checks used fictional habits and nicknames only; no user information was added to the source.

- **10 JavaScript regression tests passed:** inclusive goal dates; month/year/leap/DST boundaries; current and best streaks; month history; original to-do snapshots; schema limits; duplicate IDs; invalid dates; future records; unknown fields and prototype properties. Repeated date tests with `America/New_York` to cover a daylight-saving timezone.
- **5 server regression tests passed:** application/security headers; JavaScript module MIME and HEAD; blocked repository, traversal, and backup paths; rejected foreign Host and cross-site requests; unsupported write methods.
- **Desktop browser:** created a habit; set priority/color/goal; edited name/color/goal; confirmed an out-of-month goal has no current-month marker; added and edited a to-do; checked in with an activity; verified history retained its original wording; reloaded and verified persistence; changed local nickname; exported and restored a JSON backup; inspected a historical tooltip; filtered priorities and sorted habits.
- **Responsive browser:** confirmed two cards per row on desktop and one on a 390px mobile viewport, without horizontal overflow; inspected multi-month history and checked in with no to-do items. Viewport override was reset afterward.
- No browser JavaScript errors or CSP warnings were observed in the tested flows.

Automated tests cover invalid backup rejection; file-picker restore was tested with a valid exported backup. Browser storage quota failures, blocked storage, simultaneous-tab writes, and midnight rollover have handling in the implementation but were not independently fault-injected. This is a development verification record, not an independent security audit.

The website has not been deployed. The preview contains optional fictional sample habits stored only in its browser origin; a fresh browser origin starts empty. The source repository contains no browser-local progress or backups.
