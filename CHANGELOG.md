# Changelog

All notable changes to ClubMotion will be documented in this file.

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
