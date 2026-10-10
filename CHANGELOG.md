# Changelog

All notable changes to ClubMotion will be documented in this file.

## [0.9.128] - 2026-10-10

### Changed
- **Room cards colored by bed count.** Room planner and member room plan cards have pale backgrounds per bed count (1 gray, 2 blue, 3 green, 4 amber, 5 violet). Over-capacity rooms get a thick red border; the member's own room a thick indigo border.

## [0.9.127] - 2026-10-10

### Added
- **Attendance yearly: sort by name or total.** Sort dropdown next to the filters (name A–Z, or most attended first); remembered in the browser.

## [0.9.126] - 2026-10-10

### Changed
- **Member categories moved to Settings.** New "Settings" item in the profile menu (admins & superusers) opens a Settings page; Member categories are now at /settings/categories instead of under Tools.

## [0.9.125] - 2026-10-10

### Added
- **Tools → Member categories.** List of membership categories with age range, description and member counts; add, edit and delete (delete only when no members are in the category).

### Changed
- **Age-based categories use the IDBF rule:** age = age reached during the current calendar year (current year − birth year), so a member's category stays the same for the whole year. Members in age-based categories are re-checked the next time the Members list is opened.

## [0.9.124] - 2026-10-10

### Changed
- **Members list: two-level grouping.** After choosing Group by (gender or category), a second "Then by" dropdown groups each group by the other option, with indented sub-headers and counts. Both choices are remembered in the browser.
- **Members list: Category removed from Sort** (still available under Group by).

## [0.9.123] - 2026-10-10

### Added
- **Fill gender from names.** A "Fill gender from names" link on the Members list (shown while some members have no gender) opens a review page that guesses gender from each first name (Serbian naming rules with exceptions; unisex names flagged as unsure). Staff correct guesses (Male / Female / Skip) and save; only empty genders are filled, existing values are never overwritten.

## [0.9.122] - 2026-10-10

### Added
- **Member gender and EDBF ID.** New fields on member create/edit and the member page; included in the members API (`gender`: M/F/null, `edbf_id`).
- **Members list: gender column, gender filter and Group by** (gender or category, with counts; categories in age order). Sort applies within groups; Sort and Group by are remembered in the browser.

### Note
- Requires running `/migrate` after deploy (adds `members.gender` and `members.edbf_id`). Saving a member fails until it runs.

## [0.9.121] - 2026-10-10

### Added
- **Members list: Sort dropdown** (ID / Name / Category) next to Show. Category sorts by age band (as in the stats), then name; members without a category last. The choice is remembered in the browser.

## [0.9.120] - 2026-10-10

### Added
- **Room plan snapshots.** A "Snapshots" section in the room planner saves the current plan (rooms, assignments, stay dates, default dates, room types) under a name, lists saved snapshots (rooms, people placed, when and by whom) and restores or deletes them. Restoring replaces the current plan; participants added since the snapshot become unassigned on default dates, removed ones are skipped. Fees, payments and notes are never changed.

### Note
- Requires running `/migrate` after deploy (creates `competition_room_snapshots`). Run `/clear-cache` if snapshot actions return 404.

## [0.9.119] - 2026-10-10

### Added
- **Stay dates (check-in / check-out).** The room planner has a default check-in/check-out for everyone (initially the competition's start/end dates). Each participant can have their own dates (participant window "Stay", or in the planner before being placed); dates equal to the default follow it. Room cards show the room's dates and nights; changing them sets the dates for everyone in the room, and rooms whose occupants' dates differ are flagged. Dates are shown in the participant list (when different from the default), group-by-room headers, My Payments (own stay and room plan) and the export (Check-in/Check-out columns; Rooms sheet with check-in, check-out and nights).

### Note
- Requires running `/migrate` after deploy (adds `competitions.rooms_check_in/rooms_check_out` and `competition_participants.check_in/check_out`). Saving a participant fails until it runs. Run `/clear-cache` if date saves return 404.

## [0.9.118] - 2026-10-10

### Added
- **Competition export includes rooms.** XLSX and CSV have a "Room" column (room title or number). The XLSX also gets a "Rooms" sheet (when rooms exist) with one row per room (beds, beds used, occupants with additional people) and room counts per type, total rooms, total beds, beds used and people not in a room. Children don't take a bed; cancelled participants are excluded.

## [0.9.117] - 2026-10-10

### Added
- **Room planner editors per competition.** Staff can tick "Can edit room planner" on a participant. That participant gets a "Trip planner (rooms & fees)" button on their competition card in My Payments, opening a page with totals, people and rooms summary, every participant's room, extras, notes, payment status and payments (read-only), and the full room planner including the "Show room plan to members" switch. Fees and payments stay managed by admins/superusers. Planner actions are authorized per competition (staff or an active participant marked as editor).

### Note
- Requires running `/migrate` after deploy (adds `competition_participants.can_edit_rooms`). Saving a participant fails until it runs. Run `/clear-cache` if the new page returns 404.

## [0.9.116] - 2026-10-10

### Changed
- **My Payments: Room plan moved to the end of the competition card**, after the payment lines.

## [0.9.115] - 2026-10-10

### Changed
- **Member room plan: "Your room" label moved** below the last occupant in the member's own room card.

## [0.9.114] - 2026-10-10

### Added
- **Room plan visible to members (read-only).** The room planner has a "Show room plan to members" switch (off by default). When on, participants see a Room plan on their competition card in My Payments: every room with its badge, bed size and occupants (names and additional people only), with their own room highlighted. No fees, notes or statuses of others are shown.

### Note
- Requires running `/migrate` after deploy (adds `competitions.rooms_visible`). Only the switch fails until it runs.

## [0.9.113] - 2026-10-10

### Changed
- **Rooms line shows real rooms once the planner has rooms.** The competition page and the room planner show the rooms actually created (count per bed size, total, beds used, people not in a room) instead of the preference-based estimate. Before any rooms exist, the line is labelled "Rooms needed (estimate)".
- **Group by room is on by default** and its toggle is a button in the filter row (remembered per browser when turned off).

## [0.9.112] - 2026-10-10

### Added
- **Competition participants: Group by room.** A "Group by room" checkbox (shown once rooms exist) groups the participant list under room headers (room badge, bed size, beds used; red when over capacity), with "Not in a room" last. Filters and search still apply; the setting is remembered in the browser.

## [0.9.111] - 2026-10-10

### Changed
- **Room title shown as a badge.** The assigned room appears as an indigo badge next to the participant's name, and room planner card titles are indigo badges (click to edit).

## [0.9.110] - 2026-10-10

### Changed
- **Room planning: children don't take a bed.** Children no longer count toward a room's beds used or the rooms-needed calculation (they share with their parent). They still appear with the participant and in "People going".

## [0.9.109] - 2026-10-10

### Added
- **Competition Fees: room planner.** "Room planner" on a competition opens a planner with the available room types, numbered room cards and a "Not in a room" list. Rooms can be added (choose bed count), created from the plan, renamed (e.g. hotel room "205"), resized and removed (occupants become unassigned). Participants (with their additional people) are added to or removed from rooms; each card shows beds used and flags over capacity. The participant list shows the assigned room.

### Removed
- The separate "Room types available" window (now part of the room planner).

### Note
- Requires running `/migrate` right after deploy (creates `competition_rooms`, adds `competition_participants.competition_room_id`). The competition page fails to open until it runs.

## [0.9.108] - 2026-10-10

### Changed
- **Accommodation planner: people without a preference are placed in rooms.** They first fill spare beds in rooms already needed, then the largest available room type, with the remainder in the smallest available type that fits. The rooms line shows the total number of rooms; if no room types are set, unplaced people are flagged.

## [0.9.107] - 2026-10-10

### Changed
- **Accommodation planner: room types instead of counts.** "Edit rooms" now has checkboxes for the available room types (1–5 beds). The rooms line shows rooms needed per type and flags preferred types that are not available. The participant "Preferred room" dropdown only offers available types (keeping a participant's current choice).

## [0.9.106] - 2026-10-10

### Added
- **Competition Fees: accommodation planner.** "Edit rooms" on a competition sets how many 1–5 bed rooms are available. Each participant can have a preferred room size (participant window), shown in the list. Below "People going", a rooms line shows rooms needed / available per size (needed = people preferring that size, including their additional people, divided by beds, rounded up), highlights shortages in red, and counts people without a preference.

### Note
- Requires running `/migrate` after deploy (adds `competitions.room_counts` and `competition_participants.preferred_room`). Saving rooms or participants fails until it runs.

## [0.9.105] - 2026-10-10

### Changed
- **Competition participant Notes start one line tall** and grow automatically with multiline content.

## [0.9.104] - 2026-10-10

### Added
- **My Payments: competition role and additional people.** Each competition card shows "Registered as Athlete/Supporter" plus any additional athletes, supporters and children.

### Fixed
- **My Payments: empty status badge** for months that have a payment record without a status now shows "−".

## [0.9.103] - 2026-10-10

### Added
- **Competition Fees: additional people per participant.** The participant window has an "Additional" row (Athletes / Supporters / Children, whole numbers 0–99) above Notes. Extras are shown under the participant's name in the list, and the competition page shows a "People going" headcount (participants by role plus their additional people; cancelled participants excluded). Fees are not affected.

### Note
- Requires running `/migrate` after deploy (adds `extra_athletes`, `extra_supporters`, `extra_children` to `competition_participants`). Saving a participant fails until it runs.

## [0.9.102] - 2026-10-10

### Added
- **Competition Fees: register participants as Athlete or Supporter.** The Add Participants window has an Athlete / Supporter choice (Athlete by default), the participant window has a "Registered as" field, supporters get a "Supporter" badge in the list, and the export has a Role column. Existing participants are Athletes.

### Note
- Requires running `/migrate` after deploy (adds `competition_participants.role`). Adding or editing participants fails until it runs.

## [0.9.101] - 2026-10-10

### Changed
- **Join page: "Back to sign in" renamed to "Go to Sign in".**

## [0.9.100] - 2026-10-10

### Changed
- **Join page: date of birth uses Day / Month / Year dropdowns** instead of the native date picker, which on Android only paged month by month.
- **Join page: "Back to sign in" links go to the site root** (club.motion.rs) instead of /login.

### Removed
- **"Join in" button and info popup removed from the sign-in page.** The Join page is still available at /join.

## [0.9.99] - 2026-10-09

### Added
- **Competition fees on My Payments.** Members now see their competition fees (all years, newest first, cancelled participations hidden) with fee, paid, remaining/overpaid, status and the list of payments. Internal participant and payment notes are not shown.

## [0.9.98] - 2026-10-09

### Added
- **View as member (admin only).** A "View as member" button on a member's page logs the admin in as that member's user to see the app exactly as they do. A banner shows who is being viewed, with "Return to admin". While viewing, all changes are blocked (read-only), push notifications are not registered for the member, and admin accounts cannot be viewed. Start/stop is written to the Laravel log.

### Note
- Run `/clear-cache` after deploy if the new routes are not picked up.

## [0.9.97] - 2026-10-09

### Fixed
- **Competition fee form fields have visible borders.** Inputs, selects and textareas in the competition fee modals now have a light gray border and padding.

## [0.9.96] - 2026-10-09

### Changed
- **Competition participant notes are multiline.** The Notes field in the participant modal is now a textarea, and line breaks in notes are preserved in the participants list.

## [0.9.95] - 2026-10-08

### Changed
- **Competition payments are posted to the Ledger again** (reverts v0.9.94). Cash and bank-transfer payments create a cash-book entry under `kotizacije` (RSD → cash/bank, EUR → cash EUR/EUR) with the same two-way sync as membership fees; "Other" payments are not posted. A migration re-adds `competition_payments.ledger_entry_id` and creates ledger entries for existing competition payments that don't have one.

### Note
- Requires running `/migrate` after deploy.

## [0.9.94] - 2026-10-07

### Removed
- **Competition payments are no longer posted to the Ledger.** The automatic cash-book entries (and the two-way sync) added in v0.9.90 are removed. A cleanup migration deletes the ledger entries that were created for competition payments, drops the `competition_payments.ledger_entry_id` column, and removes the `kotizacije` category if nothing else uses it. Competition payments themselves are kept. Membership-fee ledger posting is unchanged.

### Note
- Requires running `/migrate` after deploy.

## [0.9.93] - 2026-10-07

### Changed
- **Competition Fees list now defaults to "All years"**; pick a specific year from the filter to narrow it down.

## [0.9.92] - 2026-10-07

### Added
- **"All years" option in the Competition Fees year filter**, so competitions in other years (e.g. next year's) can be listed together. The default is still the current year.

## [0.9.91] - 2026-10-07

### Fixed
- **Ledger annual report: membership income per member.** The report looked for a category literally named "membership", but membership fees are posted under "članarina", so they were counted as "Other". It now matches "članarina" (and an English "Membership" category if one exists). Category ids are also compared as integers, since PHP 8.0 can return them as strings from the aggregate query.

## [0.9.90] - 2026-10-07

### Added
- **Competition Fees** (admin/superuser). Payments page now has tabs **Membership Fees | Competition Fees**; Membership Fees is the existing screen, unchanged.
  - **Competitions:** name, location, dates, default fee, currency (EUR/RSD), status (planned/active/closed), notes. List per year with Active/Closed/All filter and summary cards (Expected, Collected, Remaining per currency; competitions; participants). Closed competitions keep their history and still accept late payments. A competition can only be deleted if it has no payments.
  - **Participants:** add club members (active by default, "show inactive" option, search, Select All) with the default fee or a custom fee; no duplicates. Per-participant fee override, Exempt (kept fee, excluded from totals) and Cancelled. Removing a participant with payments marks them Cancelled instead of deleting.
  - **Payments:** unlimited instalments per participant (amount, date, method cash/bank transfer/other, note); edit and delete with confirmation. Paid / Remaining / status (Paid, Partial, Unpaid, Exempt, Overpaid with excess) are calculated, never stored.
  - **Ledger:** cash and bank-transfer payments are posted to the cash book automatically (category `kotizacije`; RSD → cash/bank, EUR → cash EUR/EUR), two-way like membership fees: editing or deleting the ledger entry updates or deletes the payment. "Other" payments are not posted.
  - **Download:** XLSX (Status + Payments sheets) or CSV for a competition.
  - Remaining is the sum of what each active participant still owes, so one member's overpayment never hides another's debt.

### Note
- New tables `competitions`, `competition_participants`, `competition_payments` — requires running `/migrate` after deploy.

## [0.9.89] - 2026-10-05

### Added
- **Achievements export for a year range (CSV, XLSX, PDF).** New "Export" button on the Achievements page (admin/superuser) opens a dialog with From/To year (default: latest year with achievements) and format. Achievements only store a year, so the period is a year range.
  - **Results:** one row per unique result (year, event, class, medal) listing all members who earned it — a crew medal appears once.
  - **XLSX:** sheets "Achievements", "By year" (medal counts per year, crew medals counted once) and "By member" (each member's medals, ranked by gold/silver/bronze).
  - **CSV:** the results list (UTF-8, `;` separator).
  - **PDF:** medal summary by year and by member, then results grouped by year.

### Fixed
- **Attendance XLSX export now shows 0 instead of an empty cell** for zero totals.

## [0.9.88] - 2026-10-05

### Added
- **Attendance export for a chosen period (CSV, XLSX, PDF).** New "Export" button on the Attendance page (admin/superuser) opens a dialog with From/To dates (default: the month shown) and format. Uses the page's current member filter (active/all) and session-type filter. Members are included only if they were members during the period (registered by its end, not deactivated before its start).
  - **XLSX/CSV:** one row per member with a column per session (date + type), Total and %, plus a per-session totals row. CSV is UTF-8 with `;` separator for Excel.
  - **PDF:** summary table (attended / sessions / %) plus a per-session grid when the period has 31 sessions or fewer.

## [0.9.87] - 2026-10-04

### Added
- **Deactivation Date on members.** Set automatically to today when a member is switched to Inactive (unless a date is entered), cleared when they're reactivated. Shown on the member page and editable on Edit while the member is inactive.
- **Admin `/sync-deactivation-dates` page.** For inactive members with no Deactivation Date, previews the last day of their latest paid month; "Apply changes" writes it. Inactive members with no paid month are left empty.

### Changed
- **Payments grid hides members who left before the displayed year.** Members whose Deactivation Date is before 1 January of that year are not listed (relevant with the "All" filter).

### Note
- Requires running `/migrate` after deploy — editing a member fails until the new column exists.

## [0.9.86] - 2026-10-04

### Changed
- **Payments grid hides members registered after the displayed year.** When viewing a year, members whose Registration Date is in a later year are not listed, since they weren't members yet. Members without a Registration Date are still shown.

## [0.9.85] - 2026-10-04

### Changed
- **Payments CSV import disabled (code kept).** The Import button is hidden on the Payments page and `/payments/import` redirects back with "CSV import is disabled." Controlled by `PAYMENTS_CSV_IMPORT` in `.env` (default off); set it to `true` and visit `/clear-cache` to re-enable. The Download (template export) button is unchanged.

## [0.9.84] - 2026-10-04

### Changed
- **Locked payment cells slightly stronger** (between the original solid grey and the v0.9.83 faint style) so they remain clearly visible.

## [0.9.83] - 2026-10-04

### Changed
- **Locked (before registration) payment cells are now lighter and semi-transparent** instead of solid grey, so they recede visually in the Payments grid.

## [0.9.82] - 2026-10-04

### Added
- **Payments before a member's registration month are locked.** In the Payments grid, months before the member's Registration Date are shown greyed out ("Before registration" in the legend) and can't be opened. The server also rejects saving, updating, deleting, bulk-marking or starting an annual payment in such a month, with a message in the page banner. To record an earlier payment, first move the member's Registration Date back.

### Note
- CSV payment import is not restricted.

## [0.9.81] - 2026-10-04

### Changed
- **Registration Date sync ignores same-month differences.** A member is only updated when their earliest paid month is in an earlier *month* than their Registration Date; if both fall in the same month, the existing date (including its day) is kept.

## [0.9.80] - 2026-10-04

### Changed
- **Registration Date sync only moves dates earlier.** `/sync-registration-dates` (and the pending v0.9.77 data migration) now update a member only when their earliest paid month is *before* their current Registration Date, setting it to the 1st of that month. Dates are never moved later, so manual corrections that are already earlier are kept.

## [0.9.79] - 2026-10-04

### Added
- **Admin `/sync-registration-dates` page.** Previews each member's current Registration Date against the 1st of their earliest paid month (status `paid` or a paid amount > 0), highlighting the ones that differ; "Apply changes" (`?apply=1`) writes them. Members with no paid month are left unchanged. Can be re-run at any time.

## [0.9.78] - 2026-10-04

### Added
- **Registration column in the Members list**, right after Category. On mobile cards it appears as "Registered: <date>" under the category badge.

## [0.9.77] - 2026-10-04

### Changed
- **Registration Date now matches each member's earliest paid month.** A one-off data migration sets `registration_date` to the 1st of the member's earliest month with status `paid`. Members with no paid month keep their current date (from `created_at` or a manual edit).

### Note
- Requires running `/migrate` after deploy.

## [0.9.76] - 2026-10-04

### Added
- **Registration Date on members.** New `registration_date` field shown on the member details page and editable on Create/Edit. Existing members are initialised from the date their record was created (`created_at`); correct any that are wrong via Edit. New members default to today.

### Note
- Requires running `/migrate` after deploy.

## [0.9.75] - 2026-09-16

### Added
- **Messages to members are now also pushed.** When an admin sends a message from a member's page, the member also gets a web-push notification (in addition to the email) — if they have a login and have opted in. Best-effort: a push failure never affects the email.
- **All logged-in users are now prompted to opt in to push** (previously staff only), so members can receive club messages.

### Note
- A "welcome push" on join-request approval was considered but not added: members have no login/device until their first sign-in, so there is nothing to push to at approval time. The welcome **email** already covers that moment.

## [0.9.74] - 2026-09-16

### Fixed
- **Push external_id is now prefixed (`motion-user-<id>`).** OneSignal rejects a bare-numeric external id, which was causing the `/users` 400 on `login()`. The frontend `login()` and the backend `toExternalIds()` now both use the `motion-user-` prefix so per-user targeting matches. Join-request and `/test-push` sends target by the `staff` tag and are unaffected.

## [0.9.73] - 2026-09-15

### Fixed
- **Push identify now waits for a real subscription token, not just permission.** Notification permission can be granted while the push token is still empty, which made OneSignal post an empty token and 400. The SDK now calls `login()`/`addTags()` only when `PushSubscription.optedIn` is true and a `token` exists, and re-runs on the `PushSubscription` `change` event (covering the already-subscribed case on load).

## [0.9.72] - 2026-09-15

### Fixed
- **OneSignal identify no longer runs before push permission is granted.** Calling `login()`/tags before a real subscription existed caused a 400 on OneSignal's `/users` endpoint and paused its operation queue. The SDK now identifies the user and applies `role`/`staff` tags only once notification permission is granted (immediately if already granted, otherwise on the `permissionChange` event), and prompts staff who haven't opted in.

## [0.9.71] - 2026-09-15

### Added
- **Web push notifications via OneSignal.** The app now loads the OneSignal Web Push SDK; logged-in users are identified to OneSignal by their id, and admins/superusers are tagged `staff=1` and prompted to opt in. When someone submits the public **Join** form, subscribed staff receive a "New join request" push that deep-links to `/join-requests`. Push failures never affect the form (logged and ignored).
- **`/test-push` route (admin only)** to verify the OneSignal configuration, mirroring the existing `/test-email` route.

### Deploy note
- Set `ONESIGNAL_APP_ID` and `ONESIGNAL_REST_API_KEY` in the server `.env`, then visit `/clear-cache`. Create a OneSignal Web Push app pointed at the site's HTTPS origin first. iOS requires the site be added to the Home Screen (iOS 16.4+) to receive push.

## [0.9.70] - 2026-09-13

### Changed
- **Member photo history capped at 5.** Each upload now prunes older photos beyond the 5 most recent, deleting their files from disk to keep storage in check. The currently-active photo is never pruned (in case it's an older one you reverted to).

## [0.9.69] - 2026-09-13

### Added
- **Members can update their own profile photo, with change history.** On the member page, a member (or an admin/superuser) can change the photo directly — it applies instantly. Every uploaded photo is now kept (unique filenames, old files no longer deleted) and recorded in a new `member_images` history table.
- **Photo history / revert.** Admins & superusers see a "Photo history" panel on the member page with thumbnails, who uploaded each and when, a **Set current** (revert) action, and **Delete** for removing an inappropriate image permanently. The first time a member's existing photo is replaced, that prior photo is backfilled into history so it can be reverted to.

### Deploy note
- Run `/migrate` after deploy (creates the `member_images` table).

## [0.9.68] - 2026-09-13

### Changed
- **Member page — "Send Message" button isolated on the right.** It's now separated from the Edit/Reset/Delete group and aligned to the far right of the actions row (stacks normally on mobile).

## [0.9.67] - 2026-09-13

### Added
- **Send a message to a member.** The member details page now has a "Send Message" button (admin/superuser) that opens a dialog to email the member a custom subject and message. Disabled when the member has no email on file. Uses the same SMTP setup as join-request emails.

## [0.9.66] - 2026-09-13

### Changed
- **Join requests — Reject always rejects, even if the notification email fails.** Previously "Reject & send email" aborted both steps when mail failed, so a misconfigured mailer could block rejection. Now the request is rejected regardless, and a failed email is simply reported ("Request rejected. (Email could not be sent…)"). This matches the approval behavior. The email is only recorded in the tracking counter if it actually sent.

## [0.9.65] - 2026-09-13

### Added
- **Join requests — Create account now sends an editable welcome email.** Clicking "Create account" opens a dialog pre-filled with a welcome message (including how to activate their login: sign in with their email and choose a password). "Create account & send email" creates the member and emails them; "Create without email" creates the account silently. If the welcome email fails, the account is still created and the failure is reported.

## [0.9.64] - 2026-09-13

### Changed
- **Join requests — Reject now prompts with an editable email.** Clicking "Reject" opens a dialog pre-filled with a rejection message you can edit, then rejects and emails the applicant in one step ("Reject & send email"). A "Reject without email" option is available for a silent rejection.
- **Join requests — cleaner actions on resolved requests.** A rejected request no longer shows "Create account" / "Mark processing" (which were misleadingly enabled). Instead it shows a "Reopen" action that returns it to pending, plus Email and Delete.

## [0.9.63] - 2026-09-13

### Added
- **Admin `/test-email` route.** Admins can visit `/test-email` to send a test message and confirm SMTP is configured. It sends to the admin's own email (or `?to=someone@example.com`), shows the current mail config, and displays the exact error if sending fails — handy after editing the server `.env`.

## [0.9.62] - 2026-09-13

### Added
- **Join requests — track sent emails.** Each request now records when an email was last sent, how many have been sent, and the last subject. Shown on the request card ("✉ Emailed N times, last …") and in the email dialog. Requires a new migration (visit `/migrate` after deploy).

## [0.9.61] - 2026-09-13

### Changed
- **Join form — clearer confirmation after submitting.** Previously the form simply cleared itself after a successful submission, which looked like nothing happened. It now shows a dedicated "Request received" confirmation screen (checkmark, thank-you message, "Back to sign in" button, and a "Submit another request" link) in place of the empty form.

## [0.9.60] - 2026-09-13

### Added
- **"Join in" membership requests.** Prospective members can now request to join from the login page.
  - **Login page** — a "Join in" button below "Sign In", with an info (ⓘ) icon that opens a popup explaining the process.
  - **Public join form** (`/join`) — collects name and email (required), date of birth, and an optional message. Duplicate open requests from the same email are ignored.
  - **New `join_requests` table** with statuses: pending, processing, approved, rejected.
  - **Admin resolve page** (`/join-requests`, admin/superuser) — filter by status with counts, and per request: **Create account** (creates a Member with auto membership number and age-derived category, then the applicant activates their login on first sign-in), **Mark processing**, **Reject**, **Email** (send a custom message to the applicant), and **Delete**.
  - **Nav badge** — a red count of open (pending + processing) requests appears on the "Join Requests" menu item for admins/superusers.

### Deploy note
- After deploying, an **admin must visit `/migrate` once** to create the `join_requests` table.

## [0.9.59] - 2026-09-13

### Changed
- **Login — clearer first-time sign-in message.** The info box previously read "Enter your email and choose a password to create your account," which implied open self-registration. It now reads "If your club has registered you, enter your email and choose a password to activate your account," accurately reflecting that accounts are pre-created by the club and the first sign-in just sets the password.

## [0.9.58] - 2026-08-28

### Changed
- **Attendance — Yearly view now available to all users.** The yearly attendance view was previously restricted to admin/superuser. The "Yearly view" button now shows for everyone, and the `/attendance/yearly` route was moved out of the `role:admin,superuser` guard so all authenticated users can access it (same read-only all-members data the monthly view already exposes). Editing actions (import, sessions, marking) remain admin/superuser only.

## [0.9.57] - 2026-08-28

### Changed
- **Attendance — "Monthly view" button made prominent.** The "Monthly view" link on the Yearly attendance page now matches the same solid blue treatment (blue background, white bold text, shadow, calendar icon) as the "Yearly view" button, for consistent, clearly actionable navigation between the two views.

## [0.9.56] - 2026-08-28

### Changed
- **Attendance — "Yearly view" button made prominent.** The link next to the Attendance Tracking heading was a faint light-gray pill that was easy to miss. It now uses the same solid blue treatment as the "Add Session" button (blue background, white bold text, shadow, hover state) with a calendar icon, so it clearly reads as an action.

## [0.9.55] - 2026-08-19

### Fixed
- **Payments — empty cell now pre-fills the default amount for new members.** Clicking an empty month cell filled the amount with the expected/default for older members but not for recently-added ones. New members have no payment records yet (records are only created when a year is initialized), so there was no `expected_amount` to fall back on. The payments page now derives a per-month default from the active rate presets and uses it as the fallback, so an empty cell fills correctly for every member.

## [0.9.54] - 2026-08-19

### Changed
- **dbcrews pull — API key required.** The dbcrews public feeds are now key-protected. The pull integration sends the key as the `X-Api-Key` header on all three endpoints (teams, competitions, results). Key is read from `DBCREWS_API_KEY` in the server `.env` (never hardcoded); falls back to the older `DBCREWS_RESULTS_KEY` name. A 401 now surfaces a clear "dbcrews API key missing or invalid" message.
  - **Set `DBCREWS_API_KEY=<key>` in the server `.env`**, then hit `/clear-cache` (as admin) so config picks it up. Without it, the pull page shows the 401 error.

## [0.9.53] - 2026-08-19

### Changed
- **dbcrews pull — rename-proof dedupe via stable competition id.** Each result row now carries `competitionId` from dbcrews. Achievements gained a nullable `dbcrews_competition_id` column, and the pull dedupe key is now **member + dbcrews_competition_id + competition_class + medal** when a competition id is present (immune to event renames). Rows without a competition id (older CSV imports) still dedupe by event name.
  - **Run the migration after deploy:** visit `/migrate` as admin (adds `dbcrews_competition_id`). Do this **before** the next pull.

## [0.9.52] - 2026-08-19

### Added
- **Achievements — delete an event.** In Club Achievements view, admin/superuser get a "Delete event" button on each event card that removes every member's achievements for that event (with confirm). Handy for clearing a renamed event before re-pulling from dbcrews.

### Changed
- **dbcrews pull — clearer skip breakdown.** The pull/preview report now splits "skipped" into **already recorded** (dedupe hit), **unmatched member** (no local membership number), and **invalid** (missing fields), so it's obvious when existing records are correctly detected. Dedupe key is unchanged (member + event_name + competition_class + medal); note it is sensitive to event renames on the dbcrews side.

## [0.9.51] - 2026-08-19

### Added
- **Achievements — Pull from dbcrews: dry-run + Apply.** The pull page now has a **Preview (dry run)** button that reports exactly what *would* be inserted (a full list of member / race / medal / event rows) plus skipped and unmatched counts, **without writing anything**. A separate **Apply** button (enabled only after a preview that has new rows, showing the count) performs the actual insert-only import.

## [0.9.50] - 2026-08-19

### Added
- **Achievements — Pull from dbcrews.** New admin/superuser page (`/achievements/pull`) that imports competition results from the dbcrews public feed (`https://dbcrews.motion.rs/api/public`). Flow mirrors dbcrews: pick a **Team**, then a **Competition** (or "All competitions"), then pull.
  - Fetches teams (`/teams`) and competitions (`/competitions?team=`) via server-side proxies so the optional API key stays server-side (sent as `X-Api-Key` when `DBCREWS_RESULTS_KEY` is set).
  - Inserts results into `achievements` **insert-only**, keyed by `member_id + event_name + competition_class + medal` — never updates or deletes existing rows. `memberId` from the feed is matched to our `membership_number`; `race`→`competition_class`, `event`→`event_name`, `medal` uppercased.
  - Reports **inserted / skipped / unmatched** counts, listing membership numbers with no local member.
  - Config in `config/services.php` (`services.dbcrews`); optional `.env`: `DBCREWS_BASE_URL`, `DBCREWS_RESULTS_KEY`.

## [0.9.49] - 2026-05-11

### Added
- Home dashboard: **Notes** card (rose tile) linking to `/notes`. Visible only to admin/superuser, placed right after the Ledger card.

## [0.9.48] - 2026-05-11

### Added
- **Notes** — new admin-only section (sibling to Ledger), reachable from the main nav. Records are explicitly **not counted into the official Ledger balance** — this is a simple scratch-pad for amounts the club wants to track per member that should *not* affect cash/bank balances.
  - Entry fields: `entry_date`, `member_id` (required), `note_category_id` (required), `amount` (required, `decimal(12,2)`), `description` (optional).
  - Index page lists all notes with **member** and **category** multi-select filters, plus a total of the currently-filtered set. Add / edit form is in-page; soft-deleted entries can be restored from `/notes/deleted`.
  - Categories live in a **separate `note_categories` table** (no relation to Ledger categories) and are managed at `/notes/categories` with the same name+sort+active shape Ledger uses. No `kind` field — categories here are flat since amounts don't roll up.
  - Routes are gated by `middleware('role:admin,superuser')` same as Ledger.
  - **Run `php artisan migrate` on the server** to create `note_categories` and `notes` tables before the page becomes usable.

## [0.9.47] - 2026-05-10

### Changed
- Payments page: when an admin registers a member's payment, the auto-created Ledger entry is now assigned to category **članarina** (Serbian) instead of **Membership**. Applies to the import flow as well.
- Migration `2026_05_10_120000_rename_membership_category_to_clanarina` renames the existing **Membership** ledger category to **članarina** in place, so historical Ledger entries (which reference the category by id) display the new label automatically. If a **članarina** category already exists, the old row is merged into it (entries + staging rows repointed) and the orphan **Membership** row is deleted. **Run `php artisan migrate` on the server to apply.**

## [0.9.46] - 2026-05-10

### Added
- Tools → Kalkulator vremena: third mode **„Iz brzine i vremena → distanca"**. Given speed (km/h) and time (mm:ss.zzz), computes the distance in meters. Wind correction is intentionally not applied in this mode — distance/wind hidden when the mode is active.

## [0.9.45] - 2026-05-09

### Removed
- "imported" badge no longer shown on Ledger entries — visual clutter, no actionable difference between manual and imported entries day-to-day. The `source` field is still on the model and can be inspected via DB or the Edit form if needed.

## [0.9.44] - 2026-05-09

### Changed
- **Description** column hidden on the Ledger month-view entries table — Member + Category are usually enough context. Imported badge moved to the Date cell so it's still visible.
- **Description** field is no longer required on Add / Edit entry. Validation rule relaxed to nullable; backend coerces to empty string for the NOT NULL DB column. Existing entries are unaffected.
- Delete-confirm modal now hides the dash separator when description is empty and adds Member / Category to the metadata line so the entry is still uniquely identifiable.

### Removed
- **Reset opening balances** link is hidden from the Ledger action bar so it can't be hit by accident. The backend route stays (`POST /ledger/opening-balances/reset`) so the action can be re-enabled later by adding the button back.
- **Import** link is hidden from the Ledger action bar — current-year data is in, no more imports planned for now. Routes (`/ledger/import*`) and controller methods are preserved for future use (e.g. importing prior years' XLSX).

## [0.9.43] - 2026-05-09

### Added
- Second **+ Add entry** button on the Ledger month view, placed below the entries table, so admins on a long list don't need to scroll back to the top to add a new row.

## [0.9.42] - 2026-05-09

### Changed
- Replaced every `window.confirm()` call across the app with a new reusable `ConfirmModal` component (in-page Tailwind modal), so destructive actions don't fall victim to mobile Chrome dialog suppression. Converted:
  - **Ledger:** delete entry, reset opening balances, delete category, wipe import batch, cancel import, restore deleted entry
  - **Payments:** delete payment record, initialize year (12 × N records confirmation), delete rate preset
  - **Attendance:** delete session
- Modal supports `danger` (red confirm) / default (blue confirm), custom `confirmLabel`/`cancelLabel`, and either string or rich-React `message` content. Click on the dim backdrop also cancels.

## [0.9.41] - 2026-05-09

### Fixed
- Ledger entry **Delete** appeared to do nothing on mobile Chrome (especially for superuser sessions). Cause: the action used `window.confirm()`, which mobile Chrome can suppress or render off-screen behind the fixed header. Replaced the native confirm with an in-page Tailwind modal that shows the entry's date, description, type, bucket, amount, and a hint about restoring from the deleted-entries page. Cancel / Delete buttons sit inside the modal so the prompt is always visible regardless of browser behaviour.

## [0.9.40] - 2026-05-09

### Added
- **Petty cash (kusur):** new `Add` and `Sub` buttons next to `Edit` on the Ledger month view. `Add` increments the float, `Sub` decrements it (with a guard against going negative), `Edit` still sets the absolute value as before. Each form takes an optional note.
- **Audit log for petty cash changes:** every Edit / Add / Sub now writes a row to a new `ledger_petty_cash_audits` table (operation, delta, previous_amount, new_amount, note, user_id, created_at). The 20 most recent entries are shown in a collapsible "History" panel under the petty cash card, so admins can see who changed it, when, by how much, and why.

### Migrations
- `2026_05_09_150000_create_ledger_petty_cash_audits_table` — run `php artisan migrate` on the host after pull.

## [0.9.39] - 2026-05-09

### Added
- New ledger bucket **Cash EUR** (`cash_eur`) inserted between Bank RSD and Bank EUR in the display order. Lets admin record physical cash held in euros separately from the EUR-denominated bank/reserve.
- Migration expands the `bucket` ENUM on `ledger_entries` and `ledger_import_staging` from `('cash','bank','eur')` to `('cash','bank','cash_eur','eur')`. Run `php artisan migrate` on the host after pull.

### Changed
- All places that show buckets now show 4 instead of 3: month-view summary cards, entries table balance column, filter dropdowns, add/edit entry form, Annual report year totals, monthly grid (12 numeric columns instead of 9), Excel Summary + Monthly sheets, PDF Blade template (switched to A4 landscape so the wider monthly table fits).
- React pages now derive bucket lists from a single `BUCKETS` constant instead of hardcoded arrays, so future bucket changes are one-line edits.

## [0.9.38] - 2026-05-09

### Fixed
- Kalkulator vremena: na mobilnom (Chrome Android, srpski locale) numerički keyboard nudi samo zarez `,`, koji `<input type="number">` odbija — pa se nije mogla uneti decimalna vrednost. Sva numerička polja na Tools stranici (Custom distanca, GPS brzina, Brzina vetra, koeficijenti vetra) sada koriste `type="text"` + `inputMode="decimal"` i prihvataju kako `,` tako i `.` kao decimalni separator. Parser vremena (`mm:ss.zzz`) takođe prihvata `,` u sekundama (npr. `00:45,500`). Editor koeficijenata sada čuva sirove stringove tokom kucanja, pa se delimični unosi tipa `0,` / `0.` više ne resetuju u `0`.

## [0.9.37] - 2026-05-09

### Changed
- Renamed bucket display labels everywhere they appear: **Cash → Cash RSD**, **Bank → Bank RSD**, **EUR → Bank EUR**. Underlying enum values (`cash`, `bank`, `eur`) are unchanged, so no migration and no data conversion. Updated locations: Ledger month view (summary cards, entries table, filter dropdowns, entry form), Annual Report page + PDF + Excel column headers, Import Review page, Deleted entries page.

## [0.9.36] - 2026-05-09

### Changed
- **Ledger** and **Tools** are now accessible to **superuser** in addition to admin. Route middleware (`role:admin` → `role:admin,superuser`) updated for both `/ledger/*` and `/tools/*`. Home dashboard cards and top-nav menu items (desktop + mobile sidebar) now use `canManage` instead of `isAdmin`.

## [0.9.35] - 2026-05-09

### Added
- **Role** column on Members list (admin-only). Desktop table gets a new column between Category and Active; mobile cards show a role badge alongside the category badge. Color-coded: admin red, superuser purple, user gray. Empty for members without a linked login account. Members list query eager-loads `user.role` to avoid N+1.

## [0.9.34] - 2026-05-09

### Added
- **Login Role** dropdown on Member Edit page (admin-only). Lets admin promote/demote a member's linked login account between admin / superuser / user. Hidden for superusers. Self-demotion blocked (server-side guard + disabled UI). If member has no linked login account, shows hint to create one via password reset on the member page.

## [0.9.33] - 2026-05-09

### Added
- Kalkulator vremena — drugi režim **Iz brzine → vreme**: unesi GPS brzinu (km/h) i dobiješ vreme za odabranu distancu, plus korekciju za vetar.
- Kalkulator vremena — sekcija **Podešavanja koeficijenata vetra po distanci** (collapsible). Tabela 4 distance × 3 faktora (U leđa / U prsa / Bočni). Eksplicitno **Sačuvaj** dugme + indikator nesačuvanih izmena + dugme "Vrati podrazumevano" (0.02 / 0.03 / 0.01 za svaku distancu).
- **Nova tabela `tool_settings`** (key/value), model `App\Models\ToolSetting`, novi `ToolsController` sa `GET /tools` i `PUT /tools/coefs` (admin only). Po-distanca koeficijenti se čuvaju u DB pod ključevima `wind_coef_{200|500|1000|2000}_{tail|head|side}` i važe za sve admine. **Pokrenuti `php artisan migrate` na serveru posle pull-a.**
- Custom distanca koristi koeficijente najbliže predefinisane (200/500/1000/2000), uz vidljiv hint koja je odabrana.
- "Custom" kao poslednja opcija u distance select-u — kad se odabere, ispod se pojavljuje slobodan numerički input za bilo koju distancu.

### Changed
- Distanca je sada select sa standardnim dragon-boat distancama (200 / 500 / 1000 / 2000 m) + Custom, umesto slobodnog unosa.

## [0.9.32] - 2026-05-09

### Added
- New **Tools** page at `/tools` (admin-only) accessible from a Home dashboard card and a top-nav menu item (desktop + mobile sidebar).
- First tool: **Kalkulator vremena** — dragon-boat speed/time calculator. Inputs: distance (m), race time (mm:ss.zzz), wind speed (km/h), wind direction (U leđa / U prsa / Bočni). Live outputs: GPS/average speed, wind-corrected speed, wind-corrected time. Wind correction: tailwind −0.02·v_w, headwind +0.03·v_w, side +0.01·v_w (km/h, floor 0.1 km/h). Ported from the team's Google Sheets calculator.

## [0.9.31] - 2026-05-09

### Added
- New **Yearly attendance grid** at `/attendance/yearly` (admin/superuser only). Members on rows × 12 month columns showing how many sessions each member attended in each month, plus a Total column per member. Header row shows how many sessions were held each month so admin can compare attendance vs. opportunity. Footer row totals attendance across all members per month. Optional filter by session type and active/all members. Year selector mirrors the existing monthly attendance view.
- "Yearly view" link added to the Attendance Tracking page header (admin/superuser only).

## [0.9.30] - 2026-05-09

### Changed
- Moved the Reports button on the Ledger page to the left side, next to the "Ledger" title, so it sits separately from the per-month action group on the right (year/month selectors, Categories, Import, Export).

## [0.9.29] - 2026-05-09

### Fixed
- Annual Ledger Report's bucket totals card was misleading for buckets with carried-forward opening balances but no in-year transactions (e.g. EUR showing all zeros even though the year started with 1,286 RSD-equivalent EUR seeded from the XLSX). The card summed entries only, but opening balances live in `payment_settings`. Cards now show four lines: Opening / Income / Expense / Closing — matching the monthly view's bucket cards. Excel Summary sheet and PDF totals card updated to match.

## [0.9.28] - 2026-05-09

### Added
- Annual Ledger report page at `/ledger/reports/annual` (admin-only). Year selector at top, then four sections:
  - Per-bucket year totals (Income / Expense / Net for Cash / Bank / EUR)
  - Monthly breakdown table (12 rows × 9 columns: income, expense, closing per bucket per month)
  - Per-category totals (Income, Expense, Net for every category that had activity in the year)
  - Per-member contributions (Membership / Registration / Other / Total per member, income only)
- **Download PDF** — server-side render via dompdf, A4 portrait, single-click download.
- **Download Excel** — multi-sheet workbook (Summary / Monthly / Categories / Members) using PhpSpreadsheet.
- "Reports" link added to the Ledger month view next to Categories / Import.

### Changed
- Added composer dependencies: `barryvdh/laravel-dompdf ^2.2` (and its `dompdf/dompdf 2.0.8` engine), both PHP 8.0 compatible. Run `composer install` on the host once after pull.

## [0.9.27] - 2026-05-09

### Fixed
- Reversing payment status from paid → exempt/pending was unintentionally deleting the whole payment row alongside the ledger mirror. Cause: `MembershipPayment::removeLedgerEntry` was force-deleting the linked entry first and clearing `ledger_entry_id` second; the new ledger-side `deleting` hook from v0.9.26 saw the link still set, found the payment, and cascaded the delete back. Now `removeLedgerEntry` clears the link first, so the entry's own delete hook can no longer reach the payment.

## [0.9.26] - 2026-05-09

### Added
- Two-way sync between Membership payments and their linked Ledger entries:
  - **Updating** a payment-linked ledger entry (amount, entry_date, or bucket) writes back to the payment: `paid_amount`, `payment_date`, and `payment_method` are kept in step. Bank bucket maps to whatever the payment already had (`card` or `bank_transfer`); cash bucket → `cash`; EUR bucket leaves the payment_method untouched (no EUR method exists).
  - **Deleting** a payment-linked ledger entry deletes the corresponding payment too (link is broken first to prevent the payment's own delete hook from re-firing on the entry).
  - Description, category, and member are still ledger-only and don't propagate back.

## [0.9.25] - 2026-05-09

### Fixed
- Deleting a Membership Payment was silently re-creating the payment row right after it was deleted. Cause: my Ledger sync hook called `saveQuietly()` to clear `ledger_entry_id`, but on a model with `exists=false` (post-delete) save() flips to INSERT and resurrected the row with the same id. Now the link-clearing save is gated on `$this->exists`, so it runs during normal updates but is skipped during deletion. Linked ledger entry still gets force-deleted as before.

## [0.9.24] - 2026-05-09

### Changed
- Auto-synced payment-derived ledger entries now use a shorter description: "Membership MAY" instead of "Member Name — Membership MAY 2026". Member name is already shown in its own column, year is already implicit in the entry date and selected month.

## [0.9.23] - 2026-05-09

### Added
- Membership payments are now mirrored into the Ledger automatically. When a `MembershipPayment` is saved with status=paid, paid_amount > 0, payment_date, and a payment_method, a `LedgerEntry` is created (or updated, if it already existed) with: type=income, member linked, category="Membership" (auto-created), bucket = cash for `cash` method or bank for `card`/`bank_transfer`, description like "Member Name — Membership APR 2026". Payments and entries have a 1:1 link via `membership_payments.ledger_entry_id`.
- Clearing any of the qualifying fields (status away from paid, amount → 0, date null, method null) deletes the linked ledger entry. Deleting the payment removes the entry too.
- Manual deletion of the ledger entry from the Ledger view nulls out the link on the payment side (FK uses nullOnDelete); the next time the payment is touched, a fresh entry is created.

### Migration
- Adds `ledger_entry_id` (nullable FK to `ledger_entries`, nullOnDelete) on `membership_payments`.

## [0.9.22] - 2026-05-09

### Changed
- Replaced the separate Totals panel with a single footer row inside the entries table itself: "Total" label spanning the descriptive columns, then summed Income and Expense values aligned under their respective columns. Reflects the visible (filtered) rows.

## [0.9.21] - 2026-05-09

### Added
- Totals footer below the Ledger entries table — three bucket cards (Cash / Bank / EUR), each showing Income, Expense, and Net for the currently visible rows. Header reads "Totals (filtered)" when filters are active, otherwise "Totals (this month)". Always reflects exactly what's in the table.

## [0.9.20] - 2026-05-09

### Fixed
- Ledger filter dropdowns closed immediately on every selection because the Inertia navigation was using `preserveState: false`, which tore down React state on each request. Switched filter changes to `preserveState: true` so the open dropdown stays open while the user picks multiple values.

## [0.9.19] - 2026-05-09

### Changed
- Ledger filters revert to a dropdown look but support multi-select via checkboxes inside the dropdown panel. Closed state shows the selected label (or "N selected" when more than one); panel has a "Clear" link when anything is selected. Outside-click closes.

## [0.9.18] - 2026-05-09

### Changed
- Ledger filters (Type / Bucket / Category) are now multi-select. Each value is a clickable pill — click to add to the filter, click again to remove. E.g. select Cash + Bank to see both buckets at once, or Membership + Registration to see both categories. "Clear all filters" link removes everything in one click.

## [0.9.17] - 2026-05-09

### Added
- Three filter dropdowns on the Ledger month view: **Type** (Income / Expenses), **Bucket** (Cash / Bank / EUR), **Category** (any defined category, or Uncategorized). Filters compose, persist across year/month navigation, and a one-click "Clear filters" link removes them all. Summary cards always show the unfiltered month totals so the financial picture stays accurate; only the entries table is filtered.

## [0.9.16] - 2026-05-09

### Fixed
- Ledger import was silently dropping a row when two genuinely identical income/expense rows appeared on the same day (e.g. one member paying two months at once with the same amount, date, bucket, and description). The `source_hash` collided so the second row was skipped as a duplicate. Now the hash includes `tab_gid` and `sort_order` from the source CSV/XLSX, so two rows at different positions are distinct even when their content is byte-identical. Re-imports of the same file remain idempotent because positions are stable.

## [0.9.15] - 2026-05-09

### Fixed
- After wiping the imported Ledger batch, balances were still showing despite zero entries. Cause: opening-balance seeds (e.g. `ledger_opening_balance_cash_2026 = 41550`) live in `payment_settings`, not in the batch, so wipe didn't touch them. Now Wipe also clears all `ledger_opening_balance_*` settings when the last batch is removed, so the next import re-seeds cleanly.

### Added
- **Reset opening balances** action in the ledger Index action bar. Clears all `ledger_opening_balance_*` seeds in one click. Useful if the seed values are stale and a re-import is planned.

## [0.9.14] - 2026-05-09

### Changed
- Wipe button on the Ledger import page now appears for any batch (staging, committed, cancelled) — previously only for committed. Useful for clearing out abandoned import attempts that never got committed. Confirm message reads naturally when the batch created zero entries.

## [0.9.13] - 2026-05-09

### Added
- **Wipe** button on each committed batch in the Ledger import page. Permanently hard-deletes the batch, its staging rows, and every ledger entry it created — so a clean re-import after a parser change actually re-creates the rows instead of being skipped by the source-hash idempotency check. Confirmation prompt shows the entry count.

## [0.9.12] - 2026-05-09

### Added
- Ledger import auto-picks category for income rows linked to a member: description contains "reg" → category **Registration**, otherwise → category **Membership**. Both categories are auto-created on first use. Applies in both auto-suggestion (server-side) and when admin manually changes the member dropdown on the review page (client-side). Skipped for expense rows even if a member is set.

## [0.9.11] - 2026-05-09

### Added
- Optional **member** field on every ledger entry, since income labels in the source sheet (igor, zvonko, Srki, …) are usually members paying their monthly membership.
- Manual entry form: member dropdown alongside the category dropdown.
- Import review: per-group member dropdown with auto-suggest. Match priority: exact full-name, exact first-name match, unique whole-word substring inside the member's name. Suggestion is only made when exactly one active member matches; otherwise admin picks manually.
- Entries table on the month view now shows a Member column.

### Migration
- Adds `member_id` (nullable FK to members) on `ledger_entries`.
- Adds `suggested_member_id`, `mapped_member_id` (nullable FK to members) on `ledger_import_staging`.

## [0.9.10] - 2026-05-09

### Fixed
- Ledger import was reading expense descriptions from the wrong column. In the source sheet the description for both income AND expense rows lives in column 1 (the "prihodi" header column); the "rashodi" header in column 6 only labels the expense AMOUNT columns. Expense rows like `bankarski troskovi` (column 1) with `500` in the bank-expense column were importing with empty descriptions. The parser now reads description from column 1 for both income and expense rows.

## [0.9.9] - 2026-05-09

### Removed
- Google Sheet URL import path. XLSX upload is the only ledger import option now — simpler UI, and the URL flow was unreliable from the host's network anyway. Deleted `GoogleSheetCsvFetcher` and the URL toggle on the import page.

## [0.9.8] - 2026-05-09

### Fixed
- After running `composer install` for the Ledger XLSX deps, the app crashed on every Inertia page with `Class "Inertia\Middleware" not found`. Cause: `inertiajs/inertia-laravel` was previously installed manually on the host but never recorded in composer.json, so composer install removed it as an orphan. Added it explicitly: `inertiajs/inertia-laravel ^1.0` (locked to 1.3.4 — supports PHP 8.0 and is backward-compatible with the 2.x JS client already in use).

## [0.9.7] - 2026-05-09

### Fixed
- `composer install` still failing on the host: prior `composer require` ran with `--ignore-platform-req=php+` against a local PHP 8.5, which let Symfony 6.4/7.x (PHP 8.1+) and other transitive deps slip into the lock file. Added `config.platform.php = "8.0.30"` in composer.json so composer always resolves for the host's PHP version regardless of the developer's local PHP, and re-resolved the lock — Symfony pinned to 6.0.x, all other deps now PHP 8.0-compatible.

## [0.9.6] - 2026-05-09

### Fixed
- `composer install` failed on the host because phpspreadsheet 1.30.x pulled in `maennchen/zipstream-php 3.x` which requires PHP 8.3+ (host runs 8.0). Pinned phpspreadsheet to `1.29.*` and zipstream-php to `^2.1`. Both 2.x lines support PHP 7.4+.

## [0.9.5] - 2026-05-08

### Added
- Ledger import now accepts an XLSX/ODS file upload as the primary path. In Sheets, do **File → Download → Microsoft Excel (.xlsx)** and upload the single file — all 12 tabs are read in one pass with no Sheets API or publishing required. Tab names are used as month labels.
- Toggle on the import page lets admins switch between XLSX upload (recommended) and the Google Sheet URL flow.

### Changed
- Added dependency `phpoffice/phpspreadsheet ^1.29` (PHP 7.4+ compatible). Run `composer install` on the host once after pulling.

## [0.9.4] - 2026-05-08

### Fixed
- Ledger Sheet importer rejected the published-to-web URL (format `/spreadsheets/d/e/<publish_id>/pubhtml`) because the sheet-ID regex was matching the literal letter "e" instead of the publish ID. Now recognizes both the regular `/d/<sheet_id>/edit` shape and the published `/d/e/<publish_id>/pubhtml` shape, and uses the right CSV endpoint for each (`/pub?gid=…` for published, `/export?format=csv` for regular). Added a third HTML pattern for tab discovery on published menus.

## [0.9.3] - 2026-05-08

### Fixed
- Ledger Sheet importer was getting Google's German marketing landing page (HTTP 400) instead of CSV when running from the German-located host with Guzzle's default User-Agent. Added a real browser User-Agent + `Accept: text/csv` headers, removed the auto-throwing `retry()`, and fall back across `/export`, `/gviz/tq`, and `/pub?output=csv` endpoints. Errors now name the actual failure instead of bubbling up the marketing page HTML.

### Changed
- Import page now asks for "Published to web" instead of "Anyone with the link" — the tab-discovery endpoint (`/pubhtml`) only responds for published sheets. Plain link-sharing won't enumerate the 12 monthly tabs.

## [0.9.2] - 2026-05-08

### Fixed
- Ledger migrations failed on the shared MariaDB host because it does not support the `json` column type. Switched `ledger_import_batches.summary_json` and `ledger_import_staging.raw_row_json` to `text`; Eloquent `array` casts already serialize/deserialize JSON transparently.

## [0.9.1] - 2026-05-08

### Added
- Ledger card on the admin dashboard, alongside Members/Attendance/Payments

## [0.9.0] - 2026-05-08

### Added
- New admin-only **Ledger** module — daily cash-book that recreates the club's Google Sheet workflow
  - Tracks income and expenses across 3 separate buckets: cash (keš), bank account (račun), and EUR (evri); buckets never auto-convert
  - Multi-year support; primary view is a month-at-a-time list with year + month selector that mirrors the source sheet
  - Per-month summary card per bucket: opening balance (carried from prior month), income, expenses, closing balance
  - Petty-cash float (kusur) as a single editable setting on the page, stored in `payment_settings`
  - Manual entry CRUD (date, type, bucket, amount, description, category, notes) with soft-delete and restore
  - Editable categories with kind (income/expense/both), normalized-name uniqueness, and entry counts
  - Bulk import from a Google Sheets share URL: app fetches `/pubhtml` to discover all tabs, downloads each as CSV, parses Serbian-locale decimals and dd.mm. dates, and stages everything for review
  - Import review screen groups rows by description+type+bucket; each group can be mapped to an existing category, create a new category, imported uncategorized, or skipped
  - Idempotent re-import via `source_hash` — re-running the import never duplicates rows; manually-edited entries are preserved and reported as skipped
  - Deleted-entries view per month with one-click restore for reconciliation
  - Per-month and per-year CSV export (UTF-8 BOM for Excel)
- New tables: `ledger_categories`, `ledger_entries`, `ledger_import_batches`, `ledger_import_staging`
- New `Ledger` link in the admin nav (desktop + mobile)

## [0.8.19] - 2026-04-14

### Added
- Admin/superuser can reset a member's login password directly from the member detail page. Creates a linked user account if the member did not have one yet.

## [0.8.18] - 2026-04-14

### Added
- Client-side image resizing for member profile photos: oversized images are downscaled to max 1200px and compressed to under 2 MB in the browser before upload, instead of being rejected
- "Image resized from X MB to Y MB" info message shown when resize happens

## [0.8.17] - 2026-04-14

### Removed
- Leftover Calendly-to-Supermove integration from unrelated test project
- `app/Http/Controllers/Api/CalendlyWebhook.php`, `app/Services/CalendlyToSupermoveTransformer.php`
- `/api/calendly-webhook` route and `calendly`/`supermove` config blocks

## [0.8.16] - 2026-04-14

### Changed
- Member create/edit no longer fails the whole save when image upload fails; member data is saved and a warning explains why the image was not stored
- Image upload errors now report the actual cause (exceeds server limit, interrupted, temp dir missing, etc.) instead of the generic "The image failed to upload."
- Member form now shows a 2 MB size hint and blocks oversized images client-side before submit

### Added
- Global flash message display in Layout so success/warning banners appear on every page

## [0.8.15] - 2026-02-19

### Changed
- Member profile now shows all 12 months of payments (January to December) instead of last 6
- Missing months displayed as "Pending" status
- Renamed section from "Recent Payments" to "Payments"

## [0.8.14] - 2026-02-19

### Fixed
- Password reset links now work even if user is already logged in
- Moved forgot/reset password routes out of guest-only middleware

## [0.8.13] - 2025-02-16

### Changed
- Member Rankings now uses consistent blue badges for all ranks

## [0.8.12] - 2025-02-16

### Changed
- Replaced "Top Attendees" (top 5) with full "Member Rankings" showing all members
- Added scrollable list with all members ranked by attendance
- Color-coded attendance rates (green 100%, blue 75%+, yellow 50%+, gray below)
- Improved Session Type Breakdown layout with responsive grid

## [0.8.11] - 2025-02-16

### Changed
- Updated app icon/favicon with new stylized "M" logo

## [0.8.10] - 2025-02-16

### Added
- Favicon support using club logo (32x32 and 16x16 PNG versions)
- Browser tab now displays ClubMotion logo icon

## [0.8.9] - 2025-12-19

### Improved
- Mobile-friendly design improvements across multiple pages
- Payments page: responsive stats grid (2 cols mobile → 5 cols desktop)
- Payments page: new mobile card view with 4x3 month grid for touch-friendly editing
- Payments page: header buttons stack on mobile, hidden admin actions on small screens
- MyPayments page: responsive header layout and mobile card view for payment history
- Members/Show: responsive profile image sizing (smaller on mobile)
- Home page: responsive welcome text sizing

## [0.8.8] - 2025-12-19

### Changed
- Replaced separate Year and Month dropdowns on Attendance page with unified month navigator
- New month selector with left/right arrow buttons for easier navigation
- Automatically handles year rollover when navigating between December/January

## [0.8.7] - 2025-12-19

### Added
- Annual payment feature: members can pay 32,000 RSD for 12 consecutive months
- Annual payments can span across calendar years (e.g., July 2025 - June 2026)
- Purple "A" button in payment grid to initiate annual payment for each member
- Annual payment modal with start month/year selection and coverage preview
- Purple styling for annual payment cells in grid (amount + "A" suffix)
- Annual payment settings page at /payments/annual-settings
- New payment_settings table for configurable annual amount
- Added is_annual_payment and annual_payment_group_id columns to track annual payments

### Technical
- New PaymentSetting model for managing payment configuration
- Database migrations for payment_settings table and annual payment columns
- AnnualPaymentModal component in Payments/Index.jsx
- New AnnualSettings.jsx page for admin configuration

## [0.8.6] - 2025-12-19

### Changed
- Database: payment_status column now allows NULL values
- Migration also updates existing 2026 pending records to NULL

## [0.8.5] - 2025-12-19

### Changed
- Payment initialization now creates records with null status instead of "pending"
- Null status cells appear empty and ready for quick entry
- Clicking unprocessed cell: defaults to "Paid" with expected amount pre-filled
- Clicking existing payment: preserves current status and amount

## [0.8.4] - 2025-12-19

### Improved
- Payment entry workflow: clicking empty cell now defaults status to "Paid" for faster data entry
- Amount field pre-populated with expected value when opening payment modal
- Shows "Expected: X" label in payment modal for reference

### Changed
- Existing payments retain their current status when editing (only empty cells default to Paid)

## [0.8.3] - 2025-12-19

### Added
- Configurable payment rate presets stored in database
- New Rate Presets management page at /payments/presets
- CRUD operations for payment rate presets (add, edit, delete, toggle active)
- Dynamic preset buttons on payment initialization page loaded from database

### Changed
- Payment rate presets are no longer hardcoded in frontend
- Admins can now modify preset values without code changes

## [0.8.2] - 2025-01-24

### Added
- Auto-open attendance modal after creating new session for immediate attendance marking
- Smart modal behavior when deleting sessions: refreshes if other sessions remain, closes if last session deleted

### Improved
- Attendance workflow: create session → immediately mark attendance in one smooth flow
- Payment modal now preserves scroll position using Inertia's preserveScroll option
- Payment date format conversion between backend (d.m.Y) and frontend (Y-m-d) for proper display

## [0.8.1] - 2025-01-23

### Fixed
- Payment date now properly recorded when entering payments
- Payment date field now defaults to today's date for new payment entries
- Payment date automatically populates with today's date when status changes to "Paid"
- Payment date field now always visible and editable for admin and club managers regardless of payment status
- Admin and club managers can now change payment dates to record historical payments or correct dates

## [0.8.0] - 2025-01-06

### Changed
- Combined My Achievements and Club Achievements into single unified page with toggle view
- Added toggle buttons to switch between "My Achievements" and "Club Achievements" views
- Club achievements now highlight with green background and checkmark when user has personally won that achievement
- Simplified navigation with single "Achievements" link in header menu and home page
- Consolidated routes to `/achievements` with legacy redirects from old URLs

### Removed
- Separate Club Achievements page (merged into main Achievements page)

## [0.7.9] - 2025-01-06

### Added
- Club Achievements page showing all unique achievements earned by club members
- Page displays unique event/competition/medal combinations (no duplicates)
- Accessible at /club-achievements for all authenticated users
- "My Achievements" link on Club Achievements page to view personal achievements

## [0.7.8] - 2025-01-06

### Added
- Yearly Attendance Trend chart on Attendance page showing total attendance for all years with data
- Chart displays below Monthly Attendance Trend with green bars
- Only shows years with attendance > 0

## [0.7.7] - 2025-01-06

### Changed
- Attendance year dropdown now includes years from 2020 to current year + 2 (previously only showed current year ± 2)
- Attendance import now redirects to the imported year/month instead of current year

### Fixed
- Fixed issue where imported historical attendance data (e.g., 2022) wasn't visible because year wasn't in dropdown

## [0.7.6] - 2025-01-06

### Added
- Green checkmark (✓) displayed in front of member names in Members table for those who have registered in the app

## [0.7.5] - 2025-01-06

### Fixed
- Payment exemption reason "Other" now displays as "OTH" instead of "SAR" in payments table

## [0.7.4] - 2025-01-06

### Changed
- Payment amounts in Payments page table now display as whole numbers instead of shortened "k" format

## [0.7.3] - 2025-01-05

### Added
- Personal attendance chart now shows ratio format (attended/total sessions) for each month
- Inactive member login prevention with appropriate error message

### Changed
- Dynamic club name (CLUB_NAME) now used on Home page welcome message
- Removed max-width constraint for full-width responsive design

### Fixed
- Personal attendance count now only includes present=true records

## [0.7.2] - 2025-01-05

### Fixed
- Fixed user member relationship in attendance controller to correctly display personal monthly attendance chart

## [0.7.1] - 2025-01-05

### Added
- Personal monthly attendance chart for logged-in users on Attendance page
  - Displays "My Monthly Attendance - {year}" above general attendance chart
  - Green bars with current month highlighted in darker green
  - Shows user's attendance count per month throughout the year
  - Available for all users to track their own attendance

## [0.7.0] - 2025-01-05

### Changed
- Removed "Protected by ClubMotion Security" footer from login page

## [0.6.9] - 2025-01-05

### Added
- Dynamic club name from CLUB_NAME env variable
- Prominent first-time user message on login page with info box

### Changed
- Browser tab title now reads from APP_NAME env (defaults to "Club Management")
- Header logo displays custom club name from CLUB_NAME env
- First-time sign-in instructions now in highlighted blue box with icon

## [0.6.8] - 2025-01-05

### Added
- Category distribution chart on Members page
- List/Stats view toggle with icons on Members page
- Category statistics showing member count per category

### Changed
- Moved category chart from Attendance to Members page (better fit)
- Categories sorted by min_age then max_age (youngest to oldest)
- Category names display correctly on X-axis

### Fixed
- Fixed category name column reference (category_name vs name)
- Category chart now shows all categories with proper labels

## [0.6.7] - 2025-01-05

### Changed
- Improved category chart X-axis labels with larger, clearer text
- Category names now displayed prominently below each bar

## [0.6.6] - 2025-01-05

### Fixed
- Category distribution chart now uses fetched member categories correctly
- Added category data to attendance grid for proper stats calculation
- Chart displays actual category distribution from loaded members

## [0.6.5] - 2025-01-05

### Fixed
- Added missing MembershipCategory import in AttendanceController

## [0.6.4] - 2025-01-05

### Changed
- Category distribution chart now shows ALL categories (not just those with members)
- Categories sorted alphabetically on X-axis
- Y-axis shows member count (0 or more)

## [0.6.3] - 2025-01-05

### Added
- Category distribution bar chart in Attendance Stats view
  - Visual breakdown of active members by category
  - Color-coded bars with member counts
  - Sorted by count (most members first)

## [0.6.2] - 2025-01-05

### Fixed
- Fixed age-based category calculation for members with null category_id
- Categories now auto-assign to members without existing categories
- System properly handles both null categories and age-based category updates

## [0.6.1] - 2025-01-05

### Added
- Age-based category calculation system
  - Member categories now automatically calculated based on age
  - Categories update dynamically as members age without manual edits
  - Support for age ranges (min_age, max_age) in membership_categories table
  - Non-age-based categories (BCP, ACP, Paradragons) remain manual

### Changed
- Categories now recalculate on every member fetch, not just on create/update
- Category matching prioritizes narrowest age ranges first to avoid conflicts
- Category assignment happens automatically for age-based categories

### Technical
- Added is_age_based, min_age, max_age columns to membership_categories table
- Implemented calculateCategory() method in Member model with range size sorting
- Updated MemberController index() and show() methods to recalculate categories on fetch
- Auto-update database category when age-based category changes

## [0.6.0] - 2025-01-05

### Major Features

#### Complete Attendance Tracking System
- **Grid View**: Excel-like spreadsheet interface for marking attendance
  - Spreadsheet-style layout with members in rows and sessions in columns
  - Click checkbox to mark attendance (present/absent)
  - Real-time attendance counting per member and per session
  - Session type editing and deletion directly from grid headers
  - Sticky member name and number columns for easy scrolling
  - Color-coded session columns by type

- **Calendar View**: Monthly calendar visualization
  - Visual calendar grid showing all sessions per day
  - Click on any day to see detailed session information
  - Color-coded session indicators matching session types
  - Attendance count displayed for each day
  - Mobile-optimized with pull-to-refresh

- **Session Management**
  - Create sessions with date, type, and notes
  - Edit session types inline from grid view or calendar modal
  - Delete sessions with confirmation
  - Session types: Training (Blue), Competition (Green), Other (Orange)
  - Color-coding throughout the interface

- **Advanced Filtering**
  - Filter by year (current year ± 2 years)
  - Filter by month (all 12 months)
  - Filter by session type (Training, Competition, Other, or All)
  - Filter by member status (Active or All)
  - Filters persist across view changes

- **CSV Import**
  - Bulk import attendance data from CSV files
  - Auto-detection of members and sessions
  - Import validation and error reporting

- **Role-Based Access**
  - Admin and Superuser: Full edit access
  - Regular Users: View-only access
  - Mobile and desktop responsive design

#### Member Achievements System
- **Achievement Tracking**
  - Record member achievements with title, description, date, and category
  - Categories: Tournament, Competition, Award, Other
  - Display achievements on member profile pages
  - Group achievements by category with color coding
  - Chronological display of achievements

- **Achievement Management**
  - Add achievements to member profiles
  - Edit existing achievements
  - Delete achievements with confirmation
  - Category-based organization and filtering

### Minor Features & Enhancements

- **Session Types**: Simplified from 4 types to 3 (Training, Competition, Other)
- **Database Migration**: Update existing session types automatically
- **Mobile Optimization**: Pull-to-refresh on attendance calendar view
- **UI Improvements**: Enhanced hover effects and visual feedback
- **Performance**: Optimistic UI updates for instant feedback
- **Navigation**: Added Attendance link to main menu (desktop and mobile)

### Technical Improvements

- New database tables: `session_types`, `attendance_sessions`, `attendance_records`, `achievements`
- New models: SessionType, AttendanceSession, AttendanceRecord, Achievement
- New controllers: AttendanceController, AchievementsController
- Session type seeder with color definitions
- Database migrations for attendance and achievements systems
- React components with Inertia.js integration
- Real-time UI updates without page reloads

## [0.5.18] - 2025-01-05

### Added
- Complete attendance tracking system with session types
- Excel-like grid view for marking attendance
- Session types (Training, Match, Event, Tournament) with color coding
- Year and month selection filters for attendance view
- Session type filter to view specific session types
- Quick checkbox toggle for marking attendance
- Automatic counting of attendances per member and per session
- Add/delete session functionality for admin and superuser
- Attendance navigation link in main menu (desktop and mobile)

### Features
- **Attendance Grid**: Spreadsheet-style interface matching existing workflow
- **Session Types**: Color-coded sessions (Training-Blue, Match-Green, Event-Orange, Tournament-Purple)
- **Role-Based Access**: Admin/Superuser can edit, all users can view
- **Filtering**: Filter by year, month, and session type
- **Statistics**: Total attendance per member and per session displayed in grid
- **Responsive Design**: Works on desktop and mobile devices

### Technical
- New database tables: session_types, attendance_sessions, attendance_records
- AttendanceController with grid data, session creation, and attendance marking endpoints
- SessionType, AttendanceSession, AttendanceRecord models with relationships
- SessionTypeSeeder for default session types
- React Attendance/Index component with filtering and editing capabilities

## [0.5.17] - 2025-01-05

### Fixed
- Fixed bug where member image was deleted when updating is_active status

## [0.5.16] - 2025-01-05

### Added
- Added automatic redirect to login page with message when session expires (419 error)

## [0.5.15] - 2025-01-05

### Changed
- Increased session lifetime from 120 minutes (2 hours) to 1440 minutes (24 hours)

## [0.5.14] - 2025-01-05

### Changed
- Changed "All" filter value from empty string to "all" for better clarity

## [0.5.13] - 2025-01-05

### Fixed
- Fixed filter dropdown to correctly display "All" when empty filter is selected

## [0.5.12] - 2025-01-05

### Fixed
- Fixed Members page filter to always send filter parameter (including empty for "All")

## [0.5.11] - 2025-01-05

### Fixed
- Fixed filter not allowing "All" selection - now properly accepts empty filter value

## [0.5.10] - 2025-01-05

### Added
- Added member filter (All/Active) to Payments page with default to 'Active'

### Changed
- Set default filter to 'Active' on Members page
- Filter now persists when changing years in Payments page

### Fixed
- Removed max:50 limit on membership_number validation in member update

## [0.5.9] - 2025-01-05

### Changed
- Increased logo size on login screen (h-20 to h-40)

### Fixed
- Fixed 419 CSRF token error on logout
- Added CSRF token meta tag to app layout
- Excluded logout route from CSRF verification

## [0.5.8] - 2025-01-05

### Changed
- Replaced ClubMotion text title with logo image on login screen

## [0.5.7] - 2025-01-05

### Changed
- Removed "Expected" column from My Payments view for regular users
- Simplified table to show: Month, Amount, Status, Date, Method

## [0.5.6] - 2025-01-05

### Changed
- Moved date formatting to backend using Laravel Carbon (date:Y-m-d cast)
- Removed frontend date parsing logic - cleaner and more maintainable

## [0.5.5] - 2025-01-05

### Fixed
- Fixed ISO date parsing to correctly extract date from timestamp (split by 'T' instead of space)

## [0.5.4] - 2025-01-05

### Fixed
- Payment dates now display only date without time (YYYY-MM-DD format)
- Applied to My Payments, Member History, and Member Details pages

## [0.5.3] - 2025-01-05

### Fixed
- Fixed My Payments dashboard card link for regular users (was /payments, now /my-payments)

## [0.5.2] - 2025-01-05

### Fixed
- Fixed regular user redirect to /my-payments page
- Fixed year dropdown in My Payments to show only user's payment years
- Improved route handling to use plain paths instead of route() helper

## [0.5.1] - 2025-01-05

### Added
- Complete payment management system with Excel-like grid interface
- Payment tracking by year and month for all members
- Multi-year CSV import with auto-detection of year/month from column headers
- Support for exempt members (pocasni, saradnik) with exemption tracking
- Payment initialization wizard for new years
- CSV export template generation
- Role-based payment access (admin/superuser manage all, users view own)
- Payment statistics dashboard (total collected, paid, pending, overdue, exempt)
- Click-to-edit modal for individual payment records
- Member payment history view
- Recent payments section on member detail page

### Changed
- Updated members table to include exemption_status field
- Removed Ziggy route() helper dependency, using plain URL paths
- Enhanced member matching in CSV import (membership_number first, then email)
- Improved migration system with browser-accessible /migrate route for shared hosting

### Fixed
- Resolved route() helper JavaScript errors by using plain paths
- Fixed eager loading issues with payment relationships
- Corrected database column mapping in payment queries
- Added Serbian month name support in CSV import (MAJ→MAY, OKT→OCT)

### Technical
- New MembershipPayment model with relationships and helper methods
- PaymentController with full CRUD and bulk operations
- Multi-year import parser supporting various date formats
- Migration system compatible with shared hosting (no SSH)

## [0.5.0] - 2025-01-04

### Added
- Complete migration from Laravel Blade to React with Inertia.js
- Mobile-friendly responsive UI with hamburger menu
- Role-based access control (Admin, Superuser, User)
- Authentication system with login, password reset, and logout
- First-time user registration with automatic account creation
- Member management CRUD operations
- Dashboard with active members statistics
- User profile view for regular members
- Payment section access for all users

### Features
- **Authentication**
  - Login with email and password
  - Forgot password functionality
  - Auto-create user accounts for members on first login
  - Session-based authentication with Laravel Sanctum

- **Role-Based Access**
  - Admin: Full system access
  - Superuser: Club management access
  - User: Personal profile and payment access only

- **Member Management**
  - View all members (Admin/Superuser)
  - Create new members (Admin/Superuser)
  - Edit member details (Admin/Superuser)
  - Delete members (Admin/Superuser)
  - View own profile (All users)

- **User Interface**
  - Responsive design for mobile and desktop
  - Hamburger menu for mobile navigation
  - Role-specific menu items and dashboard cards
  - Clean profile view without admin controls for regular users

- **Dashboard**
  - Active members count visible to all users
  - Role-specific cards (Members/Payments for admin, My Profile/My Payments for users)

### Technical
- React 18 with Inertia.js for SPA experience
- Tailwind CSS v3 for styling
- Vite for asset building
- Laravel 9.x backend
- Git-based deployment workflow
